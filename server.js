const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SUBMISSIONS_DIR = path.join(UPLOADS_DIR, 'submissions');
const ASSIGNMENTS_DIR = path.join(UPLOADS_DIR, 'assignments');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- SERVE STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- INITIALIZE DATABASE AND FOLDERS ---
// This ensures the necessary files and folders exist before the server starts
const initializeServer = () => {
    try {
        // Ensure uploads directories exist
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
        if (!fs.existsSync(ASSIGNMENTS_DIR)) fs.mkdirSync(ASSIGNMENTS_DIR, { recursive: true });

        // Ensure db.json exists
        if (!fs.existsSync(DB_PATH)) {
            console.log("db.json not found, creating a new default database.");
            const defaultDB = {
                users: {}, idCardRequests: [], signupRequests: [], passwordRequests: [],
                announcements: [], attendanceRecords: [], assignments: [], submissions: [],
                marks: {}, historicalPerformance: [], fees: {}, studentTimetables: {},
                facultyTimetables: {}, curriculum: {}, departmentPrograms: {}
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
        }
    } catch (error) {
        console.error("Error during server initialization:", error);
        // If initialization fails, we should exit to prevent a crash loop
        process.exit(1);
    }
};

initializeServer(); // Run the initialization on startup


// --- DATABASE HELPER FUNCTIONS ---
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- MULTER SETUP ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let destDir = UPLOADS_DIR;
        if (file.fieldname === 'submissionFile') destDir = SUBMISSIONS_DIR;
        else if (file.fieldname === 'assignmentFile') destDir = ASSIGNMENTS_DIR;
        else if (file.fieldname === 'idCardPhoto') destDir = UPLOADS_DIR;
        cb(null, destDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 12 * 1024 * 1024 }
});


// --- ALL API ROUTES GO HERE ---
// ... (Your existing API routes for /login, /profile, etc. are all correct and go here) ...
// Login
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];

    if (!user) return res.status(404).json({ success: false, message: `User ID '${userId}' not found.` });
    if (user.pass !== password) return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (user.role !== role) return res.status(401).json({ success: false, message: `Role mismatch. You selected '${role}' but this user is a '${user.role}'.` });
    if (role === 'HOD' && user.department !== department) return res.status(401).json({ success: false, message: `Access Denied. You are not the HOD for the '${department}'.` });

    const { pass, ...userResponse } = user;
    res.json({ success: true, user: { ...userResponse, id: userId } });
});

