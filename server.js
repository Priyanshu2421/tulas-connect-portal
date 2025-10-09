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
const RESUMES_DIR = path.join(UPLOADS_DIR, 'resumes'); // New directory for resumes

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@example.com',
        pass: process.env.EMAIL_PASS || 'your-password'
    }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// --- INITIALIZE SERVER ---
const initializeServer = () => {
    try {
        if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'));
        // Added RESUMES_DIR to initialization
        [UPLOADS_DIR, PROFILE_PICS_DIR, ASSIGNMENTS_DIR, RESUMES_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
        if (!fs.existsSync(DB_PATH)) {
            console.log("db.json not found, creating a new default database.");
            const defaultDB = { users: {}, pendingUsers: {}, passwordResets: {}, idCardRequests: [], signupRequests: [], announcements: [], assignments: [], leaveRequests: [], placements: [] }; // Added placements
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
        let destDir = PROFILE_PICS_DIR;
        if (file.fieldname === 'assignmentFile') destDir = ASSIGNMENTS_DIR;
        if (file.fieldname === 'resumeFile') destDir = RESUMES_DIR; // Handle resume uploads
        cb(null, destDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});
const upload = multer({ storage: storage });

// --- EXISTING AUTHENTICATION & PROFILE ROUTES (UNCHANGED) ---
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

app.post('/signup', async (req, res) => {
    const db = readDB();
    const { userId, email } = req.body;
    if (db.users[userId] || db.signupRequests.some(r => r.userId === userId) || Object.values(db.pendingUsers).some(p => p.userId === userId)) {
        return res.status(409).json({ success: false, message: 'User ID already exists or has a pending request.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.pendingUsers[token] = { ...req.body, expires: Date.now() + 3600000 };
    writeDB(db);
    const verificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=${token}`;
    try {
        await transporter.sendMail({
            from: `"TULA'S CONNECT" <${process.env.EMAIL_USER}>`, to: email,
            subject: "Verify Your Email Address",
            html: `<b>Welcome to TULA'S CONNECT!</b><p>Please click the following link to verify your email and complete your registration:</p><a href="${verificationLink}">${verificationLink}</a><p>This link will expire in 1 hour.</p>`
        });
        res.status(201).json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    } catch(error) {
        console.error("Failed to send verification email:", error);
        res.status(500).json({ success: false, message: "Could not send verification email. Please check server configuration."});
    }
});

app.get('/verify-email', (req, res) => {
    const { token } = req.query;
    const db = readDB();
    const userData = db.pendingUsers[token];
    let message = "Invalid or expired verification link.";
    if(userData && userData.expires > Date.now()){
        db.signupRequests.push(userData);
        delete db.pendingUsers[token];
        writeDB(db);
        message = "Email verified successfully! Your account is now pending admin approval.";
    }
    res.redirect(`/?message=${encodeURIComponent(message)}`);
});

app.get('/profile/:userId', (req, res) => {
    const user = readDB().users[req.params.userId];
    if (user) {
        const { pass, ...userProfile } = user;
        res.json({ success: true, profile: { ...userProfile, id: req.params.userId } });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

app.post('/profile/update', upload.single('photoFile'), (req, res) => {
    const db = readDB();
    const { userId, name, email, phone, bloodGroup } = req.body;
    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.bloodGroup = bloodGroup || user.bloodGroup;
    if (req.file) user.photoUrl = `/uploads/profile/${req.file.filename}`;
    writeDB(db);
    const { pass, ...updatedUser } = user;
    res.json({ success: true, message: 'Profile updated!', updatedUser: {...updatedUser, id: userId} });
});


// --- EXISTING MODULES (UNCHANGED) ---
app.get('/users', (req, res) => { /* ... */ });
app.delete('/users/:userId', (req, res) => { /* ... */ });
app.get('/assignments', (req, res) => { /* ... */ });
app.post('/assignments', upload.single('assignmentFile'), (req, res) => { /* ... */ });
app.get('/leave-requests', (req, res) => { /* ... */ });
app.post('/leave-requests', (req, res) => { /* ... */ });
app.post('/resolve-leave-request', (req, res) => { /* ... */ });
app.get('/signup-requests', (req, res) => { /* ... */ });
app.post('/resolve-signup', (req, res) => { /* ... */ });
app.get('/announcements', (req, res) => { /* ... */ });
app.post('/announcements', (req, res) => { /* ... */ });
app.get('/analytics/:userId', (req, res) => { /* ... */ });
app.get('/attendance/:userId', (req, res) => { /* ... */ });
app.get('/fees/:userId', (req, res) => { /* ... */ });
app.get('/timetable/student/:userId', (req, res) => { /* ... */ });
app.post('/id-card-request', (req, res) => { /* ... */ });
app.get('/id-card-requests', (req, res) => { /* ... */ });
// NOTE: The actual code for the routes above is omitted for brevity but is assumed to be present and unchanged.


// --- NEW: PLACEMENT ROUTES ---

// GET Placements for a specific student (filtered by their department and course)
app.get('/placements/student/:userId', (req, res) => {
    const db = readDB();
    const student = db.users[req.params.userId];
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });

    const relevantPlacements = (db.placements || []).filter(p =>
        p.targetDepartment === student.department && p.targetCourse === student.course
    ).sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

    res.json({ success: true, placements: relevantPlacements });
});

// GET all Placements (for Admin view)
app.get('/placements/admin', (req, res) => {
    const db = readDB();
    const allPlacements = (db.placements || []).sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
    res.json({ success: true, placements: allPlacements });
});

// GET Placements for a specific faculty/HOD (filtered by their department)
app.get('/placements/faculty/:userId', (req, res) => {
    const db = readDB();
    const faculty = db.users[req.params.userId];
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found." });

    const relevantPlacements = (db.placements || []).filter(p =>
        p.targetDepartment === faculty.department
    ).sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

    res.json({ success: true, placements: relevantPlacements });
});


// POST a new Placement opportunity (Admin only)
app.post('/placements', (req, res) => {
    const { companyName, jobTitle, description, targetDepartment, targetCourse } = req.body;
    if (!companyName || !jobTitle || !description || !targetDepartment || !targetCourse) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const db = readDB();
    const newPlacement = {
        id: `PLC-${Date.now()}`,
        companyName,
        jobTitle,
        description,
        targetDepartment,
        targetCourse,
        postedDate: new Date().toISOString(),
        applications: []
    };
    db.placements.push(newPlacement);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Placement opportunity posted successfully.' });
});

// POST an application for a placement (Student only, with resume upload)
app.post('/placements/:id/apply', upload.single('resumeFile'), (req, res) => {
    const { id } = req.params;
    const { studentId, studentName } = req.body;

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Resume file is required.' });
    }

    const db = readDB();
    const placement = db.placements.find(p => p.id === id);
    if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found.' });
    }

    // Check if student has already applied
    if (placement.applications.some(app => app.studentId === studentId)) {
        return res.status(409).json({ success: false, message: 'You have already applied for this position.' });
    }

    const newApplication = {
        studentId,
        studentName,
        resumePath: `/uploads/resumes/${req.file.filename}`,
        appliedDate: new Date().toISOString()
    };

    placement.applications.push(newApplication);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Application submitted successfully!' });
});


// Fallback for client-side routing - must be last
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});

