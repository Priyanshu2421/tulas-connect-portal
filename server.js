const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- PATHS ---
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// --- INITIALIZATION ---
function initialize() {
    [DATA_DIR, PUBLIC_DIR, UPLOADS_DIR, path.join(UPLOADS_DIR, 'profiles'), path.join(UPLOADS_DIR, 'assignments')].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    if (!fs.existsSync(DB_PATH)) {
        console.log("Creating fresh db.json with complete schema...");
        const initialData = {
            users: {
                "admin": { id: "admin", pass: "admin123", name: "Super Admin", role: "Admin", department: "Management" },
                "2024001": { 
                    id: "2024001", pass: "pass123", name: "Rahul Student", role: "Student", 
                    department: "Department of Computer Applications", course: "BCA",
                    email: "rahul@tulas.in", phone: "9876543210"
                },
                "FAC001": {
                    id: "FAC001", pass: "pass123", name: "Dr. Sharma", role: "Faculty",
                    department: "Department of Computer Applications", email: "sharma@tulas.in"
                },
                "HOD_CA": {
                    id: "HOD_CA", pass: "pass123", name: "Prof. Verma", role: "HOD",
                    department: "Department of Computer Applications", email: "hod.ca@tulas.in"
                }
            },
            // NEW: Added missing data structures expected by frontend
            timetables: {
                "BCA": {
                    "Monday": [{ time: "09:00-10:00", subject: "Web Tech", faculty: "Dr. Sharma" }, { time: "10:00-11:00", subject: "DBMS", faculty: "Prof. Verma" }],
                    "Wednesday": [{ time: "11:00-12:00", subject: "Java", faculty: "FAC001" }]
                }
            },
            attendance: {
                "2024001": { "Web Tech": { total: 20, present: 18 }, "DBMS": { total: 20, present: 15 } }
            },
            marks: [
                { studentId: "2024001", subject: "Web Tech", exam: "Mid Term", marks: 25, total: 30 },
                { studentId: "2024001", subject: "DBMS", exam: "Mid Term", marks: 28, total: 30 }
            ],
            assignments: [],
            leaves: [],
            placements: [
                {
                    id: 101, companyName: "TCS", jobTitle: "System Engineer", 
                    jobDescription: "Open for all CS/IT students.", department: "Department of Engineering",
                    course: "B.Tech CSE", postedOn: Date.now(), applications: []
                }
            ]
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    }
}
initialize();

// --- HELPERS ---
const readDB = () => {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } 
    catch (e) { return { users: {} }; }
};
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOADS_DIR),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    })
});

// ================= API ROUTES =================

// AUTH
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];

    if (!user || user.pass !== password) return res.json({ success: false, message: "Invalid credentials" });
    if (user.role !== role) return res.json({ success: false, message: "Role mismatch" });
    if (role === 'HOD' && user.department !== department) return res.json({ success: false, message: "Department mismatch" });

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

app.post('/signup', (req, res) => {
    const db = readDB();
    if (db.users[req.body.userId]) return res.json({ success: false, message: "User ID exists" });
    
    db.users[req.body.userId] = { ...req.body, photoUrl: "" };
    writeDB(db);
    res.json({ success: true });
});

// PROFILE
app.get('/profile/:id', (req, res) => {
    const user = readDB().users[req.params.id];
    user ? res.json({ success: true, profile: user }) : res.status(404).json({ success: false });
});

// TIMETABLE
app.get('/timetable', (req, res) => {
    const db = readDB();
    const course = req.query.course;
    res.json({ timetable: db.timetables[course] || {} });
});

// ATTENDANCE
app.get('/attendance/:id', (req, res) => {
    res.json({ attendance: readDB().attendance[req.params.id] || {} });
});

app.post('/attendance/mark', (req, res) => {
    const { studentId, subject, status } = req.body;
    const db = readDB();
    if (!db.attendance[studentId]) db.attendance[studentId] = {};
    if (!db.attendance[studentId][subject]) db.attendance[studentId][subject] = { total: 0, present: 0 };
    
    db.attendance[studentId][subject].total++;
    if (status === 'Present') db.attendance[studentId][subject].present++;
    
    writeDB(db);
    res.json({ success: true });
});

// MARKS
app.get('/marks/:id', (req, res) => {
    const studentMarks = (readDB().marks || []).filter(m => m.studentId === req.params.id);
    res.json({ marks: studentMarks });
});

// ASSIGNMENTS
app.get('/assignments', (req, res) => {
    const db = readDB();
    let result = db.assignments || [];
    if (req.query.course) result = result.filter(a => a.course === req.query.course);
    if (req.query.facultyId) result = result.filter(a => a.facultyId === req.query.facultyId);
    res.json({ assignments: result });
});

app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const db = readDB();
    const newAssign = {
        id: Date.now(),
        ...req.body,
        filePath: req.file ? `/uploads/${req.file.filename}` : null,
        submissions: []
    };
    db.assignments.push(newAssign);
    writeDB(db);
    res.json({ success: true });
});

app.post('/assignments/:id/submit', upload.single('submissionFile'), (req, res) => {
    const db = readDB();
    const assign = db.assignments.find(a => a.id == req.params.id);
    if (assign) {
        assign.submissions.push({
            studentId: req.body.studentId,
            studentName: req.body.studentName,
            submittedOn: new Date(),
            filePath: req.file ? `/uploads/${req.file.filename}` : null
        });
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// LEAVES
app.get('/leaves/:id', (req, res) => {
    const userLeaves = (readDB().leaves || []).filter(l => l.userId === req.params.id);
    res.json({ leaves: userLeaves });
});

app.get('/leaves/pending/:dept', (req, res) => {
    const pending = (readDB().leaves || []).filter(l => l.department === req.params.dept && l.status === 'Pending');
    res.json({ leaves: pending });
});

app.post('/leaves', (req, res) => {
    const db = readDB();
    db.leaves.push({ id: Date.now(), ...req.body, status: 'Pending', appliedOn: new Date() });
    writeDB(db);
    res.json({ success: true });
});

app.post('/leaves/:id/action', (req, res) => {
    const db = readDB();
    const leave = db.leaves.find(l => l.id == req.params.id);
    if (leave) {
        leave.status = req.body.status;
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// PLACEMENTS
app.get('/placements', (req, res) => {
    let result = readDB().placements || [];
    if (req.query.department) result = result.filter(p => p.department === req.query.department);
    res.json({ placements: result });
});

app.post('/placements', (req, res) => {
    const db = readDB();
    db.placements.push({ id: Date.now(), ...req.body, postedOn: new Date(), applications: [] });
    writeDB(db);
    res.json({QP success: true });
});

// START
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));