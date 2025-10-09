const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PROFILE_PICS_DIR = path.join(UPLOADS_DIR, 'profile');
const ASSIGNMENTS_DIR = path.join(UPLOADS_DIR, 'assignments');
const PLACEMENTS_DIR = path.join(UPLOADS_DIR, 'placements');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- INITIALIZE SERVER ---
const initializeServer = () => {
    try {
        if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'));
        [UPLOADS_DIR, PROFILE_PICS_DIR, ASSIGNMENTS_DIR, PLACEMENTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
        if (!fs.existsSync(DB_PATH)) {
            console.log("db.json not found, creating a new default database.");
            const defaultDB = { users: {}, pendingUsers: {}, passwordResets: {}, idCardRequests: [], signupRequests: [], announcements: [], assignments: [], leaveRequests: [], placements: [] };
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
    destination: (req, file, cb) => {
        let destDir = UPLOADS_DIR;
        if (file.fieldname === 'photoFile') destDir = PROFILE_PICS_DIR;
        if (file.fieldname === 'assignmentFile') destDir = ASSIGNMENTS_DIR;
        if (file.fieldname === 'resume') destDir = PLACEMENTS_DIR;
        cb(null, destDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});
const upload = multer({ storage: storage });


// --- API ROUTES ---

// AUTHENTICATION & PROFILE ROUTES
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
// ... other auth and profile routes are unchanged but belong here ...
app.post('/signup', async (req, res) => { /* Unchanged */ });
app.get('/verify-email', (req, res) => { /* Unchanged */ });
app.get('/profile/:userId', (req, res) => { /* Unchanged */ });
app.post('/profile/update', upload.single('photoFile'), (req, res) => { /* Unchanged */ });


// USER MANAGEMENT ROUTES
app.get('/users', (req, res) => { /* Unchanged */ });
app.delete('/users/:userId', (req, res) => { /* Unchanged */ });

// ASSIGNMENT & LEAVE ROUTES
app.get('/assignments', (req, res) => { /* Unchanged */ });
app.post('/assignments', upload.single('assignmentFile'), (req, res) => { /* Unchanged */ });
app.get('/leave-requests', (req, res) => { /* Unchanged */ });
app.post('/leave-requests', (req, res) => { /* Unchanged */ });
app.post('/resolve-leave-request', (req, res) => { /* Unchanged */ });

// SIGNUP & ANNOUNCEMENT ROUTES
app.get('/signup-requests', (req, res) => { /* Unchanged */ });
app.post('/resolve-signup', (req, res) => { /* Unchanged */ });
app.get('/announcements', (req, res) => { /* Unchanged */ });
app.post('/announcements', (req, res) => { /* Unchanged */ });

// OTHER DATA ENDPOINTS
app.get('/analytics/:userId', (req, res) => { /* Unchanged */ });
app.get('/attendance/:userId', (req, res) => { /* Unchanged */ });
app.get('/fees/:userId', (req, res) => { /* Unchanged */ });
app.get('/timetable/student/:userId', (req, res) => { /* Unchanged */ });
app.post('/id-card-request', (req, res) => { /* Unchanged */ });
app.get('/id-card-requests', (req, res) => { /* Unchanged */ });


// PLACEMENT ROUTES
app.get('/placements', (req, res) => {
    const db = readDB();
    const { department, course } = req.query;
    let placements = db.placements || [];
    if (department) {
        placements = placements.filter(p => p.department === department);
    }
    if (course) {
        placements = placements.filter(p => p.course === course);
    }
    res.json({ success: true, placements: placements.sort((a,b) => b.postedOn - a.postedOn) });
});

app.post('/placements', (req, res) => {
    const { companyName, jobTitle, jobDescription, department, course } = req.body;
    if(!companyName || !jobTitle || !department || !course) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }
    const db = readDB();
    const newPlacement = {
        id: Date.now(), companyName, jobTitle, jobDescription, department, course,
        postedOn: Date.now(), applications: []
    };
    db.placements.push(newPlacement);
    writeDB(db);
    res.status(201).json({ success: true, message: "Placement posted successfully." });
});

app.post('/placements/:id/apply', upload.single('resume'), (req, res) => {
    const placementId = parseInt(req.params.id, 10);
    const studentId = req.headers['x-user-id'];
    if (!req.file) return res.status(400).json({ success: false, message: "Resume file is required." });
    const db = readDB();
    const student = db.users[studentId];
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    const placementIndex = db.placements.findIndex(p => p.id === placementId);
    if (placementIndex === -1) return res.status(404).json({ success: false, message: "Placement not found." });
    if (db.placements[placementIndex].applications.some(app => app.studentId === studentId)) {
        return res.status(409).json({ success: false, message: "You have already applied for this position." });
    }
    const newApplication = {
        studentId: studentId, studentName: student.name, studentDepartment: student.department,
        studentCourse: student.course, appliedOn: Date.now(), resumePath: `/uploads/placements/${req.file.filename}`
    };
    db.placements[placementIndex].applications.push(newApplication);
    writeDB(db);
    res.status(201).json({ success: true, message: "Application submitted successfully." });
});

app.get('/placements/:id/applications', (req, res) => {
    const placementId = parseInt(req.params.id, 10);
    const db = readDB();
    const placement = db.placements.find(p => p.id === placementId);
    if (placement) {
        res.json({ success: true, applications: placement.applications, placement });
    } else {
        res.status(404).json({ success: false, message: "Placement not found." });
    }
});


// --- STATIC FILE SERVING & FALLBACK (MUST BE LAST) ---
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname))); // Serves index.html from root

// Fallback for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});

