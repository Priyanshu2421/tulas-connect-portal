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
app.use(express.static(path.join(__dirname, 'public')));


// --- INITIALIZE SERVER ---
const initializeServer = () => {
    try {
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


// --- ROUTES ---

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

// All other routes remain the same...

// Fallback route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});
