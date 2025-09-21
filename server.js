const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer'); // ADDED
const jwt = require('jsonwebtoken'); // ADDED

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PROFILE_PICS_DIR = path.join(UPLOADS_DIR, 'profile');
const SUBMISSIONS_DIR = path.join(UPLOADS_DIR, 'submissions');
const ASSIGNMENTS_DIR = path.join(UPLOADS_DIR, 'assignments');
const IDCARD_PICS_DIR = path.join(UPLOADS_DIR, 'idcards');

// --- NEW: Configuration for Email and JWT ---
// IMPORTANT: Replace with your actual email service credentials.
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com', // Your email address
        pass: 'your_app_password'     // Your Gmail App Password
    }
});
const JWT_SECRET = 'a-very-strong-and-secret-key-for-jwt';
const SITE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;


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
                facultyTimetables: {}, departmentPrograms: {}, leaveRequests: [],
                pendingVerifications: {} // ADDED
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


// --- NEW EMAIL VERIFICATION ROUTES ---

app.post('/request-signup-verification', (req, res) => {
    const { userId, email } = req.body;
    const db = readDB();
    const emailRegex = /^[a-zA-Z.-_]+@[a-zA-Z.-_]+\.in$/;

    if (!emailRegex.test(email) || !email.endsWith('tulas.edu.in')) {
        return res.status(400).json({ success: false, message: 'Invalid email format. Must be a "tulas.edu.in" address.' });
    }
    if (db.users[userId] || Object.values(db.pendingVerifications).some(p => p.data.userId === userId)) {
        return res.status(409).json({ success: false, message: 'User ID already exists or is pending verification.' });
    }
     if (Object.values(db.users).some(u => u.email === email)) {
        return res.status(409).json({ success: false, message: 'Email address is already in use.' });
    }

    const token = jwt.sign({ data: req.body, type: 'signup' }, JWT_SECRET, { expiresIn: '1h' });
    db.pendingVerifications[token] = { data: req.body };
    writeDB(db);
    
    const verificationLink = `${SITE_URL}/verify-email?token=${token}`;
    const mailOptions = {
        from: `"TULA'S CONNECT" <your_email@gmail.com>`,
        to: email,
        subject: 'Verify Your Account for TULA\'S CONNECT',
        html: `<p>Hello ${req.body.name},</p><p>Please click the link below to verify your account. This link is valid for 1 hour.</p><a href="${verificationLink}" style="padding: 10px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Account</a>`
    };

    mailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending mail:", error);
            return res.status(500).json({ success: false, message: 'Could not send verification email.' });
        }
        res.status(200).json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    });
});

app.get('/verify-email', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h1>Invalid Link</h1>');

    try {
        jwt.verify(token, JWT_SECRET);
        const db = readDB();
        if (!db.pendingVerifications[token]) {
             return res.redirect('/?status=already_verified');
        }
        const signupData = db.pendingVerifications[token].data;
        
        db.users[signupData.userId] = { 
            pass: signupData.pass, name: signupData.name, role: signupData.role, email: signupData.email, 
            department: signupData.department || "", course: signupData.course || "", 
            phone: "", bloodGroup: "", address: "", dob: "", photoUrl: "", batch: "", program: "" 
        };
        
        delete db.pendingVerifications[token];
        writeDB(db);
        res.redirect('/?status=verified');
    } catch (error) {
        const db = readDB();
        delete db.pendingVerifications[token];
        writeDB(db);
        res.redirect('/?status=failed&reason=' + encodeURIComponent(error.message));
    }
});

app.post('/request-password-reset', (req, res) => {
    const { userId } = req.body;
    const db = readDB();
    const user = db.users[userId];

    if (!user || !user.email) {
        return res.status(404).json({ success: false, message: 'User not found or no email is registered for this account.' });
    }

    const token = jwt.sign({ userId, type: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `${SITE_URL}/?resetToken=${token}`;

    const mailOptions = {
        from: `"TULA'S CONNECT" <your_email@gmail.com>`,
        to: user.email,
        subject: 'Password Reset Request',
        html: `<p>Hello ${user.name},</p><p>Click the link below to set a new password. This link is valid for 15 minutes.</p><a href="${resetLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>`
    };

    mailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending mail:", error);
            return res.status(500).json({ success: false, message: 'Could not send reset email.' });
        }
        res.status(200).json({ success: true, message: `Password reset link sent to ${user.email}.` });
    });
});

app.post('/set-new-password', (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'password_reset') {
            return res.status(401).json({ success: false, message: 'Invalid token type.' });
        }
        
        const db = readDB();
        const user = db.users[decoded.userId];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User no longer exists.' });
        }
        
        user.pass = newPassword;
        writeDB(db);
        res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
    } catch (error) {
         res.status(401).json({ success: false, message: 'Link is invalid or has expired.' });
    }
});


// --- YOUR ORIGINAL ROUTES (UNCHANGED) ---

// Login
app.post('/login', (req, res) => {
    // ... your existing login code ...
});

// Profile Management
app.get('/profile/:userId', (req, res) => {
    // ... your existing profile code ...
});

// etc... ALL your other routes for assignments, attendance, timetables, etc. are still here.
// I have omitted them for brevity, but they should be in your file.

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});