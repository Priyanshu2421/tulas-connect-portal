const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- PATHS ---
// MODIFIED: Simplified path to look for db.json in the same folder
const DB_PATH = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files (uploaded images, resumes)
app.use('/uploads', express.static(UPLOADS_DIR));
// Serve the frontend (index.html)
app.use(express.static(__dirname));

// --- INITIALIZATION (Run on server start) ---
function initialize() {
    // 1. Create necessary directories
    [PUBLIC_DIR, UPLOADS_DIR, path.join(UPLOADS_DIR, 'profiles'), path.join(UPLOADS_DIR, 'resumes')].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // 2. Check if db.json exists
    if (!fs.existsSync(DB_PATH)) {
        console.error("FATAL ERROR: db.json not found! Please create it.");
        // We stop creating a default one because we have the real db.json
    } else {
        console.log("db.json found.");
    }
}
initialize();

// --- DATABASE HELPERS ---
const readDB = () => {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
    catch (e) {
        console.error("Error reading db.json:", e);
        return { users: {}, placements: [], attendance: {}, marks: {}, timetables: {}, assignments: {}, leaveRequests: [] }; // Fallback
    }
};
const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error writing to db.json:", e);
    }
};

// --- MULTER CONFIG (File Uploads) ---
// (Your existing multer config was good)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = UPLOADS_DIR;
        if (file.fieldname === 'photoFile') uploadPath = path.join(UPLOADS_DIR, 'profiles');
        else if (file.fieldname === 'assignmentFile') uploadPath = path.join(UPLOADS_DIR, 'assignments');
        else if (file.fieldname === 'submissionFile') uploadPath = path.join(UPLOADS_DIR, 'submissions');
        
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// =========================================
// API ROUTES
// =========================================

// 1. LOGIN (Your existing code)
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    console.log(`Login attempt: ${userId} as ${role} (${department || 'N/A'})`);
    
    const db = readDB();
    const user = db.users[userId];

    if (!user) return res.status(404).json({ success: false, message: "User ID not found." });
    if (user.pass !== password) return res.status(401).json({ success: false, message: "Incorrect password." });
    
    // Role Validation
    if (user.role !== role) {
        // Allow HOD to login with 'Department Login' role
        if (role === 'HOD' && user.role === 'HOD') {
             // HOD role matches, now check department
        } else {
            return res.status(403).json({ success: false, message: `Role mismatch. This ID belongs to a ${user.role}.` });
        }
    }

    // HOD Department Validation
    if (role === 'HOD' && user.department !== department) {
         return res.status(403).json({ success: false, message: `Access denied. You are HOD of ${user.department}.` });
    }

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// 2. SIGNUP (Your existing code)
app.post('/signup', (req, res) => {
    const { userId, pass, name, role, department, email, course } = req.body;
    const db = readDB();
    
    if (db.users[userId]) {
        return res.status(409).json({ success: false, message: "User ID already exists." });
    }

    db.users[userId] = {
        id: userId, pass, name, role, department, email,
        course: course || "", // Add course
        phone: "", photoUrl: ""
    };
    writeDB(db);
    res.json({ success: true, message: "Account created! You can login now." });
});


// 3. PROFILE
app.get('/profile/:userId', (req, res) => {
    const db = readDB();
    const user = db.users[req.params.userId];
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const { pass, ...safeUser } = user;
    res.json({ success: true, profile: safeUser });
});

// 4. PLACEMENTS (GET & POST) (Your existing code)
app.get('/placements', (req, res) => {
    const db = readDB();
    let results = db.placements || [];
    if (req.query.department) {
        results = results.filter(p => p.department === req.query.department);
    }
    results.sort((a, b) => (b.postedOn || 0) - (a.postedOn || 0));
    res.json({ success: true, placements: results });
});

app.post('/placements', (req, res) => {
    const db = readDB();
    const newPlacement = {
        id: Date.now(),
        ...req.body,
        postedOn: Date.now(),
        applications: []
    };
    db.placements = db.placements || [];
    db.placements.push(newPlacement);
    writeDB(db);
    res.json({ success: true, message: "Placement posted" });
});


// --- ALL NEW/FIXED API ENDPOINTS ---

// 5. TIMETABLE
app.get('/timetable', (req, res) => {
    const { course } = req.query;
    const db = readDB();
    const timetable = db.timetables ? db.timetables[course] : {};
    res.json({ success: true, timetable: timetable || {} });
});

