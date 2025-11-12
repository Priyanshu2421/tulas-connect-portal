const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- PATHS ---
const DB_PATH = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// --- CONSTANTS ---
const REQUIRED_EMAIL_DOMAIN = '@tulas.edu.in'; 

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
        let data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        
        // Initialize new properties
        if (!data.signupRequests) data.signupRequests = [];
        if (!data.batches) data.batches = {}; // New: { batchId: { name, department, students: [], assignments: [] } }
        if (!data.subjects) data.subjects = {}; // New: { courseCode: { name, department, teacherId, batchIds: [] } }
        
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
                    "id": "S2024001", "pass": "student123", "name": "Rajesh Kumar", "role": "Student", "department": "Department of Engineering", "email": "rajesh.kumar@tulas.edu.in", "course": "B.Tech CSE", "phone": "8887776660", "batchId": "BTECH-CSE-2024", "photoUrl": ""
                }
            };
            // Mock initial batch/subject data for testing the faculty view
            data.batches["BTECH-CSE-2024"] = { name: "B.Tech CSE 2024", department: "Department of Engineering", students: ["S2024001"], subjects: ["CS101", "MA101"] };
            data.subjects["CS101"] = { name: "Data Structures", department: "Department of Engineering", teacherId: "F101", batchIds: ["BTECH-CSE-2024"] };
            data.users["F101"] = { "id": "F101", "pass": "faculty123", "name": "Dr. Sharma", "role": "Faculty", "department": "Department of Engineering", "email": "f101@tulas.edu.in", "phone": "7776665550", "photoUrl": "" };
        }
        
        return data; 
    }
    catch (e) { 
        // Return minimal default structure if db.json is corrupted
        return { 
            users: {
                "admin.tulas.in": { "id": "admin.tulas.in", "pass": "admin123", "name": "Institute Administrator", "role": "Admin", "department": "Administration", "email": "admin@tulas.edu.in", "phone": "1234567890", "bloodGroup": "O+", "address": "Tula's Institute, Dehradun", "dob": "1990-01-01", "photoUrl": "" },
            }, 
            placements: [], attendance: {}, marks: {}, timetables: {}, assignments: {}, leaveRequests: [], announcements: [], idCardRequests: [],
            signupRequests: [], batches: {}, subjects: {}
        }; 
    }
};
const writeDB = (data) => { try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch (e) { console.error("DB Write Error:", e); } };

// --- MULTER CONFIG (UNCHANGED) ---
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
    limits: { fileSize: 20 * 1024 * 1024 } 
});

// =========================================
// API ROUTES
// =========================================

