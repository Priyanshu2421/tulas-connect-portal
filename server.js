const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
// Nodemailer has been permanently removed for simple login/signup.

const app = express();
const PORT = process.env.PORT || 3000;

// --- PATHS ---
const DB_PATH = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// --- CONSTANTS ---
const REQUIRED_EMAIL_DOMAIN = '@tulas.edu.in'; // Enforced Institutional Domain

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// --- INITIALIZATION ---
function initialize() {
    [PUBLIC_DIR, UPLOADS_DIR, path.join(UPLOADS_DIR, 'profiles'), path.join(UPLOADS_DIR, 'assignments'), path.join(UPLOADS_DIR, 'submissions'), path.join(UPLOADS_DIR, 'id-cards')].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    if (!fs.existsSync(DB_PATH)) console.error("FATAL: db.json not found!");
    else console.log("db.json found.");
}
initialize();

// --- DATABASE HELPERS ---
const readDB = () => {
    try { 
        // Read existing data or provide a default structure
        let data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        
        // Ensure new properties are initialized
        if (!data.signupRequests) data.signupRequests = [];
        
        // Ensure initial Admin, HOD, and Student users exist for testing
        if (!data.users || Object.keys(data.users).length === 0) {
            data.users = {
                "admin.tulas.in": {
                    "id": "admin.tulas.in", "pass": "admin123", "name": "Institute Administrator", "role": "Admin", "department": "Administration", "email": "admin@tulas.edu.in", "phone": "1234567890", "bloodGroup": "O+", "address": "Tula's Institute, Dehradun", "dob": "1990-01-01", "photoUrl": ""
                },
                "hod.cse": {
                    "id": "hod.cse", "pass": "hod123", "name": "Prof. Head of CSE", "role": "HOD", "department": "Department of Engineering", "email": "hod.cse@tulas.edu.in", "course": "Computer Science & Engineering", "phone": "9998887770", "photoUrl": ""
                },
                "S2024001": {
                    "id": "S2024001", "pass": "student123", "name": "Rajesh Kumar", "role": "Student", "department": "Department of Engineering", "email": "rajesh.kumar@tulas.edu.in", "course": "B.Tech CSE", "phone": "8887776660", "photoUrl": ""
                }
            };
        }
        
        return data; 
    }
    catch (e) { 
        // Return full default structure with mock users if db.json is missing or corrupted
        return { 
            users: {
                "admin.tulas.in": { "id": "admin.tulas.in", "pass": "admin123", "name": "Institute Administrator", "role": "Admin", "department": "Administration", "email": "admin@tulas.edu.in", "phone": "1234567890", "bloodGroup": "O+", "address": "Tula's Institute, Dehradun", "dob": "1990-01-01", "photoUrl": "" },
                "hod.cse": { "id": "hod.cse", "pass": "hod123", "name": "Prof. Head of CSE", "role": "HOD", "department": "Department of Engineering", "email": "hod.cse@tulas.edu.in", "course": "Computer Science & Engineering", "phone": "9998887770", "photoUrl": "" },
                "S2024001": { "id": "S2024001", "pass": "student123", "name": "Rajesh Kumar", "role": "Student", "department": "Department of Engineering", "email": "rajesh.kumar@tulas.edu.in", "course": "B.Tech CSE", "phone": "8887776660", "photoUrl": "" }
            }, 
            placements: [], attendance: {}, marks: {}, timetables: {}, assignments: {}, leaveRequests: [], announcements: [], idCardRequests: [],
            signupRequests: [] 
        }; 
    }
};
const writeDB = (data) => { try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch (e) { console.error("DB Write Error:", e); } };

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = UPLOADS_DIR;
        if (file.fieldname === 'photoFile') uploadPath = path.join(UPLOADS_DIR, 'profiles');
        else if (file.fieldname === 'assignmentFile') uploadPath = path.join(UPLOADS_DIR, 'assignments');
        else if (file.fieldname === 'submissionFile') uploadPath = path.join(UPLOADS_DIR, 'submissions');
        else if (file.fieldname === 'idCardPhoto') uploadPath = path.join(UPLOADS_DIR, 'id-cards');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => { cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for ID card photos
});

// =========================================
// API ROUTES
// =========================================