// 6. ATTENDANCE
app.get('/attendance/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    const attendance = db.attendance ? db.attendance[userId] : {};
    res.json({ success: true, attendance: attendance || {} });
});

app.post('/attendance/mark', (req, res) => {
    const { studentId, subject, status } = req.body;
    const db = readDB();
    if (!db.attendance[studentId]) db.attendance[studentId] = {};
    if (!db.attendance[studentId][subject]) db.attendance[studentId][subject] = { present: 0, total: 0 };
    
    db.attendance[studentId][subject].total += 1;
    if (status === 'Present') {
        db.attendance[studentId][subject].present += 1;
    }
    writeDB(db);
    res.json({ success: true, message: "Attendance marked" });
});

// 7. MARKS
app.get('/marks/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    const marks = db.marks ? db.marks[userId] : [];
    res.json({ success: true, marks: marks || [] });
});

// 8. ASSIGNMENTS
app.get('/assignments', (req, res) => {
    const { course, facultyId } = req.query;
    const db = readDB();
    let allAssignments = Object.values(db.assignments || {}).flat();
    
    if (course) {
        allAssignments = allAssignments.filter(a => a.course === course);
    }
    if (facultyId) {
        allAssignments = allAssignments.filter(a => a.facultyId === facultyId);
    }
    res.json({ success: true, assignments: allAssignments });
});

// POST Assignment (Faculty)
app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const { title, description, course, dueDate, facultyId, facultyName, department } = req.body;
    const db = readDB();
    
    const newAssignment = {
        id: Date.now(),
        title, description, course, dueDate, facultyId, facultyName, department,
        filePath: req.file ? `/uploads/assignments/${req.file.filename}` : null,
        submissions: []
    };

    if (!db.assignments[department]) {
        db.assignments[department] = [];
    }
    db.assignments[department].push(newAssignment);
    writeDB(db);
    res.json({ success: true, message: "Assignment created" });
});

// SUBMIT Assignment (Student)
app.post('/assignments/:id/submit', upload.single('submissionFile'), (req, res) => {
    const { id } = req.params;
    const { studentId, studentName } = req.body;
    const db = readDB();

    let found = false;
    for (const dept in db.assignments) {
        const assignment = db.assignments[dept].find(a => a.id == id);
        if (assignment) {
            assignment.submissions.push({
                studentId, studentName,
                filePath: req.file ? `/uploads/submissions/${req.file.filename}` : null,
                submittedOn: new Date()
            });
            found = true;
            break;
        }
    }
    
    if (found) {
        writeDB(db);
        res.json({ success: true, message: "Assignment submitted" });
    } else {
        res.status(404).json({ success: false, message: "Assignment not found" });
    }
});


// 9. LEAVES
app.get('/leaves/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    const userLeaves = (db.leaveRequests || []).filter(l => l.userId === userId);
    res.json({ success: true, leaves: userLeaves });
});

app.get('/leaves/pending/:department', (req, res) => {
    const { department } = req.params;
    const db = readDB();
    const pending = (db.leaveRequests || []).filter(l => l.department === department && l.status === 'Pending');
    res.json({ success: true, leaves: pending });
});

app.post('/leaves', (req, res) => {
    const { userId, department, type, fromDate, toDate, reason } = req.body;
    const db = readDB();
    
    const newLeave = {
        id: Date.now(),
        userId, department, type, fromDate, toDate, reason,
        status: 'Pending', // HODs will approve
        appliedOn: new Date()
    };

    db.leaveRequests = db.leaveRequests || [];
    db.leaveRequests.push(newLeave);
    writeDB(db);
    res.json({ success: true, message: "Leave submitted" });
});

app.post('/leaves/:id/action', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Approved' or 'Rejected'
    const db = readDB();
    
    const leave = (db.leaveRequests || []).find(l => l.id == id);
    if (leave) {
        leave.status = status;
        writeDB(db);
        res.json({ success: true, message: `Leave ${status}` });
    } else {
        res.status(404).json({ success: false, message: "Leave request not found" });
    }
});

// --- FALLBACK ROUTE ---
app.get('*', (req, res) => {
    // This serves your index.html for any route not matched above
    res.sendFile(path.join(__dirname, 'index.html'));
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Tula's Connect Server running on http://localhost:${PORT}`);
});