const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- PATHS ---
const DATA_DIR = path.join(__dirname, 'data'); // Use a dedicated data directory
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files (uploaded images, resumes)
app.use('/uploads', express.static(UPLOADS_DIR));
// Serve the frontend (index.html)
app.use(express.static(__dirname));

// --- INITIALIZATION (Run on server start) ---
function initialize() {
    // 1. Create necessary directories
    [DATA_DIR, PUBLIC_DIR, UPLOADS_DIR, path.join(UPLOADS_DIR, 'profiles'), path.join(UPLOADS_DIR, 'resumes')].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // 2. Create db.json with INITIAL DATA if it doesn't exist
    if (!fs.existsSync(DB_PATH)) {
        console.log("Creating fresh db.json with default users...");
        const initialData = {
            users: {
                "admin": { id: "admin", pass: "admin123", name: "Super Admin", role: "Admin", email: "admin@tulas.in", phone: "9999999999" },
                // STUDENT
                "2024001": { 
                    id: "2024001", pass: "pass123", name: "Rahul Student", role: "Student", 
                    department: "Department of Computer Applications", course: "Bachelor of Computer Applications (BCA)",
                    email: "rahul@student.tulas.in", phone: "9876543210"
                },
                // FACULTY
                "FAC001": {
                    id: "FAC001", pass: "pass123", name: "Dr. Sharma", role: "Faculty",
                    department: "Department of Computer Applications", email: "sharma@tulas.in", phone: "8888888888"
                },
                 // HOD - Computer Applications
                "HOD_CA": {
                    id: "HOD_CA", pass: "pass123", name: "Prof. Verma (HOD)", role: "HOD",
                    department: "Department of Computer Applications", email: "hod.ca@tulas.in"
                },
                // HOD - CSE Engineering
                "HOD_CSE": {
                    id: "HOD_CSE", pass: "pass123", name: "Dr. Singh (HOD CSE)", role: "HOD",
                    department: "Department of Computer Science & Engineering", email: "hod.cse@tulas.in"
                }
            },
            placements: [
                // Sample Placement Data
                {
                    id: 101, companyName: "Wipro", jobTitle: "Project Engineer", 
                    jobDescription: "Entry level software role.", department: "Department of Computer Applications",
                    course: "Bachelor of Computer Applications (BCA)", postedOn: Date.now(), applications: []
                }
            ],
            announcements: []
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    }
}
initialize();

// --- DATABASE HELPERS ---
const readDB = () => {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } 
    catch (e) { return { users: {}, placements: [] }; } // Fallback if file is corrupted
};
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- MULTER CONFIG (File Uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'photoFile') cb(null, path.join(UPLOADS_DIR, 'profiles'));
        else if (file.fieldname === 'resume') cb(null, path.join(UPLOADS_DIR, 'resumes'));
        else cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});
const upload = multer({ storage });

// =========================================
// API ROUTES
// =========================================

// 1. LOGIN
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    console.log(`Login attempt: ${userId} as ${role} (${department || 'N/A'})`);
    
    const db = readDB();
    const user = db.users[userId];

    if (!user) return res.status(404).json({ success: false, message: "User ID not found." });
    if (user.pass !== password) return res.status(401).json({ success: false, message: "Incorrect password." });
    
    // Role Validation
    if (user.role !== role) {
        return res.status(403).json({ success: false, message: `Role mismatch. This ID belongs to a ${user.role}.` });
    }

    // HOD Department Validation
    if (role === 'HOD' && user.department !== department) {
         return res.status(403).json({ success: false, message: `Access denied for this department. You are HOD of ${user.department}.` });
    }

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// 2. GET PROFILE
app.get('/profile/:userId', (req, res) => {
    const db = readDB();
    const user = db.users[req.params.userId];
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const { pass, ...safeUser } = user;
    res.json({ success: true, profile: safeUser });
});

// 3. PLACEMENTS (GET & POST)
app.get('/placements', (req, res) => {
    const db = readDB();
    let results = db.placements || [];
    // Optional Filtering
    if (req.query.department) {
        results = results.filter(p => p.department === req.query.department);
    }
    // Sort newest first
    results.sort((a, b) => b.postedOn - a.postedOn);
    res.json({ success: true, placements: results });
});

app.post('/placements', (req, res) => {
    // Basic validation would go here
    const db = readDB();
    const newPlacement = {
        id: Date.now(),
        ...req.body,
        postedOn: Date.now(),
        applications: []
    };
    db.placements = db.placements || [];
    db.placements.push(newPlacement);
    writeDB(db);
    res.json({ success: true, message: "Placement posted" });
});

// 4. SIGNUP (Simplified - Auto-active for demo)
app.post('/signup', (req, res) => {
    const { userId, pass, name, role, department, email } = req.body;
    const db = readDB();
    
    if (db.users[userId]) {
        return res.status(409).json({ success: false, message: "User ID already exists." });
    }

    db.users[userId] = {
        id: userId, pass, name, role, department, email,
        phone: "", photoUrl: ""
    };
    writeDB(db);
    res.json({ success: true, message: "Account created! You can login now." });
});

// FALLBACK ROUTE (For SPA client-side routing if needed, or just serving index.html)
app.get('*', (req, res) => {
    // If the request is for an API endpoint that doesn't exist, return 404
    if (req.path.startsWith('/api/')) {
         return res.status(404).json({ success: false, message: "API endpoint not found" });
    }
    // Otherwise serve the frontend
    res.sendFile(path.join(__dirname, 'index.html'));
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Tula's Connect Server running on port ${PORT}`);
    console.log(`Ephemeral storage warning: Data resets on Render restart.`);
});