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

// --- Email Configuration (requires environment variables on server) ---
// To run locally, create a .env file with EMAIL_USER=yourgmail@gmail.com and EMAIL_PASS=yourgmailpassword
// Or replace process.env with your actual credentials for testing.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@example.com', // Replace with your email for local testing
        pass: process.env.EMAIL_PASS || 'your-password' // Replace with your password for local testing
    }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
// Serve the main index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(path.join(__dirname))); // Serve other static files like CSS if any
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'))); // Serve uploaded files

// --- INITIALIZE SERVER ---
const initializeServer = () => {
    try {
        if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'));
        [UPLOADS_DIR, PROFILE_PICS_DIR, ASSIGNMENTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
        if (!fs.existsSync(DB_PATH)) {
            console.log("db.json not found, creating a new default database.");
            const defaultDB = { users: {}, pendingUsers: {}, passwordResets: {}, idCardRequests: [], signupRequests: [], announcements: [], assignments: [], leaveRequests: {} };
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
        cb(null, destDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});
const upload = multer({ storage: storage });

// --- AUTHENTICATION & PROFILE ROUTES ---
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
        console.log("Verification email sent successfully to:", email);
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
    const db = readDB();
    const { userId, name, email, phone, bloodGroup } = req.body;
    if (!db.users[userId]) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = db.users[userId];
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.bloodGroup = bloodGroup || user.bloodGroup;
    if (req.file) {
        user.photoUrl = `/uploads/profile/${req.file.filename}`;
    }
    writeDB(db);
    const { pass, ...updatedUser } = user;
    res.json({ success: true, message: 'Profile updated!', updatedUser: {...updatedUser, id: userId} });
});


// --- USER MANAGEMENT ROUTES (ADMIN) ---
app.get('/users', (req, res) => {
    const db = readDB();
    const usersArray = Object.entries(db.users).map(([id, userData]) => {
        const { pass, ...user } = userData;
        return { id, ...user };
    });
    res.json({ success: true, users: usersArray });
});

app.delete('/users/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    if (db.users[userId]) {
        delete db.users[userId];
        writeDB(db);
        res.json({ success: true, message: 'User deleted successfully.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

// --- ASSIGNMENT ROUTES ---
app.get('/assignments', (req, res) => res.json({ success: true, assignments: readDB().assignments || [] }));
app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const { title, description, dueDate, authorName, authorId } = req.body;
    const db = readDB();
    const newAssignment = { id: Date.now(), title, description, dueDate, authorName, authorId, filePath: req.file ? `/uploads/assignments/${req.file.filename}` : null };
    db.assignments.push(newAssignment);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Assignment created.', assignment: newAssignment });
});

// --- LEAVE REQUEST ROUTES ---
app.get('/leave-requests', (req, res) => res.json({ success: true, leaveRequests: readDB().leaveRequests || [] }));
app.post('/leave-requests', (req, res) => {
    const { studentId, studentName, reason, startDate, endDate } = req.body;
    const db = readDB();
    const newRequest = { id: Date.now(), studentId, studentName, reason, startDate, endDate, status: 'Pending' };
    db.leaveRequests.push(newRequest);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Leave request submitted.' });
});
app.post('/resolve-leave-request', (req, res) => {
    const { id, status } = req.body;
    const db = readDB();
    const request = (db.leaveRequests || []).find(r => r.id == id);
    if (request) {
        request.status = status;
        writeDB(db);
        res.json({ success: true, message: `Request has been ${status}.` });
    } else {
        res.status(404).json({ success: false, message: 'Request not found.' });
    }
});

// --- SIGNUP REQUEST ROUTES ---
app.get('/signup-requests', (req, res) => res.json(readDB().signupRequests || []));
app.post('/resolve-signup', (req, res) => {
    const { userId, action } = req.body;
    const db = readDB();
    const requestIndex = (db.signupRequests || []).findIndex(r => r.userId === userId);
    if (requestIndex === -1) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (action === 'approve') {
        const request = db.signupRequests[requestIndex];
        db.users[request.userId] = { pass: request.pass, name: request.name, role: request.role, email: request.email, department: request.department || "", course: request.course || "", phone: "", bloodGroup: "", address: "", dob: "", photoUrl: "", batch: "", program: "" };
    }
    db.signupRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request ${action}d.` });
});

// --- ANNOUNCEMENT ROUTES ---
app.get('/announcements', (req, res) => {
    const db = readDB();
    res.json({ success: true, announcements: (db.announcements || []).sort((a, b) => b.timestamp - a.timestamp) });
});
app.post('/announcements', (req, res) => {
    const { title, content, authorName, authorRole, department } = req.body;
    if (!title || !content || !authorName || !authorRole) return res.status(400).json({ success: false, message: 'Missing required fields.' });
    const db = readDB();
    const newAnnouncement = { id: Date.now(), timestamp: Date.now(), title, content, authorName, authorRole, department: department || 'Global' };
    db.announcements.push(newAnnouncement);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Announcement posted.', announcement: newAnnouncement });
});

// --- NEW DATA ENDPOINTS FOR FUNCTIONAL DASHBOARD ---
app.get('/analytics/:userId', (req, res) => {
    const db = readDB();
    const analytics = db.analytics[req.params.userId];
    if (analytics) {
        res.json({ success: true, analytics });
    } else {
        res.status(404).json({ success: false, message: 'Analytics data not found.' });
    }
});

app.get('/attendance/:userId', (req, res) => {
    const db = readDB();
    const attendance = db.attendance[req.params.userId];
    if (attendance) {
        res.json({ success: true, attendance });
    } else {
        res.status(404).json({ success: false, message: 'Attendance data not found.' });
    }
});

app.get('/fees/:userId', (req, res) => {
    const db = readDB();
    const fees = db.fees[req.params.userId];
    if (fees) {
        res.json({ success: true, fees });
    } else {
        res.status(404).json({ success: false, message: 'Fee data not found.' });
    }
});

app.get('/timetable/student/:userId', (req, res) => {
    const db = readDB();
    const user = db.users[req.params.userId];
    if (!user || !user.course) return res.status(404).json({ success: false, message: "User or course not found" });
    const timetable = db.timetables.student[user.course];
    if (timetable) {
        res.json({ success: true, timetable });
    } else {
        res.status(404).json({ success: false, message: 'Timetable not found for your course.' });
    }
});

app.post('/id-card-request', (req, res) => {
    const { userId, name } = req.body;
    const db = readDB();
    if(db.idCardRequests.some(r => r.userId === userId && r.status === 'Pending')) {
        return res.status(409).json({success: false, message: 'You already have a pending request.'});
    }
    const newRequest = { userId, name, timestamp: Date.now(), status: 'Pending' };
    db.idCardRequests.push(newRequest);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Request submitted.' });
});

app.get('/id-card-requests', (req, res) => {
    const db = readDB();
    res.json({ success: true, requests: db.idCardRequests || [] });
});

// Fallback for client-side routing - must be last
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});
