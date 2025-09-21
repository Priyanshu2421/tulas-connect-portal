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
const SUBMISSIONS_DIR = path.join(UPLOADS_DIR, 'submissions');
const ASSIGNMENTS_DIR = path.join(UPLOADS_DIR, 'assignments');
const IDCARD_PICS_DIR = path.join(UPLOADS_DIR, 'idcards');

// --- Email Configuration for Live Server ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// --- INITIALIZE SERVER ---
const initializeServer = () => {
    try {
        if (!fs.existsSync(path.join(__dirname, 'public'))) {
            fs.mkdirSync(path.join(__dirname, 'public'));
        }
        [UPLOADS_DIR, PROFILE_PICS_DIR, SUBMISSIONS_DIR, ASSIGNMENTS_DIR, IDCARD_PICS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        if (!fs.existsSync(DB_PATH)) {
            console.log("db.json not found, creating a new default database.");
            const defaultDB = {
                users: {}, pendingUsers: {}, passwordResets: {}, idCardRequests: [],
                signupRequests: [], passwordRequests: [], announcements: [],
                attendanceRecords: [], assignments: [], submissions: [], marks: {},
                historicalPerformance: [], fees: {}, studentTimetables: {},
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

// --- AUTHENTICATION & PROFILE ROUTES (Unchanged) ---
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
    if (db.users[userId] || db.signupRequests.some(r => r.userId === userId) || db.pendingUsers[userId]) {
        return res.status(409).json({ success: false, message: 'User ID already exists or has a pending request.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.pendingUsers[token] = { ...req.body, expires: Date.now() + 3600000 };
    writeDB(db);
    const verificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=${token}`;
    try {
        await transporter.sendMail({
            from: `"TULA'S CONNECT" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email Address",
            html: `<b>Welcome to TULA'S CONNECT!</b><p>Please click the following link to verify your email and complete your registration:</p><a href="${verificationLink}">${verificationLink}</a><p>This link will expire in 1 hour.</p>`
        });
        console.log("Verification email sent successfully to:", email);
        res.status(201).json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    } catch(error) {
        console.error("Failed to send verification email:", error);
        res.status(500).json({ success: false, message: "Could not send verification email."});
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

app.post('/forgot-password', async (req, res) => {
    const { userId } = req.body;
    const db = readDB();
    const user = db.users[userId];
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    db.passwordResets[resetToken] = { userId, expires: Date.now() + 3600000 };
    writeDB(db);
    const resetLink = `${req.protocol}://${req.get('host')}/?reset_token=${resetToken}`;
    try {
        await transporter.sendMail({
            from: `"TULA'S CONNECT" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Password Reset Request",
            html: `<b>Hello!</b><p>You requested a password reset. Please click the following link to reset your password:</p><a href="${resetLink}">${resetLink}</a><p>If you did not request this, please ignore this email.</p>`
        });
        res.json({ success: true, message: 'Password reset link sent to your email.' });
    } catch (error) {
        console.error("Failed to send password reset email:", error);
        res.status(500).json({ success: false, message: 'Failed to send password reset email.' });
    }
});

app.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    const db = readDB();
    const resetData = db.passwordResets[token];
    if (!resetData || resetData.expires < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }
    const user = db.users[resetData.userId];
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }
    user.pass = newPassword;
    delete db.passwordResets[token];
    writeDB(db);
    res.json({ success: true, message: 'Password has been reset successfully.' });
});

app.post('/profile/update', upload.single('photoFile'), (req, res) => {
    const db = readDB();
    const { userId, name, email, phone, bloodGroup, address, dob, batch, program } = req.body;
    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updatedUser = {
        ...user,
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        bloodGroup: bloodGroup || user.bloodGroup,
        address: address || user.address,
        dob: dob || user.dob,
        batch: batch || user.batch,
        program: program || user.program,
        photoUrl: req.file ? `/uploads/profile/${req.file.filename}` : user.photoUrl
    };

    db.users[userId] = updatedUser;
    writeDB(db);
    res.json({ success: true, updatedUser, message: 'Profile updated successfully.' });
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

// --- NEW: USER MANAGEMENT ROUTES (FOR ADMIN) ---
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

// --- NEW: ASSIGNMENT ROUTES (FOR FACULTY & STUDENTS) ---
app.get('/assignments', (req, res) => {
    const db = readDB();
    res.json({ success: true, assignments: db.assignments || [] });
});

app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const { title, description, dueDate, authorName, authorId } = req.body;
    const db = readDB();
    const newAssignment = {
        id: Date.now(),
        title,
        description,
        dueDate,
        authorName,
        authorId,
        filePath: req.file ? `/uploads/assignments/${req.file.filename}` : null
    };
    if (!db.assignments) db.assignments = [];
    db.assignments.push(newAssignment);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Assignment created.', assignment: newAssignment });
});

// --- NEW: LEAVE REQUEST ROUTES (FOR STUDENTS & FACULTY) ---
app.get('/leave-requests', (req, res) => {
    const db = readDB();
    res.json({ success: true, leaveRequests: db.leaveRequests || [] });
});

app.post('/leave-requests', (req, res) => {
    const { studentId, studentName, reason, startDate, endDate } = req.body;
    const db = readDB();
    const newRequest = {
        id: Date.now(),
        studentId,
        studentName,
        reason,
        startDate,
        endDate,
        status: 'Pending' // Initial status
    };
    if (!db.leaveRequests) db.leaveRequests = [];
    db.leaveRequests.push(newRequest);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Leave request submitted.' });
});

app.post('/resolve-leave-request', (req, res) => {
    const { id, status } = req.body; // status will be 'Approved' or 'Rejected'
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
        db.users[request.userId] = {
            pass: request.pass, name: request.name, role: request.role, email: request.email,
            department: request.department || "", course: request.course || "", phone: "",
            bloodGroup: "", address: "", dob: "", photoUrl: "", batch: "", program: ""
        };
    }
    db.signupRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request ${action}d.` });
});

// --- NEW: PASSWORD REQUEST ROUTES ---
app.get('/password-requests', (req, res) => {
    const db = readDB();
    res.json(db.passwordRequests || []);
});

app.post('/password-requests', (req, res) => {
    const { userId, reason } = req.body;
    const db = readDB();
    const newRequest = {
        id: Date.now(),
        userId,
        reason,
        timestamp: Date.now(),
        status: 'Pending'
    };
    if (!db.passwordRequests) db.passwordRequests = [];
    db.passwordRequests.push(newRequest);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Password reset request submitted. An admin will contact you.' });
});

app.post('/resolve-password-request', async (req, res) => {
    const { id, action } = req.body;
    const db = readDB();
    const request = (db.passwordRequests || []).find(r => r.id == id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (action === 'reset') {
        const user = db.users[request.userId];
        if (!user) return res.status(404).json({ success: false, message: 'User not found for this request.' });

        const newPassword = crypto.randomBytes(8).toString('hex');
        user.pass = newPassword;
        request.status = 'Resolved';
        writeDB(db);

        try {
            await transporter.sendMail({
                from: `"TULA'S CONNECT" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "Your New Password",
                html: `<b>Hello ${user.name},</b><p>Your password has been reset by an administrator. Your new password is: <strong>${newPassword}</strong></p><p>Please log in and change your password immediately.</p>`
            });
            res.json({ success: true, message: 'New password sent to user email.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to send new password via email. Password has been reset in the database.' });
        }
    }
});


// --- ANNOUNCEMENT ROUTES (Unchanged) ---
app.get('/announcements', (req, res) => {
    const db = readDB();
    const sortedAnnouncements = (db.announcements || []).sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, announcements: sortedAnnouncements });
});

app.post('/announcements', (req, res) => {
    const { title, content, authorName, authorRole, department } = req.body;
    if (!title || !content || !authorName || !authorRole) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    const db = readDB();
    const newAnnouncement = {
        id: Date.now(), timestamp: Date.now(), title, content,
        authorName, authorRole, department: department || 'Global'
    };
    if (!db.announcements) db.announcements = [];
    db.announcements.push(newAnnouncement);
    writeDB(db);
    res.status(201).json({ success: true, message: 'Announcement posted.', announcement: newAnnouncement });
});


// Fallback for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});