// --- AUTH (Simple User/Pass) ---
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];
    
    // 1. Password Check
    if (!user || user.pass !== password) return res.status(401).json({ success: false, message: "Invalid User ID or Password." });

    // 2. Role Check
    if (user.role !== role) {
        if (!(role === 'HOD' && user.role === 'HOD')) return res.status(403).json({ success: false, message: "Role mismatch." });
    }

    // 3. HOD Department Check
    if (role === 'HOD' && user.department !== department) return res.status(403).json({ success: false, message: "Department mismatch." });

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// --- SIGNUP (UPDATED: Saves to signupRequests for Admin Approval) ---
app.post('/signup', (req, res) => {
    const { userId, pass, name, role, department, email, course, phone } = req.body;
    const db = readDB();

    if (!email || !email.toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN)) {
        return res.status(400).json({ success: false, message: `Registration requires an email ending in ${REQUIRED_EMAIL_DOMAIN}.` });
    }

    // Check if user ID or email is already registered or pending
    if (db.users[userId] || db.signupRequests.some(r => r.userId === userId || r.email === email)) {
        return res.status(409).json({ success: false, message: "User ID or Email already exists or is pending approval." });
    }
    
    // Save to pending requests array
    const newRequestId = Date.now();
    db.signupRequests.push({ 
        id: newRequestId, 
        userId, 
        pass, 
        name, 
        role, 
        department, 
        email, 
        course: course || "", 
        phone: phone || "", 
        photoUrl: "",
        status: 'Pending',
        requestedOn: new Date()
    });
    writeDB(db);
    res.json({ success: true, message: "Registration submitted for admin verification." });
});

// =========================================
// ADMIN/HOD SIGNUP MANAGEMENT ROUTES
// =========================================

// GET: Fetch all pending sign-up requests
app.get('/signup-requests/pending', (req, res) => {
    const db = readDB();
    const pending = (db.signupRequests || []).filter(r => r.status === 'Pending');
    res.json({ success: true, requests: pending });
});

// POST: Approve a sign-up request
app.post('/signup-requests/:id/approve', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.signupRequests.findIndex(r => r.id === id);

    if (index === -1) return res.status(404).json({ success: false, message: "Request not found." });

    const request = db.signupRequests[index];
    
    // 1. Move the user from signupRequests to live users
    db.users[request.userId] = { 
        id: request.userId, 
        pass: request.pass, 
        name: request.name, 
        role: request.role, 
        department: request.department, 
        email: request.email, 
        course: request.course, 
        phone: request.phone, 
        photoUrl: request.photoUrl 
    };

    // 2. Remove the request from the pending list
    db.signupRequests.splice(index, 1);
    
    writeDB(db);
    res.json({ success: true, message: `Account for ${request.name} approved and activated.` });
});

// POST: Reject a sign-up request
app.post('/signup-requests/:id/reject', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.signupRequests.findIndex(r => r.id === id);

    if (index === -1) return res.status(404).json({ success: false, message: "Request not found." });
    
    // Remove the request from the pending list
    const rejectedUser = db.signupRequests[index].name;
    db.signupRequests.splice(index, 1);
    
    writeDB(db);
    res.json({ success: true, message: `Account request for ${rejectedUser} rejected.` });
});


// --- GENERAL ---
app.get('/profile/:userId', (req, res) => {
    const user = readDB().users[req.params.userId];
    if (!user) return res.status(404).json({ success: false });
    const { pass, ...safeUser } = user;
    res.json({ success: true, profile: safeUser });
});

// --- ADMIN: USER MANAGEMENT (CRUD for LIVE users) ---
app.get('/users', (req, res) => {
    const db = readDB();
    const usersList = Object.values(db.users).map(({ pass, ...user }) => user);
    res.json({ success: true, users: usersList });
});

