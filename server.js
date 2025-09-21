const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer'); // Added for sending emails
const jwt = require('jsonwebtoken'); // Added for secure tokens

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PROFILE_PICS_DIR = path.join(UPLOADS_DIR, 'profile');
const SUBMISSIONS_DIR = path.join(UPLOADS_DIR, 'submissions');
const ASSIGNMENTS_DIR = path.join(UPLOADS_DIR, 'assignments');
const IDCARD_PICS_DIR = path.join(UPLOADS_DIR, 'idcards');

// --- NEW: Configuration for Email and JWT ---
// IMPORTANT: Replace with your actual email service credentials in a real environment
// For testing, you can use a service like Ethereal.email
const mailTransporter = nodemailer.createTransport({
    service: 'gmail', // e.g., 'gmail'
    auth: {
        user: 'your_email@gmail.com', // Your email address
        pass: 'your_app_password'     // Your email app-specific password
    }
});
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-a-env-file';
const SITE_URL = `http://localhost:${PORT}`;


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
                pendingVerifications: {} // NEW: For storing pending email verifications
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

// --- MULTER SETUP (Unchanged) ---
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

// 1. Handle new signup requests via email
app.post('/request-signup-verification', (req, res) => {
    const { userId, email } = req.body;
    const db = readDB();

    // Validate email format
    const emailRegex = /^[a-zA-Z]+\.\d+@tulas\.edu\.in$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format. Must be like "name.userid@tulas.edu.in".' });
    }

    // Check if user or email is already taken or pending
    if (db.users[userId]) {
        return res.status(409).json({ success: false, message: 'User ID already exists.' });
    }
    if (Object.values(db.users).some(u => u.email === email)) {
        return res.status(409).json({ success: false, message: 'Email address is already in use.' });
    }
     if (Object.values(db.pendingVerifications).some(p => p.data.userId === userId || p.data.email === email)) {
        return res.status(409).json({ success: false, message: 'A verification for this User ID or email is already pending.' });
    }

    // Generate token and verification link
    const token = jwt.sign({ data: req.body, type: 'signup' }, JWT_SECRET, { expiresIn: '1h' });
    db.pendingVerifications[token] = { data: req.body };
    writeDB(db);
    
    const verificationLink = `${SITE_URL}/verify-email?token=${token}`;

    const mailOptions = {
        from: '"TULA\'S CONNECT" <your_email@gmail.com>',
        to: email,
        subject: 'Verify Your Account for TULA\'S CONNECT',
        html: `
            <p>Hello ${req.body.name},</p>
            <p>Thank you for signing up. Please click the link below to verify your account. This link is valid for 1 hour.</p>
            <a href="${verificationLink}" style="padding: 10px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Account</a>
            <p>If you did not request this, please ignore this email.</p>
        `
    };

    mailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending mail:", error);
            return res.status(500).json({ success: false, message: 'Could not send verification email.' });
        }
        res.status(200).json({ success: true, message: 'Verification email sent successfully! Please check your inbox.' });
    });
});

// 2. Endpoint hit when user clicks verification link
app.get('/verify-email', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h1>Invalid Verification Link</h1>');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = readDB();

        if (!db.pendingVerifications[token]) {
             return res.redirect('/?status=already_verified');
        }

        const signupData = db.pendingVerifications[token].data;
        
        // Create user
        db.users[signupData.userId] = { 
            pass: signupData.pass, name: signupData.name, role: signupData.role, email: signupData.email, 
            department: signupData.department || "", course: signupData.course || "", 
            phone: "", bloodGroup: "", address: "", dob: "", photoUrl: "", batch: "", program: "" 
        };
        
        // Clean up
        delete db.pendingVerifications[token];
        writeDB(db);

        // Redirect to login page with a success message
        res.redirect('/?status=verified');

    } catch (error) {
        // If token is expired or invalid
        const db = readDB();
        delete db.pendingVerifications[token]; // Clean up failed token
        writeDB(db);
        res.redirect('/?status=failed&reason=' + encodeURIComponent(error.message));
    }
});


// 3. Handle 'forgot password' requests via email
app.post('/request-password-reset', (req, res) => {
    const { userId } = req.body;
    const db = readDB();
    const user = db.users[userId];

    if (!user || !user.email) {
        return res.status(404).json({ success: false, message: 'User not found or no email is registered for this account.' });
    }

    const token = jwt.sign({ userId, type: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `${SITE_URL}/?resetToken=${token}`; // Send token to frontend client

    const mailOptions = {
        from: '"TULA\'S CONNECT" <your_email@gmail.com>',
        to: user.email,
        subject: 'Password Reset Request for TULA\'S CONNECT',
        html: `
            <p>Hello ${user.name},</p>
            <p>We received a request to reset your password. Click the link below to set a new one. This link is valid for 15 minutes.</p>
            <a href="${resetLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
        `
    };

    mailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending mail:", error);
            return res.status(500).json({ success: false, message: 'Could not send reset email.' });
        }
        res.status(200).json({ success: true, message: `Password reset link sent to ${user.email}. Please check your inbox.` });
    });
});

