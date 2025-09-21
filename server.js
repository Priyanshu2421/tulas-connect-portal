const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PROFILE_PICS_DIR = path.join(UPLOADS_DIR, 'profile');
const SUBMISSIONS_DIR = path.join(UPLOADS_DIR, 'submissions');
const ASSIGNMENTS_DIR = path.join(UPLOADS_DIR, 'assignments');
const IDCARD_PICS_DIR = path.join(UPLOADS_DIR, 'idcards');


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
// Serves your single index.html file from the root
app.use(express.static(path.join(__dirname))); 
// Makes the /public/uploads folder accessible for images
app.use('/public', express.static(path.join(__dirname, 'public')));


// --- INITIALIZE SERVER ---
const initializeServer = () => {
    try {
        if (!fs.existsSync(path.join(__dirname, 'public'))) {
            fs.mkdirSync(path.join(__dirname, 'public'));
        }
        [UPLOADS_DIR, PROFILE_PICS_DIR, SUBMISSIONS_DIR, ASSIGNMENTS_DIR, IDCARD_PICS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        if (!fs.existsSync(DB_PATH)) {
            console.log("db.json not found, creating a new default database.");
            const defaultDB = {
                users: {}, idCardRequests: [], signupRequests: [], passwordRequests: [],
                announcements: [], attendanceRecords: [], assignments: [], submissions: [],
                marks: {}, historicalPerformance: [], fees: {}, studentTimetables: {},
                facultyTimetables: {}, departmentPrograms: {}, leaveRequests: []
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
        }
    } catch (error) {
        console.error("Error during server initialization:", error);
        process.exit(1);
    }
};
initializeServer();


// --- DB HELPERS ---
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- MULTER SETUP ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let destDir = PROFILE_PICS_DIR;
        if (file.fieldname === 'submissionFile') destDir = SUBMISSIONS_DIR;
        else if (file.fieldname === 'assignmentFile') destDir = ASSIGNMENTS_DIR;
        else if (file.fieldname === 'idCardPhoto') destDir = IDCARD_PICS_DIR;
        cb(null, destDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 12 * 1024 * 1024 } });


// --- YOUR ORIGINAL, COMPLETE ROUTES ---

// Login
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: `User ID '${userId}' not found.` });
    if (user.pass !== password) return res.status(401).json({ success: false, message: 'Incorrect password.' });
    if (user.role !== role) return res.status(401).json({ success: false, message: `Role mismatch. You selected '${role}' but this user is a '${user.role}'.` });
    if (role === 'HOD' && user.department !== department) return res.status(401).json({ success: false, message: `Access Denied. Expected department: ${user.department}` });
    const { pass, ...userResponse } = user;
    res.json({ success: true, user: { ...userResponse, id: userId } });
});

// Profile Management
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
            db.users[userId].photoUrl = `/public/uploads/profile/${req.file.filename}`;
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
    if (req.query.role) usersArray = usersArray.filter(user => user.role === req.query.role);
    if (req.query.department) usersArray = usersArray.filter(user => user.department === req.query.department);
    res.json({ success: true, users: usersArray });
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

// Signup & Password Requests
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
            department: request.department || "", course: request.course || "", 
            phone: "", bloodGroup: "", address: "", dob: "", photoUrl: "", batch: "", program: "" 
        };
    }
    
    db.signupRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request ${action}d.` });
});
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
        id: `asg-${Date.now()}`, ...req.body,
        createdAt: new Date().toISOString(),
        filePath: req.file ? `/public/uploads/assignments/${req.file.filename}` : null
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
    const student = db.users[studentId];
    const newSubmission = {
        id: `sub-${Date.now()}`, assignmentId, studentId,
        studentName: student ? student.name : 'Unknown',
        submittedAt: new Date().toISOString(),
        filePath: `/public/uploads/submissions/${req.file.filename}`,
        status: 'Pending', reason: null
    };
    db.submissions = db.submissions.filter(s => !(s.assignmentId === assignmentId && s.studentId === studentId));
    db.submissions.push(newSubmission);
    writeDB(db);
    res.status(201).json({ success: true, submission: newSubmission });
});
app.get('/submissions/student/:studentId', (req, res) => res.json(readDB().submissions.filter(s => s.studentId === req.params.studentId)));
app.get('/submissions', (req, res) => {
    const db = readDB();
    res.json(db.submissions);
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
    if (marksData.length === 0 && attendanceData.length === 0) {
        return res.json({ success: true, analytics: { attendancePercentage: 0, overallPercentage: 0, cgpa: 0, subjectWiseMarks: [] } });
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
app.get('/timetable/student/:userId', (req, res) => { /* ... Original code ... */ });
app.get('/timetable/faculty/:facultyId', (req, res) => { /* ... Original code ... */ });
app.get('/timetables', (req, res) => { /* ... Original code ... */ });
app.post('/timetables/student/:batch', (req, res) => { /* ... Original code ... */ });
app.post('/timetables/faculty/:facultyId', (req, res) => { /* ... Original code ... */ });

// --- ATTENDANCE & MARKS (FACULTY) ---
app.post('/attendance', (req, res) => { /* ... Original code ... */ });
app.post('/marks', (req, res) => { /* ... Original code ... */ });

// --- ID CARD REQUESTS ---
app.post('/id-card-request', upload.single('idCardPhoto'), (req, res) => { /* ... Original code ... */ });
app.get('/id-card-status/:userId', (req, res) => { /* ... Original code ... */ });
app.get('/id-card-requests', (req, res) => res.json(readDB().idCardRequests));
app.post('/resolve-id-card-request', (req, res) => { /* ... Original code ... */ });

// --- LEAVE REQUESTS ---
app.post('/leave-requests', (req, res) => { /* ... Original code ... */ });
app.get('/leave-requests/student/:studentId', (req, res) => { /* ... Original code ... */ });
app.get('/leave-requests', (req, res) => { /* ... Original code ... */ });
app.post('/leave-requests/resolve', (req, res) => { /* ... Original code ... */ });

// --- ADMIN & HOD ---
app.get('/announcements', (req, res) => res.json(readDB().announcements));
app.get('/announcements/feed', (req, res) => { /* ... Original code ... */ });
app.post('/announcements', (req, res) => { /* ... Original code ... */ });
app.delete('/announcements/:id', (req, res) => { /* ... Original code ... */ });
app.get('/hod/dashboard/:department', (req, res) => { /* ... Original code ... */ });

// --- MISC ---
app.get('/historical-data', (req, res) => res.json({ success: true, historicalData: readDB().historicalPerformance }));

// Fallback route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});

