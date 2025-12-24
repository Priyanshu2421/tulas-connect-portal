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
const MENTOR_LIMIT = 25;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname)); 

// --- INITIALIZATION & DATABASE STRUCTURE ---
function getInitialMockDB() {
    return {
        users: {
            "admin.tulas.in": { 
                "id": "admin.tulas.in", "pass": "admin123", "name": "Institute Administrator", 
                "role": "Admin", "department": "Administration", "email": "admin@tulas.edu.in", 
                "phone": "1234567890", "photoUrl": "" 
            }
        }, 
        courses: {
            "BTECH-CSE": {
                "name": "Bachelor of Technology (CSE)",
                "batches": {
                    "2024": ["A", "B", "C"],
                    "2023": ["A", "B"]
                }
            }
        },
        subjects: [
            { "code": "CS101", "name": "Data Structures", "department": "Department of Engineering" },
            { "code": "MA101", "name": "Mathematics I", "department": "Department of Engineering" }
        ],
        allotments: [],
        mentorshipGroups: [],
        placements: [], 
        attendance: {}, 
        marks: {}, 
        timetables: {}, 
        assignments: {}, 
        leaveRequests: [], 
        announcements: [], 
        idCardRequests: [],
        signupRequests: []
    };
}

function initialize() {
    const folders = [
        PUBLIC_DIR, 
        UPLOADS_DIR, 
        path.join(UPLOADS_DIR, 'profiles'), 
        path.join(UPLOADS_DIR, 'assignments'), 
        path.join(UPLOADS_DIR, 'submissions'), 
        path.join(UPLOADS_DIR, 'id-cards')
    ];
    folders.forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    if (!fs.existsSync(DB_PATH)) {
        writeDB(getInitialMockDB());
    }
}
initialize();

// --- DATABASE HELPERS ---
const readDB = () => {
    try { 
        let data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        // Ensure all keys exist to prevent crashes
        const defaults = getInitialMockDB();
        Object.keys(defaults).forEach(key => {
            if (!data[key]) data[key] = defaults[key];
        });
        return data; 
    } catch (e) { 
        console.error("DB Read Failure:", e);
        return getInitialMockDB(); 
    }
};

const writeDB = (data) => { 
    try { 
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); 
    } catch (e) { 
        console.error("DB Write Error:", e); 
    } 
};

// --- AUTHORIZATION HELPERS ---
function isAuthorized(req, role, department) {
    const db = readDB();
    const userId = req.body.hodId || req.body.adminId || req.query.currentUserId || req.body.userId;
    const user = db.users[userId];
    if (user && user.role === 'Admin') return true; 
    if (user && user.role === 'HOD' && (!department || user.department === department)) return true;
    return false;
}

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'profiles';
        if (file.fieldname === 'assignmentFile') folder = 'assignments';
        if (file.fieldname === 'submissionFile') folder = 'submissions';
        if (file.fieldname === 'idCardPhoto') folder = 'id-cards';
        cb(null, path.join(UPLOADS_DIR, folder));
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// =========================================
// 1. AUTHENTICATION & ACCESS
// =========================================

app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];

    if (!user || user.pass !== password) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const expectedRole = role === 'Department Login' ? 'HOD' : role;
    if (user.role !== expectedRole) {
        return res.status(403).json({ success: false, message: "Incorrect Access Level selected" });
    }

    if (expectedRole === 'HOD' && user.department !== department) {
        return res.status(403).json({ success: false, message: "Department mismatch" });
    }

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

app.post('/signup', (req, res) => {
    const { userId, pass, name, role, department, email, course, phone } = req.body;
    const db = readDB();

    if (!email || !email.toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN)) {
        return res.status(400).json({ success: false, message: "Invalid email domain" });
    }

    if (db.users[userId]) {
        return res.status(409).json({ success: false, message: "User ID already exists" });
    }

    db.signupRequests.push({
        id: Date.now(),
        userId, pass, name, role, department, email, course, phone,
        status: 'Pending',
        requestedOn: new Date()
    });

    writeDB(db);
    res.json({ success: true, message: "Registration submitted for verification" });
});

// =========================================
// 2. ACADEMIC & ALLOTMENT MANAGEMENT (HOD)
// =========================================

