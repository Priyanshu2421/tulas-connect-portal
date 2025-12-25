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
                "role": "Admin", "dept": "Administration", "email": "admin@tulas.edu.in", 
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
            { "code": "CS101", "name": "Data Structures", "dept": "Department of Engineering" },
            { "code": "MA101", "name": "Mathematics I", "dept": "Department of Engineering" }
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
    
    // Check both dept and department keys
    const userDept = (user?.dept || user?.department || "").trim().toLowerCase();
    const targetDept = (department || "").trim().toLowerCase();
    
    if (user && user.role === 'HOD' && (!department || userDept === targetDept)) return true;
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

    // Role mapping: "Department Login" from frontend matches "HOD" in db
    const expectedRole = role === 'Department Login' ? 'HOD' : role;
    if (user.role !== expectedRole) {
        return res.status(403).json({ success: false, message: `Access Level mismatch. System role: ${user.role}` });
    }

    // --- DEPARTMENT MISMATCH FIX ---
    if (expectedRole === 'HOD' || expectedRole === 'Faculty') {
        const submittedDept = (department || "").trim().toLowerCase();
        const userDept = (user.dept || user.department || "").trim().toLowerCase();
        
        // Server-side logs to debug matching
        console.log(`Login Attempt: ID=${userId} | Sub=${submittedDept} | DB=${userDept}`);

        if (userDept !== submittedDept) {
            return res.status(403).json({ 
                success: false, 
                message: `Department mismatch. Registered in: ${user.dept || user.department}` 
            });
        }
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
        userId, pass, name, role, dept: department, email, course, phone,
        status: 'Pending',
        requestedOn: new Date()
    });

    writeDB(db);
    res.json({ success: true, message: "Registration submitted for verification" });
});

// =========================================
// 2. ACADEMIC & ALLOTMENT MANAGEMENT (HOD)
// =========================================

app.get('/api/hod/data-map', (req, res) => {
    const db = readDB();
    const dept = req.query.dept;
    const normalizedDept = (dept || "").trim().toLowerCase();
    const users = Object.values(db.users);
    
    res.json({
        success: true,
        faculty: users.filter(u => {
            const uDept = (u.dept || u.department || "").trim().toLowerCase();
            return (u.role === 'Faculty' || u.role === 'HOD') && uDept === normalizedDept;
        }),
        unassignedStudents: users.filter(u => {
            const uDept = (u.dept || u.department || "").trim().toLowerCase();
            return u.role === 'Student' && uDept === normalizedDept && !u.mentorId;
        }),
        subjects: db.subjects.filter(s => (s.dept || s.department || "").trim().toLowerCase() === normalizedDept),
        courses: db.courses || {}
    });
});

app.post('/api/allotments', (req, res) => {
    const db = readDB();
    const { facultyId, subjectCode, course, batch, section, hodId } = req.body;

    if (!isAuthorized(req, 'HOD')) return res.status(403).json({ success: false, message: "Unauthorized" });

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
        summary.teachers = db.allotments
            .filter(a => a.course === user.courseId && a.batch === user.batchYear && a.section === user.section)
            .map(a => ({
                subject: db.subjects.find(s => s.code === a.subjectCode)?.name || a.subjectCode,
                faculty: db.users[a.facultyId]?.name || 'Unknown'
            }));
        summary.mentor = db.users[user.mentorId] ? { name: db.users[user.mentorId].name, email: db.users[user.mentorId].email } : null;
    }

    if (user.role === 'Faculty') {
        summary.classes = db.allotments.filter(a => a.facultyId === user.id);
        const group = db.mentorshipGroups.find(g => g.mentorId === user.id);
        summary.mentees = group ? group.mentees.map(sid => ({ id: sid, name: db.users[sid]?.name })) : [];
    }

    if (user.role === 'HOD') {
        const hDept = (user.dept || user.department || "").trim().toLowerCase();
        summary.totalFaculty = Object.values(db.users).filter(u => {
            const uDept = (u.dept || u.department || "").trim().toLowerCase();
            return u.role === 'Faculty' && uDept === hDept;
        }).length;
        summary.totalStudents = Object.values(db.users).filter(u => {
            const uDept = (u.dept || u.department || "").trim().toLowerCase();
            return u.role === 'Student' && uDept === hDept;
        }).length;
        summary.pendingLeaves = db.leaveRequests.filter(l => {
            const lDept = (l.dept || l.department || "").trim().toLowerCase();
            return l.status === 'Pending' && lDept === hDept;
        }).length;
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
    const normalizedDept = (department || "").trim().toLowerCase();
    let list = readDB().announcements;
    if (role && role !== 'Admin') {
        list = list.filter(a => {
            const aDept = (a.dept || a.department || "").trim().toLowerCase();
            return a.target === 'All' || a.target === role || aDept === normalizedDept;
        });
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
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return res.status(404).json({ success: false, message: "Resource not found" });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`ERP Server active on port ${PORT}`));