// --- AUTH (Simple User/Pass - UNCHANGED) ---
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];
    
    if (!user || user.pass !== password) return res.status(401).json({ success: false, message: "Invalid User ID or Password." });
    if (user.role !== role) {
        if (!(role === 'HOD' && user.role === 'HOD')) return res.status(403).json({ success: false, message: "Role mismatch." });
    }
    if (role === 'HOD' && user.department !== department) return res.status(403).json({ success: false, message: "Department mismatch." });

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// --- SIGNUP (Saves to signupRequests - UNCHANGED) ---
app.post('/signup', (req, res) => {
    const { userId, pass, name, role, department, email, course, phone } = req.body;
    const db = readDB();

    if (!email || !email.toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN)) {
        return res.status(400).json({ success: false, message: `Registration requires an email ending in ${REQUIRED_EMAIL_DOMAIN}.` });
    }

    if (db.users[userId] || db.signupRequests.some(r => r.userId === userId || r.email === email)) {
        return res.status(409).json({ success: false, message: "User ID or Email already exists or is pending approval." });
    }
    
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
// BATCH MANAGEMENT ROUTES (NEW)
// =========================================

// GET /api/batches - Get all batches (Admin/HOD only)
app.get('/batches', (req, res) => {
    const db = readDB();
    // In a real system, you'd check if the user is Admin or HOD
    const batchesList = Object.keys(db.batches).map(id => ({ id, ...db.batches[id] }));
    res.json({ success: true, batches: batchesList });
});

// POST /api/batches - Create a new batch
app.post('/batches', (req, res) => {
    const db = readDB();
    const { id, name, department, course } = req.body;
    if (db.batches[id]) return res.status(409).json({ success: false, message: "Batch ID already exists." });

    db.batches[id] = { id, name, department, course, students: [], subjects: [] };
    writeDB(db);
    res.json({ success: true, message: `Batch ${name} created.` });
});

// POST /api/subjects - Create or Update a subject and assign teacher/batches
app.post('/subjects', (req, res) => {
    const db = readDB();
    const { courseCode, name, department, teacherId, batchIds } = req.body;

    // Basic validation
    if (!db.users[teacherId] || db.users[teacherId].role !== 'Faculty') {
        return res.status(400).json({ success: false, message: "Invalid Teacher ID or role." });
    }

    db.subjects[courseCode] = { name, department, teacherId, batchIds: batchIds || [] };
    writeDB(db);
    res.json({ success: true, message: `Subject ${name} assigned to teacher and batches.` });
});

// POST /api/batches/:batchId/enroll/:userId - Enroll a student into a batch
app.post('/batches/:batchId/enroll/:userId', (req, res) => {
    const db = readDB();
    const { batchId, userId } = req.params;

    if (!db.users[userId] || db.users[userId].role !== 'Student') return res.status(404).json({ success: false, message: "Student not found." });
    if (!db.batches[batchId]) return res.status(404).json({ success: false, message: "Batch not found." });
    
    // 1. Update user record
    db.users[userId].batchId = batchId;
    
    // 2. Update batch record
    if (!db.batches[batchId].students.includes(userId)) {
        db.batches[batchId].students.push(userId);
    }

    writeDB(db);
    res.json({ success: true, message: `Student ${userId} enrolled in Batch ${batchId}.` });
});


// =========================================
// ADMIN/HOD SIGNUP MANAGEMENT ROUTES (UNCHANGED)
// =========================================

app.get('/signup-requests/pending', (req, res) => {
    const db = readDB();
    const pending = (db.signupRequests || []).filter(r => r.status === 'Pending');
    res.json({ success: true, requests: pending });
});

app.post('/signup-requests/:id/approve', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.signupRequests.findIndex(r => r.id === id);

    if (index === -1) return res.status(404).json({ success: false, message: "Request not found." });

    const request = db.signupRequests[index];
    
    // 1. Move the user from signupRequests to live users
    db.users[request.userId] = { 
        ...request, 
        batchId: null, // IMPORTANT: Admin/HOD must now assign the batch separately!
    };
    delete db.users[request.userId].id; // Clean up redundant id property

    // 2. Remove the request from the pending list
    db.signupRequests.splice(index, 1);
    
    writeDB(db);
    res.json({ success: true, message: `Account for ${request.name} approved. Batch assignment pending.` });
});

app.post('/signup-requests/:id/reject', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.signupRequests.findIndex(r => r.id === id);

    if (index === -1) return res.status(404).json({ success: false, message: "Request not found." });
    
    const rejectedUser = db.signupRequests[index].name;
    db.signupRequests.splice(index, 1);
    
    writeDB(db);
    res.json({ success: true, message: `Account request for ${rejectedUser} rejected.` });
});


// =========================================
// FEATURE ROUTES UPDATES
// =========================================

// POST /attendance/mark - UPDATED to check teacher assignment
app.post('/attendance/mark', (req, res) => {
    const { facultyId, batchId, subjectCode, studentId, status } = req.body; 
    const db = readDB();

    // 1. Authorization check: Is this teacher assigned to this subject/batch?
    const subject = db.subjects[subjectCode];
    if (!subject || subject.teacherId !== facultyId) {
        return res.status(403).json({ success: false, message: "Faculty not assigned to this subject." });
    }
    if (!subject.batchIds.includes(batchId)) {
        return res.status(403).json({ success: false, message: "Batch is not linked to this subject." });
    }

    // 2. Student check: Is the student in the batch?
    const student = db.users[studentId];
    if (!student || student.batchId !== batchId) {
         return res.status(403).json({ success: false, message: "Student is not part of this batch." });
    }

    // 3. Original attendance marking logic (simplified)
    if (!db.attendance) db.attendance = {}; 
    if (!db.attendance[studentId]) db.attendance[studentId] = {};
    const subKey = `${subjectCode} (${batchId})`;

    if (!db.attendance[studentId][subKey]) db.attendance[studentId][subKey] = { present: 0, total: 0 };
    
    db.attendance[studentId][subKey].total++; 
    if (status === 'Present') db.attendance[studentId][subKey].present++;
    
    writeDB(db); 
    res.json({ success: true, message: "Attendance marked" });
});

// GET /attendance/:userId (UNCHANGED)
app.get('/attendance/:userId', (req, res) => { res.json({ success: true, attendance: readDB().attendance?.[req.params.userId] || {} }); });


// --- OTHER FEATURE ROUTES (RETAINED/UNCHANGED) ---
app.get('/profile/:userId', (req, res) => {
    const user = readDB().users[req.params.userId];
    if (!user) return res.status(404).json({ success: false });
    const { pass, ...safeUser } = user;
    res.json({ success: true, profile: safeUser });
});
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