// Get data mapping for HOD to populate allotment forms
app.get('/api/hod/data-map', (req, res) => {
    const db = readDB();
    const dept = req.query.dept;
    const users = Object.values(db.users);
    
    res.json({
        success: true,
        faculty: users.filter(u => (u.role === 'Faculty' || u.role === 'HOD') && u.department === dept),
        unassignedStudents: users.filter(u => u.role === 'Student' && u.department === dept && !u.mentorId),
        subjects: db.subjects.filter(s => s.department === dept),
        courses: db.courses || {}
    });
});

// Allot a subject to a faculty member for a specific section
app.post('/api/allotments', (req, res) => {
    const db = readDB();
    const { facultyId, subjectCode, course, batch, section, hodId } = req.body;

    if (!isAuthorized(req, 'HOD')) return res.status(403).json({ success: false, message: "Unauthorized" });

    // Prevent duplicate allotment for the same section/subject
    const existing = db.allotments.find(a => 
        a.subjectCode === subjectCode && a.course === course && 
        a.batch === batch && a.section === section
    );
    if (existing) return res.status(409).json({ success: false, message: "Subject already allotted to another faculty for this section" });

    db.allotments.push({
        id: `alt_${Date.now()}`,
        facultyId, subjectCode, course, batch, section
    });

    writeDB(db);
    res.json({ success: true, message: "Subject allotment successful" });
});

// =========================================
// 3. MENTORSHIP MODULE
// =========================================

app.post('/api/mentorship', (req, res) => {
    const db = readDB();
    const { mentorId, mentees, title, hodId } = req.body;

    if (!isAuthorized(req, 'HOD')) return res.status(403).json({ success: false, message: "Unauthorized" });
    if (mentees.length > MENTOR_LIMIT) return res.status(400).json({ success: false, message: `Mentor limit of ${MENTOR_LIMIT} exceeded` });

    const groupId = `ment_${Date.now()}`;
    db.mentorshipGroups.push({ id: groupId, mentorId, mentees, title });

    // Link students to mentor in their profiles
    mentees.forEach(sid => {
        if (db.users[sid]) db.users[sid].mentorId = mentorId;
    });

    writeDB(db);
    res.json({ success: true, message: "Mentorship group established" });
});

// =========================================
// 4. ROLE-BASED DASHBOARD SUMMARIES
// =========================================

app.get('/api/dashboard/summary/:userId', (req, res) => {
    const db = readDB();
    const user = db.users[req.params.userId];
    if (!user) return res.status(404).json({ success: false });

    let summary = {};

    if (user.role === 'Student') {
        // Find teachers assigned to my specific section
        summary.teachers = db.allotments
            .filter(a => a.course === user.courseId && a.batch === user.batchYear && a.section === user.section)
            .map(a => ({
                subject: db.subjects.find(s => s.code === a.subjectCode)?.name || a.subjectCode,
                faculty: db.users[a.facultyId]?.name || 'Unknown'
            }));
        summary.mentor = db.users[user.mentorId] ? { name: db.users[user.mentorId].name, email: db.users[user.mentorId].email } : null;
    }

    if (user.role === 'Faculty') {
        // Find classes I teach
        summary.classes = db.allotments.filter(a => a.facultyId === user.id);
        // Find my mentees
        const group = db.mentorshipGroups.find(g => g.mentorId === user.id);
        summary.mentees = group ? group.mentees.map(sid => ({ id: sid, name: db.users[sid]?.name })) : [];
    }

    if (user.role === 'HOD') {
        summary.totalFaculty = Object.values(db.users).filter(u => u.role === 'Faculty' && u.department === user.department).length;
        summary.totalStudents = Object.values(db.users).filter(u => u.role === 'Student' && u.department === user.department).length;
        summary.pendingLeaves = db.leaveRequests.filter(l => l.status === 'Pending' && l.department === user.department).length;
    }

    res.json({ success: true, summary });
});

// =========================================
// 5. USER & SIGNUP MANAGEMENT
// =========================================

app.get('/users', (req, res) => {
    const db = readDB();
    const list = Object.values(db.users).map(({ pass, ...u }) => u);
    res.json({ success: true, users: list });
});

app.delete('/users/:id', (req, res) => {
    const db = readDB();
    if (db.users[req.params.id]) {
        delete db.users[req.params.id];
        writeDB(db);
        return res.json({ success: true, message: "User deleted" });
    }
    res.status(404).json({ success: false });
});