// 4. Update the password with a valid token
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
            return res.status(404).json({ success: false, message: 'User associated with this token no longer exists.' });
        }
        
        user.pass = newPassword;
        writeDB(db);

        res.json({ success: true, message: 'Password has been updated successfully. You can now log in.' });

    } catch (error) {
         res.status(401).json({ success: false, message: 'Your password reset link is invalid or has expired.' });
    }
});



// --- OLD ROUTES (Unchanged) ---

// Login (Unchanged)
app.post('/login', (req, res) => {
    // ... existing code ...
});

// Profile Management (Unchanged)
app.get('/profile/:userId', (req, res) => {
    // ... existing code ...
});
app.post('/profile/update', upload.single('photoFile'), (req, res) => {
    // ... existing code ...
});
app.get('/users', (req, res) => {
    // ... existing code ...
});
app.delete('/users/:userId', (req, res) => {
    // ... existing code ...
});

// Old Signup & Password Requests (kept for reference, but frontend will not call them)
app.post('/signup', (req, res) => { /* ... existing code ... */ });
app.get('/signup-requests', (req, res) => res.json(readDB().signupRequests));
app.post('/resolve-signup', (req, res) => { /* ... existing code ... */ });
app.post('/forgot-password', (req, res) => { /* ... existing code ... */ });
app.get('/password-requests', (req, res) => res.json(readDB().passwordRequests));
app.post('/resolve-password-request', (req, res) => { /* ... existing code ... */ });

// --- ASSIGNMENTS & SUBMISSIONS (Unchanged) ---
app.post('/assignments', upload.single('assignmentFile'), (req, res) => { /* ... existing code ... */ });
app.get('/assignments', (req, res) => res.json(readDB().assignments));
app.post('/submissions', upload.single('submissionFile'), (req, res) => { /* ... existing code ... */ });
app.get('/submissions/student/:studentId', (req, res) => res.json(readDB().submissions.filter(s => s.studentId === req.params.studentId)));
app.get('/submissions', (req, res) => res.json(readDB().submissions));
app.post('/submissions/resolve', (req, res) => { /* ... existing code ... */ });

// --- STUDENT-SPECIFIC INFO (Unchanged) ---
app.get('/analytics/:studentId', (req, res) => { /* ... existing code ... */ });
app.get('/fees/:userId', (req, res) => res.json(readDB().fees[req.params.userId] || { fees: {}, transport: {} }));
app.get('/attendance/student/:studentId', (req, res) => res.json(readDB().attendanceRecords.filter(a => a.studentId === req.params.studentId)));

// --- TIMETABLES (Unchanged) ---
app.get('/timetable/student/:userId', (req, res) => { /* ... existing code ... */ });
app.get('/timetable/faculty/:facultyId', (req, res) => { /* ... existing code ... */ });
app.get('/timetables', (req, res) => { /* ... existing code ... */ });
app.post('/timetables/student/:batch', (req, res) => { /* ... existing code ... */ });
app.post('/timetables/faculty/:facultyId', (req, res) => { /* ... existing code ... */ });

// --- ATTENDANCE & MARKS (FACULTY) (Unchanged) ---
app.post('/attendance', (req, res) => { /* ... existing code ... */ });
app.post('/marks', (req, res) => { /* ... existing code ... */ });

// --- ID CARD REQUESTS (Unchanged) ---
app.post('/id-card-request', upload.single('idCardPhoto'), (req, res) => { /* ... existing code ... */ });
app.get('/id-card-status/:userId', (req, res) => { /* ... existing code ... */ });
app.get('/id-card-requests', (req, res) => res.json(readDB().idCardRequests));
app.post('/resolve-id-card-request', (req, res) => { /* ... existing code ... */ });

// --- LEAVE REQUESTS (Unchanged) ---
app.post('/leave-requests', (req, res) => { /* ... existing code ... */ });
app.get('/leave-requests/student/:studentId', (req, res) => { /* ... existing code ... */ });
app.get('/leave-requests', (req, res) => { /* ... existing code ... */ });
app.post('/leave-requests/resolve', (req, res) => { /* ... existing code ... */ });

// --- ADMIN & HOD (Unchanged) ---
app.get('/announcements', (req, res) => res.json(readDB().announcements));
app.get('/announcements/feed', (req, res) => { /* ... existing code ... */ });
app.post('/announcements', (req, res) => { /* ... existing code ... */ });
app.delete('/announcements/:id', (req, res) => { /* ... existing code ... */ });
app.get('/hod/dashboard/:department', (req, res) => { /* ... existing code ... */ });

// --- MISC (Unchanged) ---
app.get('/historical-data', (req, res) => res.json({ success: true, historicalData: readDB().historicalPerformance }));


// Fallback route (Unchanged)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SERVER START (Unchanged) ---
app.listen(PORT, () => {
    console.log(`TULA'S CONNECT server is running on port ${PORT}`);
});