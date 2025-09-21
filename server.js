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

// --- IMPORTANT: Email Configuration ---
// For production, use environment variables. For testing, you can use a service like Ethereal.
// Example for Gmail (less secure, requires "Less secure app access"):
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'YOUR_GMAIL_ADDRESS',
//         pass: 'YOUR_GMAIL_APP_PASSWORD' 
//     }
// });
// For testing with Ethereal (recommended for development):
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    console.log('Credentials obtained, creating transport...');
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
});


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname))); // Serve index.html from root


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


// --- AUTHENTICATION ROUTES ---

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
    db.pendingUsers[token] = { ...req.body, expires: Date.now() + 3600000 }; // 1 hour expiry
    writeDB(db);

    const verificationLink = `http://localhost:${PORT}/verify-email?token=${token}`;
    
    try {
        const info = await transporter.sendMail({
            from: '"TULA\'S CONNECT" <no-reply@tulas.edu>',
            to: email,
            subject: "Verify Your Email Address",
            html: `<b>Welcome to TULA'S CONNECT!</b><p>Please click the following link to verify your email and complete your registration:</p><a href="${verificationLink}">${verificationLink}</a><p>This link will expire in 1 hour.</p>`
        });
        console.log("Verification email sent. Preview URL: %s", nodemailer.getTestMessageUrl(info));
        res.status(201).json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    } catch(error) {
        console.error("Failed to send verification email:", error);
        res.status(500).json({ success: false, message: "Could not send verification email. Please try again later."});
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

    if (!user) return res.status(404).json({ success: false, message: 'User ID not found.' });

    const token = crypto.randomBytes(32).toString('hex');
    db.passwordResets[token] = { userId, expires: Date.now() + 3600000 }; // 1 hour
    writeDB(db);

    const resetLink = `http://localhost:${PORT}/?reset_token=${token}`;

    try {
        const info = await transporter.sendMail({
            from: '"TULA\'S CONNECT" <no-reply@tulas.edu>',
            to: user.email,
            subject: "Password Reset Request",
            html: `<b>Password Reset</b><p>Click the link to reset your password:</p><a href="${resetLink}">${resetLink}</a><p>This link expires in 1 hour.</p>`
        });
        console.log("Password reset email sent. Preview URL: %s", nodemailer.getTestMessageUrl(info));
        res.json({ success: true, message: 'Password reset link sent to your email.' });
    } catch (error) {
        console.error("Failed to send reset email:", error);
        res.status(500).json({ success: false, message: "Could not send reset email."});
    }
});

app.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    const db = readDB();
    const resetData = db.passwordResets[token];

    if (!resetData || resetData.expires < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const { userId } = resetData;
    if (db.users[userId]) {
        db.users[userId].pass = newPassword;
        delete db.passwordResets[token];
        writeDB(db);
        res.json({ success: true, message: 'Password has been reset successfully.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});


// --- PROFILE & USER MANAGEMENT ---
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
    const { userId } = req.body;
    const db = readDB();
    if (db.users[userId]) {
        Object.keys(req.body).forEach(key => {
            if (key !== 'userId' && db.users[userId].hasOwnProperty(key)) {
                db.users[userId][key] = req.body[key];
            }
        });
        if (req.file) {
            db.users[userId].photoUrl = `/uploads/profile/${req.file.filename}`;
        }
        writeDB(db);
        const { pass, ...updatedUser } = db.users[userId];
        res.json({ success: true, updatedUser: { ...updatedUser, id: userId } });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

app.get('/users', (req, res) => {
    const db = readDB();
    let usersArray = Object.keys(db.users).map(id => {
        const { pass, ...user } = db.users[id];
        return { ...user, id };
    });
    if (req.query.role) usersArray = usersArray.filter(user => user.role === req.query.role);
    if (req.query.department) usersArray = usersArray.filter(user => user.department === req.query.department);
    res.json({ success: true, users: usersArray });
});

app.delete('/users/:userId', (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    if (db.users[userId]) {
        delete db.users[userId];
        writeDB(db);
        res.json({ success: true, message: 'User deleted.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

// --- ADMIN REQUESTS (Signup, Password) ---
app.get('/signup-requests', (req, res) => res.json(readDB().signupRequests));

app.post('/resolve-signup', (req, res) => {
    const { userId, action } = req.body;
    const db = readDB();
    const requestIndex = db.signupRequests.findIndex(r => r.userId === userId);
    if (requestIndex === -1) return res.status(404).json({ success: false, message: 'Request not found.' });
    
    if (action === 'approve') {
        const request = db.signupRequests[requestIndex];
        db.users[request.userId] = { 
            pass: request.pass, name: request.name, role: request.role, email: request.email, 
            department: request.department || "", course: request.course || "", 
            phone: "", bloodGroup: "", address: "", dob: "", photoUrl: "", batch: "", program: "" 
        };
    }
    
    db.signupRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request ${action}d.` });
});

app.get('/password-requests', (req, res) => res.json(readDB().passwordRequests));

app.post('/resolve-password-request', (req, res) => {
    const { userId, action } = req.body;
    const db = readDB();
    const requestIndex = db.passwordRequests.findIndex(r => r.userId === userId);
    if (requestIndex === -1) return res.status(404).json({ success: false, message: 'Request not found.' });
    const request = db.passwordRequests[requestIndex];
    if (action === 'approve' && db.users[userId]) {
        db.users[userId].pass = request.newPass;
    }
    db.passwordRequests.splice(requestIndex, 1);
    writeDB(db);
    res.json({ success: true, message: `Request for ${request.userName} has been ${action}d.` });
});


// ... Other routes (assignments, submissions, etc.) remain the same ...

// Fallback route for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});