app.get('/signup-requests/pending', (req, res) => {
    res.json({ success: true, requests: readDB().signupRequests.filter(r => r.status === 'Pending') });
});

app.post('/signup-requests/:id/:action', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const idx = db.signupRequests.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ success: false });

    const request = db.signupRequests[idx];
    if (req.params.action === 'approve') {
        const finalId = req.body.newUserId || request.userId;
        db.users[finalId] = { ...request, id: finalId, userId: finalId };
    }
    db.signupRequests.splice(idx, 1);
    writeDB(db);
    res.json({ success: true, message: `User ${req.params.action}d` });
});

// =========================================
// 6. PROFILE & ID CARDS
// =========================================

app.get('/profile/:id', (req, res) => {
    const user = readDB().users[req.params.id];
    if (!user) return res.status(404).json({ success: false });
    const { pass, ...safe } = user;
    res.json({ success: true, profile: safe });
});

app.post('/profile/update', upload.single('photoFile'), (req, res) => {
    const db = readDB();
    const user = db.users[req.body.userId];
    if (!user) return res.status(404).json({ success: false });
    
    Object.keys(req.body).forEach(key => {
        if (key !== 'userId' && key !== 'pass') user[key] = req.body[key];
    });

    if (req.file) user.photoUrl = `/uploads/profiles/${req.file.filename}`;
    writeDB(db);
    res.json({ success: true, updatedUser: user });
});

app.post('/id-cards/apply', upload.single('idCardPhoto'), (req, res) => {
    const db = readDB();
    db.idCardRequests.push({
        id: Date.now(),
        ...req.body,
        photoUrl: `/uploads/id-cards/${req.file.filename}`,
        status: 'Pending',
        appliedOn: new Date()
    });
    writeDB(db);
    res.json({ success: true });
});

// =========================================
// 7. LEAVES, ATTENDANCE, MARKS
// =========================================

app.get('/leaves/:id', (req, res) => {
    res.json({ success: true, leaves: readDB().leaveRequests.filter(l => l.userId === req.params.id) });
});

app.post('/leaves', (req, res) => {
    const db = readDB();
    const user = db.users[req.body.userId];
    // Rule: Students apply to Mentor, Others apply to HOD
    const target = (user?.role === 'Student' && user.mentorId) ? user.mentorId : 'HOD';
    
    db.leaveRequests.push({
        id: Date.now(),
        ...req.body,
        status: 'Pending',
        appliedOn: new Date(),
        approvalTarget: target
    });
    writeDB(db);
    res.json({ success: true, message: `Application routed to ${target}` });
});

app.post('/leaves/:id/action', (req, res) => {
    const db = readDB();
    const leaf = db.leaveRequests.find(l => l.id == req.params.id);
    if (leaf) {
        leaf.status = req.body.status;
        writeDB(db);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false });
});

app.post('/attendance/mark', (req, res) => {
    const db = readDB();
    const { studentId, subjectCode, status } = req.body;
    if (!db.attendance[studentId]) db.attendance[studentId] = {};
    if (!db.attendance[studentId][subjectCode]) db.attendance[studentId][subjectCode] = { present: 0, total: 0 };
    
    db.attendance[studentId][subjectCode].total++;
    if (status === 'Present') db.attendance[studentId][subjectCode].present++;
    
    writeDB(db);
    res.json({ success: true });
});

// =========================================
// 8. ANNOUNCEMENTS & PLACEMENTS
// =========================================

app.get('/announcements', (req, res) => {
    const { role, department } = req.query;
    let list = readDB().announcements;
    if (role && role !== 'Admin') {
        list = list.filter(a => a.target === 'All' || a.target === role || a.department === department);
    }
    res.json({ success: true, announcements: list.reverse() });
});

app.post('/announcements', (req, res) => {
    const db = readDB();
    db.announcements.push({ id: Date.now(), ...req.body, date: new Date() });
    writeDB(db);
    res.json({ success: true });
});

// =========================================
// 9. DEPLOYMENT & STATIC ROUTES
// =========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('*', (req, res) => {
    // Avoid serving index.html for missing API or Upload calls
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return res.status(404).json({ success: false, message: "Resource not found" });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`ERP Server active on port ${PORT}`));