// --- USER & PROFILE MANAGEMENT ---
app.get('/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const user = readDB().users[userId];
    if (user) {
        const { pass, ...userProfile } = user;
        res.json({ success: true, profile: { ...userProfile, id: userId } });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

app.post('/profile/update', upload.single('photoFile'), (req, res) => {
    const { userId } = req.body;
    const db = readDB();
    if (db.users[userId]) {
        Object.keys(req.body).forEach(key => {
            if (key !== 'userId' && db.users[userId].hasOwnProperty(key)) {
                db.users[userId][key] = req.body[key];
            }
        });
        if (req.file) {
            db.users[userId].photoUrl = `/uploads/${req.file.filename}`;
        }
        writeDB(db);
        const { pass, ...updatedUser } = db.users[userId];
        res.json({ success: true, updatedUser: { ...updatedUser, id: userId } });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

app.get('/users', (req, res) => {
    const db = readDB();
    let usersArray = Object.keys(db.users).map(id => {
        const { pass, ...user } = db.users[id];
        return { ...user, id };
    });
    if (req.query.role) {
        usersArray = usersArray.filter(user => user.role === req.query.role);
    }
    if (req.query.department) {
        usersArray = usersArray.filter(user => user.department === req.query.department);
    }
    res.json({ success: true, users: usersArray });
});

app.post('/users', (req, res) => {
    const db = readDB();
    const { userId, ...newUser } = req.body;
    if (!userId || !newUser.name || !newUser.pass || !newUser.role) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    if (db.users[userId]) {
        return res.status(409).json({ success: false, message: 'User ID already exists.' });
    }
    db.users[userId] = { ...newUser, photoUrl: '' }; // Ensure photoUrl is present
    writeDB(db);
    const { pass, ...userResponse } = newUser;
    res.status(201).json({ success: true, user: { ...userResponse, id: userId } });
});

app.delete('/users/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    if (db.users[userId]) {
        delete db.users[userId];
        writeDB(db);
        res.json({ success: true, message: 'User deleted.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});


// --- SIGNUP REQUESTS ---
app.post('/signup', (req, res) => {
    const db = readDB();
    const { userId } = req.body;
    if (db.users[userId] || db.signupRequests.some(r => r.userId === userId)) {
        return res.status(409).json({ success: false, message: 'User ID already exists or has a pending request.' });
    }
    db.signupRequests.push(req.body);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Request submitted for approval.' });
});

app.get('/signup-requests', (req, res) => res.json(readDB().signupRequests));

app.post('/resolve-signup', (req, res) => {
    const { userId, action } = req.body;
    const db = readDB();
    const requestIndex = db.signupRequests.findIndex(r => r.userId === userId);
    if (requestIndex === -1) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (action === 'approve') {
        const request = db.signupRequests[requestIndex];
        db.users[request.userId] = {
            pass: request.pass, name: request.name, role: request.role, email: request.email,
            phone: "", bloodGroup: "", department: request.department || "", address: "", dob: "", photoUrl: ""
        };
    }
    db.signupRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request ${action}d.` });
});


// --- PASSWORD REQUESTS ---
app.post('/forgot-password', (req, res) => {
    const { userId, newPass } = req.body;
    const db = readDB();
    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: 'User ID not found.' });
    if (db.passwordRequests.some(r => r.userId === userId)) {
        return res.status(409).json({ success: false, message: 'A password request for this user already exists.' });
    }
    db.passwordRequests.push({ userId, newPass, userName: user.name });
    writeDB(db);
    res.json({ success: true, message: 'Password reset request sent for approval.' });
});

app.get('/password-requests', (req, res) => res.json(readDB().passwordRequests));

app.post('/resolve-password-request', (req, res) => {
    const { userId, action } = req.body;
    const db = readDB();
    const requestIndex = db.passwordRequests.findIndex(r => r.userId === userId);
    if (requestIndex === -1) return res.status(404).json({ success: false, message: 'Request not found.' });

    const request = db.passwordRequests[requestIndex];
    if (action === 'approve' && db.users[userId]) {
        db.users[userId].pass = request.newPass;
    }
    db.passwordRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request for ${request.userName} has been ${action}d.` });
});


// --- ASSIGNMENTS & SUBMISSIONS ---
app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const db = readDB();
    const newAssignment = {
        id: `asg-${Date.now()}`,
        ...req.body,
        createdAt: new Date().toISOString(),
        filePath: req.file ? `/uploads/assignments/${req.file.filename}` : null
    };
    db.assignments.push(newAssignment);
    writeDB(db);
    res.status(201).json({ success: true, assignment: newAssignment });
});

app.get('/assignments', (req, res) => res.json(readDB().assignments));

app.post('/submissions', upload.single('submissionFile'), (req, res) => {
    const db = readDB();
    const { assignmentId, studentId } = req.body;
    if (!req.file) { return res.status(400).json({ success: false, message: 'No file submitted.' }); }
    const newSubmission = {
        id: `sub-${Date.now()}`,
        assignmentId,
        studentId,
        submittedAt: new Date().toISOString(),
        filePath: `/uploads/submissions/${req.file.filename}`,
        status: 'Pending',
        reason: null
    };
    db.submissions = db.submissions.filter(s => !(s.assignmentId === assignmentId && s.studentId === studentId));
    db.submissions.push(newSubmission);
    writeDB(db);
    res.status(201).json({ success: true, submission: newSubmission });
});

app.get('/submissions/student/:studentId', (req, res) => res.json(readDB().submissions.filter(s => s.studentId === req.params.studentId)));

app.get('/submissions', (req, res) => {
    const db = readDB();
    const submissionsWithNames = db.submissions.map(sub => {
        const student = db.users[sub.studentId];
        return { ...sub, studentName: student ? student.name : 'Unknown' };
    });
    res.json(submissionsWithNames);
});

app.post('/submissions/resolve', (req, res) => {
    const { submissionId, status, reason } = req.body;
    const db = readDB();
    const submission = db.submissions.find(s => s.id === submissionId);
    if (submission) {
        submission.status = status;
        submission.reason = reason || null;
        writeDB(db);
        res.json({ success: true, message: 'Submission status updated.' });
    } else {
        res.status(404).json({ success: false, message: 'Submission not found.' });
    }
});


// --- STUDENT-SPECIFIC INFO ---
app.get('/analytics/:studentId', (req, res) => {
    const { studentId } = req.params;
    const db = readDB();
    const marksData = db.marks[studentId] || [];
    const attendanceData = db.attendanceRecords.filter(rec => rec.studentId === studentId);

    if (marksData.length === 0) {
        // Return defaults if no marks data
         return res.json({ success: true, analytics: { attendancePercentage: 0, overallPercentage: 0, cgpa: 0, subjectWiseMarks: [] }});
    }

    const totalRecords = attendanceData.length;
    const presentDays = attendanceData.filter(rec => rec.status === 'P').length;
    const attendancePercentage = totalRecords > 0 ? ((presentDays / totalRecords) * 100).toFixed(2) : 0;

    const { totalMarksObtained, totalMaxMarks, totalGradePoints } = marksData.reduce((acc, subject) => {
        acc.totalMarksObtained += subject.marksObtained;
        acc.totalMaxMarks += subject.maxMarks;
        acc.totalGradePoints += subject.gradePoint;
        return acc;
    }, { totalMarksObtained: 0, totalMaxMarks: 0, totalGradePoints: 0 });

    const overallPercentage = totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2) : 0;
    const cgpa = marksData.length > 0 ? (totalGradePoints / marksData.length).toFixed(2) : 0;

    res.json({ success: true, analytics: { attendancePercentage, overallPercentage, cgpa, subjectWiseMarks: marksData } });
});

app.get('/fees/:userId', (req, res) => res.json(readDB().fees[req.params.userId] || { fees: {}, transport: {} }));

app.get('/attendance/student/:studentId', (req, res) => res.json(readDB().attendanceRecords.filter(a => a.studentId === req.params.studentId)));

// --- TIMETABLES ---
app.get('/timetable/student/:userId', (req, res) => {
    const db = readDB();
    const user = db.users[req.params.userId];
    if (user && user.batch && db.studentTimetables[user.batch]) {
        res.json(db.studentTimetables[user.batch]);
    } else {
        res.status(404).json({ success: false, message: 'Timetable not found.' });
    }
});

app.get('/timetable/faculty/:facultyId', (req, res) => {
    const db = readDB();
    if (db.facultyTimetables[req.params.facultyId]) {
        res.json(db.facultyTimetables[req.params.facultyId]);
    } else {
        res.status(404).json({ success: false, message: 'Timetable not found.' });
    }
});

app.get('/timetables', (req, res) => {
    const db = readDB();
    res.json({
        student: db.studentTimetables,
        faculty: db.facultyTimetables
    });
});

app.post('/timetables/student/:batch', (req, res) => {
    const { batch } = req.params;
    const { schedule } = req.body;
    const db = readDB();
    if (db.studentTimetables[batch]) {
        db.studentTimetables[batch].schedule = schedule;
        writeDB(db);
        res.json({ success: true, message: `Timetable for batch ${batch} updated.` });
    } else {
        res.status(404).json({ success: false, message: 'Batch not found.' });
    }
});

app.post('/timetables/faculty/:facultyId', (req, res) => {
    const { facultyId } = req.params;
    const { schedule } = req.body;
    const db = readDB();
    if (db.facultyTimetables[facultyId]) {
        db.facultyTimetables[facultyId].schedule = schedule;
        writeDB(db);
        res.json({ success: true, message: `Timetable for faculty ${facultyId} updated.` });
    } else {
        res.status(404).json({ success: false, message: 'Faculty ID not found.' });
    }
});

// --- ATTENDANCE & MARKS (FACULTY) ---
app.post('/attendance', (req, res) => {
    const { records } = req.body;
    const db = readDB();
    records.forEach(record => {
        const existingIndex = db.attendanceRecords.findIndex(r => r.studentId === record.studentId && r.date === record.date && r.class === record.class);
        if (existingIndex > -1) {
            db.attendanceRecords[existingIndex] = record;
        } else {
            db.attendanceRecords.push(record);
        }
    });
    writeDB(db);
    res.json({ success: true, message: 'Attendance recorded.' });
});

app.post('/marks', (req, res) => {
    const { records } = req.body;
    const db = readDB();
    records.forEach(record => {
        if (!db.marks[record.studentId]) {
            db.marks[record.studentId] = [];
        }
        const existingIndex = db.marks[record.studentId].findIndex(m => m.subjectCode === record.subjectCode);
        if (existingIndex > -1) {
            db.marks[record.studentId][existingIndex] = { ...db.marks[record.studentId][existingIndex], ...record };
        } else {
            db.marks[record.studentId].push(record);
        }
    });
    writeDB(db);
    res.json({ success: true, message: 'Marks updated successfully.' });
});

// --- ID CARD REQUESTS ---
// --- MODIFICATION: Updated endpoint to accept all new fields ---
app.post('/id-card-request', upload.single('idCardPhoto'), (req, res) => {
    // Handle Multer file size error
    if (req.fileValidationError) {
        return res.status(400).json({ success: false, message: req.fileValidationError });
    }
    const { userId, name, phone, program, department, dob, bloodGroup } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "Photo is required." });

    const db = readDB();
    const newRequest = {
        userId,
        userName: name,
        phone,
        program,
        department,
        dob,
        bloodGroup,
        photoUrl: `/uploads/${req.file.filename}`,
        status: 'Pending'
    };

    const existingIndex = db.idCardRequests.findIndex(r => r.userId === userId);
    if (existingIndex > -1) {
        // If a previous request was denied, allow a new one by replacing it.
        if (db.idCardRequests[existingIndex].status === 'Denied') {
            db.idCardRequests[existingIndex] = newRequest;
        } else {
            // Don't allow a new request if one is already pending or approved.
            return res.status(409).json({ success: false, message: 'An ID card request for this user already exists.' });
        }
    } else {
        db.idCardRequests.push(newRequest);
    }

    writeDB(db);
    res.json({ success: true, message: 'ID card request submitted.' });
});

app.get('/id-card-status/:userId', (req, res) => {
    const { userId } = req.params;
    const request = readDB().idCardRequests.find(r => r.userId === userId);
    res.json(request || { status: 'Not Applied' });
});

app.get('/id-card-requests', (req, res) => res.json(readDB().idCardRequests));

app.post('/resolve-id-card-request', (req, res) => {
    const { userId, action, reason } = req.body;
    const db = readDB();
    const request = db.idCardRequests.find(r => r.userId === userId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (action === 'approve') {
        request.status = 'Approved';
        if (db.users[userId]) {
            db.users[userId].photoUrl = request.photoUrl; // Update user's main photo
        }
    } else {
        request.status = 'Denied';
        request.reason = reason || 'No reason specified.';
    }
    writeDB(db);
    res.json({ success: true, message: `Request has been ${action}d.` });
});

// --- ADMIN & HOD ---

// --- ANNOUNCEMENT FEATURE ---
app.get('/announcements', (req, res) => res.json(readDB().announcements)); // For Admin to get ALL

// Get personalized announcement feed
app.get('/announcements/feed', (req, res) => {
    const { role, department } = req.query; // <<< FIX WAS HERE
    const db = readDB();

    const feed = db.announcements.filter(ann => {
        if (ann.scope === 'all') return true;
        if (ann.scope === 'department_all' && ann.department === department) return true;
        if (ann.scope === 'department_students' && ann.department === department && role === 'Student') return true;
        if (ann.scope === 'students' && role === 'Student') return true;
        return false;
    });

    res.json({ success: true, announcements: feed });
});


// Post a new announcement
app.post('/announcements', (req, res) => {
    const { text, authorName, authorRole, scope, department } = req.body;
    if (!text || !authorName || !authorRole || !scope) {
        return res.status(400).json({ success: false, message: "Missing required announcement fields." });
    }
    const db = readDB();
    const newAnnouncement = {
        id: `ann-${Date.now()}`,
        text,
        date: new Date().toISOString(),
        authorName,
        authorRole,
        scope,
        department: department || null
    };
    db.announcements.unshift(newAnnouncement);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Announcement posted.', announcement: newAnnouncement });
});

// Delete an announcement
app.delete('/announcements/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const initialLength = db.announcements.length;
    db.announcements = db.announcements.filter(ann => ann.id !== id);

    if (db.announcements.length < initialLength) {
        writeDB(db);
        res.json({ success: true, message: 'Announcement deleted.' });
    } else {
        res.status(404).json({ success: false, message: 'Announcement not found.' });
    }
});


app.get('/curriculum', (req, res) => res.json(readDB().curriculum || {}));

app.get('/hod/dashboard/:department', (req, res) => {
    const { department } = req.params;
    const db = readDB();
    const students = Object.values(db.users).filter(u => u.department === department && u.role === 'Student');
    const studentIds = Object.keys(db.users).filter(id => db.users[id].department === department && db.users[id].role === 'Student');

    const totalStudents = students.length;
    const totalFaculty = Object.values(db.users).filter(u => u.department === department && u.role === 'Faculty').length;

    let totalAttendance = 0;
    let attendanceRecordsCount = 0;
    let totalCgpa = 0;
    let studentsWithMarks = 0;

    studentIds.forEach(id => {
        const studentAttendance = db.attendanceRecords.filter(rec => rec.studentId === id);
        if (studentAttendance.length > 0) {
            const present = studentAttendance.filter(r => r.status === 'P').length;
            totalAttendance += (present / studentAttendance.length);
            attendanceRecordsCount++;
        }
        const studentMarks = db.marks[id];
        if (studentMarks && studentMarks.length > 0) {
            const totalGradePoints = studentMarks.reduce((sum, s) => sum + s.gradePoint, 0);
            totalCgpa += (totalGradePoints / studentMarks.length);
            studentsWithMarks++;
        }
    });

    const avgAttendance = attendanceRecordsCount > 0 ? ((totalAttendance / attendanceRecordsCount) * 100).toFixed(2) : 0;
    const avgCgpa = studentsWithMarks > 0 ? (totalCgpa / studentsWithMarks).toFixed(2) : 0;
    const programs = db.departmentPrograms[department] || [];

    res.json({ success: true, data: { totalStudents, totalFaculty, avgAttendance, avgCgpa, programs } });
});


// --- MISC ---
app.get('/historical-data', (req, res) => res.json({ success: true, historicalData: readDB().historicalPerformance }));


// --- CATCH-ALL ROUTE FOR SERVING THE FRONTEND ---
// This must be the last route in the file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- SERVER START ---
const LIVE_PORT = process.env.PORT || PORT;
app.listen(LIVE_PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${LIVE_PORT}`);
});
```

### Step 3: Push Your Final Changes to GitHub

Now that the file is corrected, you need to save and upload this final version to GitHub.

1.  Open the terminal in VS Code.
2.  Run these three commands:

    ```bash
    git add .
    