app.delete('/users/:userId', (req, res) => {
    const db = readDB();
    if (db.users[req.params.userId]) {
        delete db.users[req.params.userId];
        writeDB(db);
        res.json({ success: true, message: "User deleted" });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// --- ANNOUNCEMENTS ---
app.get('/announcements', (req, res) => {
    const { role, department } = req.query;
    const db = readDB();
    let all = db.announcements || [];
    if (role && role !== 'Admin') {
           all = all.filter(a => a.target === 'All' || a.target === role || (a.department && a.department === department));
    }
    res.json({ success: true, announcements: all.reverse() });
});

app.post('/announcements', (req, res) => {
    const db = readDB();
    const newAnnounce = { id: Date.now(), title: req.body.title, body: req.body.body, target: req.body.target, department: req.body.department, date: new Date() };
    db.announcements = db.announcements || [];
    db.announcements.push(newAnnounce);
    writeDB(db);
    res.json({ success: true, message: "Announcement posted" });
});

// --- ID CARDS ---
app.post('/id-cards/apply', upload.single('idCardPhoto'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Photo is required (max 20MB)" });
    const db = readDB();
    db.idCardRequests = db.idCardRequests || [];
    db.idCardRequests = db.idCardRequests.filter(r => r.userId !== req.body.userId);
    db.idCardRequests.push({
        id: Date.now(),
        ...req.body,
        photoUrl: `/uploads/id-cards/${req.file.filename}`,
        status: 'Pending',
        appliedOn: new Date()
    });
    writeDB(db);
    res.json({ success: true, message: "Application submitted" });
});

app.get('/id-cards/my-status/:userId', (req, res) => {
    const db = readDB();
    const reqData = (db.idCardRequests || []).find(r => r.userId === req.params.userId);
    res.json({ success: true, request: reqData || null });
});

app.get('/id-cards/pending', (req, res) => {
    const db = readDB();
    const pending = (db.idCardRequests || []).filter(r => r.status === 'Pending');
    res.json({ success: true, requests: pending });
});

app.post('/id-cards/:id/action', (req, res) => {
    const db = readDB();
    const cardReq = (db.idCardRequests || []).find(r => r.id == req.params.id);
    if (cardReq) {
        cardReq.status = req.body.status;
        writeDB(db);
        res.json({ success: true, message: `Request ${req.body.status}` });
    } else {
        res.status(404).json({ success: false, message: "Request not found" });
    }
});

// --- EXISTING FEATURES ---
app.get('/placements', (req, res) => {
    const db = readDB();
    let results = db.placements || [];
    if (req.query.department) results = results.filter(p => p.department === req.query.department);
    res.json({ success: true, placements: results.sort((a, b) => b.postedOn - a.postedOn) });
});
app.post('/placements', (req, res) => {
    const db = readDB();
    db.placements = (db.placements || []).concat({ id: Date.now(), ...req.body, postedOn: Date.now(), applications: [] });
    writeDB(db);
    res.json({ success: true, message: "Placement posted" });
});
app.get('/timetable', (req, res) => { res.json({ success: true, timetable: readDB().timetables?.[req.query.course] || {} }); });
app.get('/attendance/:userId', (req, res) => { res.json({ success: true, attendance: readDB().attendance?.[req.params.userId] || {} }); });
app.post('/attendance/mark', (req, res) => {
    const { studentId, subject, status } = req.body; const db = readDB();
    if (!db.attendance) db.attendance = {}; if (!db.attendance[studentId]) db.attendance[studentId] = {};
    if (!db.attendance[studentId][subject]) db.attendance[studentId][subject] = { present: 0, total: 0 };
    db.attendance[studentId][subject].total++; if (status === 'Present') db.attendance[studentId][subject].present++;
    writeDB(db); res.json({ success: true, message: "Attendance marked" });
});
app.get('/marks/:userId', (req, res) => { res.json({ success: true, marks: readDB().marks?.[req.params.userId] || [] }); });
app.get('/assignments', (req, res) => {
    const { course, facultyId } = req.query; const db = readDB();
    let all = Object.values(db.assignments || {}).flat();
    if (course) all = all.filter(a => a.course === course);
    if (facultyId) all = all.filter(a => a.facultyId === facultyId);
    res.json({ success: true, assignments: all });
});
app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const db = readDB(); const { department } = req.body;
    if (!db.assignments) db.assignments = {}; if (!db.assignments[department]) db.assignments[department] = [];
    db.assignments[department].push({ id: Date.now(), ...req.body, filePath: req.file ? `/uploads/assignments/${req.file.filename}` : null, submissions: [] });
    writeDB(db); res.json({ success: true, message: "Assignment created" });
});
app.post('/assignments/:id/submit', upload.single('submissionFile'), (req, res) => {
    const db = readDB(); let found = false;
    for (const d in db.assignments) {
        const a = db.assignments[d].find(x => x.id == req.params.id);
        if (a) { a.submissions.push({ ...req.body, filePath: req.file ? `/uploads/submissions/${req.file.filename}` : null, submittedOn: new Date() }); found = true; break; }
    }
    if (found) { writeDB(db); res.json({ success: true, message: "Submitted" }); } else res.status(404).json({ success: false });
});
app.get('/leaves/:userId', (req, res) => { res.json({ success: true, leaves: (readDB().leaveRequests || []).filter(l => l.userId === req.params.userId) }); });
app.get('/leaves/pending/:department', (req, res) => { res.json({ success: true, leaves: (readDB().leaveRequests || []).filter(l => l.department === req.params.department && l.status === 'Pending') }); });
app.post('/leaves', (req, res) => {
    const db = readDB(); db.leaveRequests = (db.leaveRequests || []).concat({ id: Date.now(), ...req.body, status: 'Pending', appliedOn: new Date() });
    writeDB(db); res.json({ success: true, message: "Leave submitted" });
});
app.post('/leaves/:id/action', (req, res) => {
    const db = readDB(); const l = (db.leaveRequests || []).find(x => x.id == req.params.id);
    if (l) { l.status = req.body.status; writeDB(db); res.json({ success: true, message: `Leave ${req.body.status}` }); }
    else res.status(404).json({ success: false });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));