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

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname)); // Serve static files from the root (including index.html)

// --- INITIALIZATION & MOCK DATA ---

function getInitialMockDB() {
    return {
        users: {
            "admin.tulas.in": { "id": "admin.tulas.in", "pass": "admin123", "name": "Institute Administrator", "role": "Admin", "department": "Administration", "email": "admin@tulas.edu.in", "phone": "1234567890", "bloodGroup": "O+", "address": "Tula's Institute, Dehradun", "dob": "1990-01-01", "photoUrl": "" },
            "hod.cse": { "id": "hod.cse", "pass": "hod123", "name": "Prof. Head of CSE", "role": "HOD", "department": "Department of Engineering", "email": "hod.cse@tulas.edu.in", "course": "Computer Science & Engineering", "phone": "9998887770", "photoUrl": "" },
            "F101": { "id": "F101", "pass": "faculty123", "name": "Dr. Sharma", "role": "Faculty", "department": "Department of Engineering", "email": "f101@tulas.edu.in", "phone": "7776665550", "photoUrl": "" },
            "S2024001": { "id": "S2024001", "pass": "student123", "name": "Rajesh Kumar", "role": "Student", "department": "Department of Engineering", "email": "rajesh.kumar@tulas.edu.in", "course": "B.Tech CSE", "phone": "8887776660", "batchId": "BTECH-CSE-Y1-A", "mentorId": "F101", "photoUrl": "" }, 
            "S2024002": { "id": "S2024002", "pass": "student123", "name": "Priya Singh", "role": "Student", "department": "Department of Engineering", "email": "priya.singh@tulas.edu.in", "course": "B.Tech CSE", "phone": "8887776661", "batchId": "BTECH-CSE-Y1-A", "mentorId": "F101", "photoUrl": "" }
        }, 
        placements: [], 
        attendance: {}, 
        marks: {}, 
        timetables: {}, 
        assignments: {}, 
        leaveRequests: [], 
        announcements: [], 
        idCardRequests: [],
        signupRequests: [], 
        batches: {
            "BTECH-CSE-Y1-A": { 
                id: "BTECH-CSE-Y1-A", 
                name: "B.Tech CSE, 1st Year, Section A", 
                department: "Department of Engineering", 
                course: "B.Tech CSE", 
                year: "1st Year",
                students: ["S2024001", "S2024002"], 
                subjects: ["CS101", "MA101"] 
            }
        }, 
        subjects: {
            "CS101": { 
                name: "Data Structures", 
                department: "Department of Engineering", 
                teacherId: "F101", 
                batchIds: ["BTECH-CSE-Y1-A"] 
            }
        }
    };
}
function initialize() {
    [PUBLIC_DIR, UPLOADS_DIR, path.join(UPLOADS_DIR, 'profiles'), path.join(UPLOADS_DIR, 'assignments'), path.join(UPLOADS_DIR, 'submissions'), path.join(UPLOADS_DIR, 'id-cards')].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    if (!fs.existsSync(DB_PATH)) {
        console.warn("db.json not found! Initializing database with mock data.");
        writeDB(getInitialMockDB()); // Initialize only if missing
    } else {
        console.log("db.json found.");
    }
}
initialize();


// --- DATABASE HELPERS ---
const readDB = () => {
    try { 
        let data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        
        if (!data.signupRequests) data.signupRequests = [];
        if (!data.batches) data.batches = {}; 
        if (!data.subjects) data.subjects = {}; 
        if (!data.users) data.users = {};

        return data; 
    }
    catch (e) { 
        console.error("DB Read Error/Corruption:", e);
        // Fallback to initial mock data if read fails during runtime
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

// --- AUTHORIZATION HELPER ---
function isAuthorized(req, role, department) {
    const db = readDB();
    // Check ID in body (for POST/DELETE) or query (for GET/DELETE)
    const userId = req.body.id || req.query.deleterId || req.body.assignerId || req.body.adminId || req.query.currentUserId || req.body.currentUserId; 
    const user = db.users[userId];
    
    // 1. Admin is always authorized.
    if (user && user.role === 'Admin') return true; 

    // 2. HOD is authorized only if their department matches the target department.
    if (user && user.role === 'HOD' && user.department === department) return true;

    return false;
}

function isUserOrAdmin(req, targetUserId) {
    const db = readDB();
    // Check ID in body (for POST) or query (for GET/DELETE)
    const currentUserId = req.body.userId || req.query.currentUserId || req.body.id; 
    const currentUserRole = db.users[currentUserId]?.role;
    
    if (currentUserRole === 'Admin' || currentUserId === targetUserId) {
        return true;
    }
    return false;
}
// --- END OF AUTHORIZATION HELPER ---


// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = UPLOADS_DIR;
        if (file.fieldname === 'photoFile') uploadPath = path.join(UPLOADS_DIR, 'profiles');
        else if (file.fieldname === 'assignmentFile') uploadPath = path.join(UPLOADS_DIR, 'assignments');
        else if (file.fieldname === 'submissionFile') uploadPath = path.join(UPLOADS_DIR, 'submissions');
        else if (file.fieldname === 'idCardPhoto') uploadPath = path.join(UPLOADS_DIR, 'id-cards');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => { cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit enforced here
});

// =========================================
// API ROUTES
// =========================================

// --- AUTH (Simple User/Pass - UNCHANGED) ---
app.post('/login', (req, res) => {
    const { userId, password, role, department } = req.body;
    const db = readDB();
    const user = db.users[userId];
    
    if (!user || user.pass !== password) return res.status(401).json({ success: false, message: "Invalid User ID or Password." });
    if (user.role !== role) {
        if (!(role === 'HOD' && user.role === 'HOD')) return res.status(403).json({ success: false, message: "Role mismatch." });
    }
    if (role === 'HOD' && user.department !== department) return res.status(403).json({ success: false, message: "Department mismatch." });

    const { pass, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// --- SIGNUP (Saves to signupRequests - UNCHANGED) ---
app.post('/signup', (req, res) => {
    const { userId, pass, name, role, department, email, course, phone } = req.body;
    const db = readDB();

    if (!email || !email.toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN)) {
        return res.status(400).json({ success: false, message: `Registration requires an email ending in ${REQUIRED_EMAIL_DOMAIN}.` });
    }

    if (db.users[userId] || db.signupRequests.some(r => r.userId === userId || r.email === email)) {
        return res.status(409).json({ success: false, message: "User ID or Email already exists or is pending approval." });
    }
    
    const newRequestId = Date.now();
    db.signupRequests.push({ 
        id: newRequestId, 
        userId, 
        pass, 
        name, 
        role, 
        department, 
        email, 
        course: course || "", 
        phone: phone || "", 
        photoUrl: "",
        status: 'Pending',
        requestedOn: new Date()
    });
    writeDB(db);
    res.json({ success: true, message: "Registration submitted for admin verification." });
});

// =========================================
// BATCH MANAGEMENT ROUTES 
// =========================================

// GET /api/batches - Get all batches (HOD FILTER APPLIED)
app.get('/batches', (req, res) => {
    const db = readDB();
    const batchesList = Object.keys(db.batches).map(id => ({ id, ...db.batches[id] }));
    
    // Filtering logic
    const { department: requestedDept, adminId } = req.query;

    if (requestedDept) {
        // Authorization Check (Admin sees all, HOD sees only their department)
        const user = db.users[adminId];
        
        if (user && user.role === 'Admin') {
            return res.json({ success: true, batches: batchesList });
        }
        
        if (user && user.role === 'HOD' && user.department === requestedDept) {
            const filteredList = batchesList.filter(b => b.department === requestedDept);
            return res.json({ success: true, batches: filteredList });
        } 
        
        if (adminId) {
             return res.status(403).json({ success: false, message: "Unauthorized access or department mismatch." });
        }
    }
    
    // Default case (Admin or unfiltered access)
    res.json({ success: true, batches: batchesList });
});

// POST /api/batches - Create a new batch (HOD DEPT RESTRICTION)
app.post('/batches', (req, res) => {
    const db = readDB();
    const { batchId, department, course, year, section, adminId } = req.body; 
    
    if (!isAuthorized({ body: { id: adminId } }, 'HOD', department)) {
        return res.status(403).json({ success: false, message: "Unauthorized. HOD can only create batches for their own department." });
    }

    if (db.batches[batchId]) return res.status(409).json({ success: false, message: "Batch ID already exists." });

    const name = `${course}, ${year}, Section ${section}`;
    db.batches[batchId] = { id: batchId, name, department, course, year, section, students: [], subjects: [] };
    writeDB(db);
    res.json({ success: true, message: `Batch ${name} created. Now enroll students and faculty.` });
});

// POST /api/batches/enroll - Enroll students and assign faculty for a batch (UNCHANGED)
app.post('/batches/enroll', (req, res) => {
    const db = readDB();
    const { batchId, studentIds, subjectAssignments } = req.body; 
    const batch = db.batches[batchId];

    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    // 1. Enroll Students
    (studentIds || []).forEach(userId => {
        const user = db.users[userId];
        if (user && user.role === 'Student') {
            user.batchId = batchId;
            if (!batch.students.includes(userId)) {
                batch.students.push(userId);
            }
        }
    });

    // 2. Assign Faculty to Subjects/Batch
    (subjectAssignments || []).forEach(assignment => {
        const { courseCode, teacherId } = assignment;

        if (!db.users[teacherId] || (db.users[teacherId].role !== 'Faculty' && db.users[teacherId].role !== 'HOD')) {
            console.error(`Invalid Faculty ID: ${teacherId}`);
            return;
        }

        let subject = db.subjects[courseCode];
        if (!subject) {
            subject = { name: courseCode, department: batch.department, teacherId, batchIds: [] };
            db.subjects[courseCode] = subject;
        }
        
        if (!subject.batchIds.includes(batchId)) {
            subject.batchIds.push(batchId);
        }
        subject.teacherId = teacherId;
        
        if (!batch.subjects.includes(courseCode)) {
            batch.subjects.push(courseCode);
        }
    });

    writeDB(db);
    res.json({ success: true, message: `Batch enrollment and faculty assignment complete for ${batchId}.` });
});


// POST /api/subjects - Create or Update a subject and assign teacher/batches (HOD DEPT RESTRICTION)
app.post('/subjects', (req, res) => {
    const db = readDB();
    const { courseCode, name, department, teacherId, batchIds, assignerId } = req.body;

    if (!isAuthorized({ body: { id: assignerId } }, 'HOD', department)) {
        return res.status(403).json({ success: false, message: "Unauthorized. Subject assignment must be done by the Department Head or Admin for their department." });
    }

    if (!db.users[teacherId] || (db.users[teacherId].role !== 'Faculty' && db.users[teacherId].role !== 'HOD')) {
        return res.status(400).json({ success: false, message: "Invalid Teacher ID or role." });
    }

    db.subjects[courseCode] = { name, department, teacherId, batchIds: batchIds || [] };
    writeDB(db);
    res.json({ success: true, message: `Subject ${name} assigned to teacher and batches.` });
});


// =========================================
// ADMIN/HOD SIGNUP MANAGEMENT ROUTES 
// =========================================

app.get('/signup-requests/pending', (req, res) => {
    const db = readDB();
    const pending = (db.signupRequests || []).filter(r => r.status === 'Pending');
    res.json({ success: true, requests: pending });
});

// FIX: Approve route now correctly handles newUserId for faculty assignment
app.post('/signup-requests/:id/approve', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.signupRequests.findIndex(r => r.id === id);

    if (index === -1) return res.status(404).json({ success: false, message: "Request not found." });

    const request = db.signupRequests[index];
    const finalUserId = req.body.newUserId || request.userId; 
    
    if (db.users[finalUserId] && finalUserId !== request.userId) {
         return res.status(409).json({ success: false, message: `The ID ${finalUserId} is already in use by an active user.` });
    }
    
    // 1. Move the user from signupRequests to live users
    db.users[finalUserId] = { 
        ...request, 
        id: finalUserId, // Set the final, verified ID
        userId: finalUserId, // Also update the internal userId property
        batchId: null, // Initialized to null, waiting for batch enrollment
    };
    
    // 2. Remove the request from the pending list
    db.signupRequests.splice(index, 1);
    
    writeDB(db);
    res.json({ success: true, message: `Account for ${request.name} approved. Final ID is ${finalUserId}. Batch assignment pending.` });
});

app.post('/signup-requests/:id/reject', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.signupRequests.findIndex(r => r.id === id);

    if (index === -1) return res.status(404).json({ success: false, message: "Request not found." });
    
    const rejectedUser = db.signupRequests[index].name;
    db.signupRequests.splice(index, 1);
    
    writeDB(db);
    res.json({ success: true, message: `Account request for ${rejectedUser} rejected.` });
});


// =========================================
// FEATURE ROUTES UPDATES
// =========================================

// POST /attendance/mark - UNCHANGED
app.post('/attendance/mark', (req, res) => {
    const { facultyId, batchId, subjectCode, studentId, status } = req.body; 
    const db = readDB();

    // 1. Authorization check: Is this teacher assigned to this subject/batch?
    const subject = db.subjects[subjectCode];
    if (!subject || subject.teacherId !== facultyId) {
        return res.status(403).json({ success: false, message: "Faculty not assigned to this subject." });
    }
    if (!subject.batchIds.includes(batchId)) {
        return res.status(403).json({ success: false, message: "Batch is not linked to this subject." });
    }

    // 2. Student check: Is the student in the batch?
    const student = db.users[studentId];
    if (!student || student.batchId !== batchId) {
         return res.status(403).json({ success: false, message: "Student is not part of this batch." });
    }

    // 3. Original attendance marking logic (simplified)
    if (!db.attendance) db.attendance = {}; 
    if (!db.attendance[studentId]) db.attendance[studentId] = {};
    const subKey = `${subjectCode} (${batchId})`;

    if (!db.attendance[studentId][subKey]) db.attendance[studentId][subKey] = { present: 0, total: 0 };
    
    db.attendance[studentId][subKey].total++; 
    if (status === 'Present') db.attendance[studentId][subKey].present++;
    
    writeDB(db); 
    res.json({ success: true, message: "Attendance marked" });
});


// --- OTHER FEATURE ROUTES (RETAINED/UNCHANGED) ---
app.get('/profile/:userId', (req, res) => {
    const user = readDB().users[req.params.userId];
    if (!user) return res.status(404).json({ success: false, message: "Profile not found." });
    const { pass, ...safeUser } = user;
    res.json({ success: true, profile: safeUser });
});

// NEW/UPDATED: POST /profile/update - Handles editable profile fields (Phone, DOB, Photo)
app.post('/profile/update', upload.single('photoFile'), (req, res) => {
    const db = readDB();
    const { userId, name, email, phone, dob, address, bloodGroup, currentUserId } = req.body; 

    // Authorization: Only the user themselves or an Admin can edit this profile
    if (!isUserOrAdmin(req, userId)) {
        return res.status(403).json({ success: false, message: "Unauthorized to edit this profile." });
    }

    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // Update only the editable fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.dob = dob || user.dob;
    user.address = address || user.address;
    user.bloodGroup = bloodGroup || user.bloodGroup;

    if (req.file) {
        user.photoUrl = `/uploads/profiles/${req.file.filename}`;
    }

    writeDB(db);
    const { pass, ...safeUser } = user;
    res.json({ success: true, message: "Profile updated successfully.", updatedUser: safeUser });
});


// NEW ROUTE: Fetch Users by Role and Department for Enrollment UI
app.get('/users/by-role-and-dept', (req, res) => {
    const { department } = req.query;
    const db = readDB();
    const allUsers = Object.values(db.users);
    
    if (!department) {
        return res.status(400).json({ success: false, message: "Department parameter is required." });
    }

    const students = allUsers
        .filter(u => u.role === 'Student' && u.department === department)
        .map(({ pass, ...user }) => user); // Exclude password
    
    const faculty = allUsers
        .filter(u => u.role === 'Faculty' && u.department === department)
        .map(({ pass, ...user }) => user); // Exclude password

    res.json({ success: true, students, faculty });
});

// NEW ROUTE: Fetch ALL Faculty (Used for cross-department subject assignment modal)
app.get('/users/all-faculty', (req, res) => {
    const db = readDB();
    const faculty = Object.values(db.users)
        .filter(u => u.role === 'Faculty' || u.role === 'HOD')
        .map(({ pass, ...user }) => user);
    res.json({ success: true, faculty });
});


// NEW ROUTE: Fetch faculty assignments and student list for attendance sheet
app.get('/faculty/attendance/data', (req, res) => {
    const { facultyId, batchId, subjectCode } = req.query;
    const db = readDB();
    const faculty = db.users[facultyId];
    
    if (!faculty || (faculty.role !== 'Faculty' && faculty.role !== 'HOD')) {
        return res.status(403).json({ success: false, message: "Invalid or unauthorized Faculty ID." });
    }

    // Find all subjects assigned to this faculty
    const assignedSubjects = Object.keys(db.subjects)
        .filter(code => db.subjects[code].teacherId === facultyId)
        .map(code => ({ 
            code: code, 
            name: db.subjects[code].name,
            batchIds: db.subjects[code].batchIds 
        }));

    let students = [];
    let currentBatchInfo = null;

    if (batchId && subjectCode) {
        const batch = db.batches[batchId];
        const subject = db.subjects[subjectCode];
        
        // Validation: Ensure the subject is assigned to the batch and the faculty
        if (batch && subject && subject.teacherId === facultyId && subject.batchIds.includes(batchId)) {
            // Retrieve full student details for the attendance sheet
            students = batch.students.map(studentId => {
                const student = db.users[studentId];
                return student ? { id: student.id, name: student.name } : null;
            }).filter(s => s !== null);

            currentBatchInfo = {
                batchName: batch.name,
                subjectName: subject.name,
                studentCount: students.length
            };
        }
    }

    res.json({
        success: true,
        assignedSubjects,
        students,
        currentBatchInfo
    });
});


app.get('/users', (req, res) => {
    const db = readDB();
    const usersList = Object.values(db.users).map(({ pass, ...user }) => user);
    res.json({ success: true, users: usersList });
});

// NEW ROUTE: Allows Admin to create an HOD account directly
app.post('/admin/create-hod', (req, res) => {
    const { id, pass, name, department, email, phone, course } = req.body;
    const db = readDB();

    if (db.users[id]) {
        return res.status(409).json({ success: false, message: `HOD ID ${id} already exists.` });
    }

    if (!id || !pass || !department) {
        return res.status(400).json({ success: false, message: "Missing required fields (ID, Password, Department)." });
    }

    // Create the HOD user object directly in the users list
    db.users[id] = { 
        id: id, 
        pass: pass, 
        name: name || `HOD: ${department}`,
        role: 'HOD',
        department: department,
        email: email || '', 
        course: course || '', 
        phone: phone || '', 
        photoUrl: "" 
    };

    writeDB(db);
    res.json({ success: true, message: `Department Head (${department}) created successfully with ID ${id}.` });
});


// User Deletion Route (FIXED for Persistence)
app.delete('/users/:userId', (req, res) => {
    const db = readDB();
    const userIdToDelete = req.params.userId;
    
    if (db.users[userIdToDelete]) {
        // Use the 'delete' operator to remove the property from the object (the reliable fix)
        delete db.users[userIdToDelete];
        
        // Also remove the user from any batch lists they might be in
        Object.values(db.batches).forEach(batch => {
            const studentIndex = batch.students.indexOf(userIdToDelete);
            if (studentIndex > -1) {
                batch.students.splice(studentIndex, 1);
            }
        });

        // Save the entire updated DB structure back to the file
        writeDB(db);
        
        console.log(`User deleted: ${userIdToDelete}`);
        res.json({ success: true, message: `User ${userIdToDelete} deleted.` });
    } else {
        res.status(404).json({ success: false, message: "User not found in active database." });
    }
});

// NEW ROUTE: Delete a Batch (HOD DEPT RESTRICTION)
app.delete('/batches/:batchId', (req, res) => {
    const db = readDB();
    const { batchId } = req.params;
    const { deleterId } = req.query; // Auth check requires user ID

    if (!db.batches[batchId]) {
        return res.status(404).json({ success: false, message: "Batch not found." });
    }
    
    const batchDepartment = db.batches[batchId].department;

    // AUTHORIZATION CHECK: HOD can only delete batches in their department. Admin can delete all.
    if (!isAuthorized({ query: { deleterId: deleterId } }, 'HOD', batchDepartment)) {
        return res.status(403).json({ success: false, message: "Unauthorized. Only Admin or HOD of this department can delete this batch." });
    }

    // 1. Remove the batch itself
    delete db.batches[batchId];

    // 2. Remove batchId reference from affected subjects
    Object.values(db.subjects).forEach(subject => {
        const batchIndex = subject.batchIds.indexOf(batchId);
        if (batchIndex > -1) {
            subject.batchIds.splice(batchIndex, 1);
        }
    });

    // 3. Remove batchId reference from affected students
    Object.values(db.users).forEach(user => {
        if (user.batchId === batchId) {
            user.batchId = null;
        }
    });

    writeDB(db);
    res.json({ success: true, message: `Batch ${batchId} deleted successfully.` });
});


app.get('/announcements', (req, res) => {
    const { role, department } = req.query;
    const db = readDB();
    let all = db.announcements || [];
    if (role && role !== 'Admin') {
           all = all.filter(a => a.target === 'All' || a.target === role || (a.department && a.department === department));
    }
    res.json({ success: true, announcements: all.reverse() });
});
app.post('/announcements', (req, res) => {
    const db = readDB();
    const newAnnounce = { id: Date.now(), title: req.body.title, body: req.body.body, target: req.body.target, department: req.body.department, date: new Date() };
    db.announcements = db.announcements || [];
    db.announcements.push(newAnnounce);
    writeDB(db);
    res.json({ success: true, message: "Announcement posted" });
});
app.post('/id-cards/apply', upload.single('idCardPhoto'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Photo is required (max 10MB)" });
    const db = readDB();
    db.idCardRequests = db.idCardRequests || [];
    db.idCardRequests = db.idCardRequests.filter(r => r.userId !== req.body.userId);
    db.idCardRequests.push({
        id: Date.now(),
        ...req.body,
        photoUrl: `/uploads/id-cards/${req.file.filename}`,
        status: 'Pending',
        appliedOn: new Date()
    });
    writeDB(db);
    res.json({ success: true, message: "Application submitted" });
});
app.get('/id-cards/my-status/:userId', (req, res) => {
    const db = readDB();
    const reqData = (db.idCardRequests || []).find(r => r.userId === req.params.userId);
    res.json({ success: true, request: reqData || null });
});
app.get('/id-cards/pending', (req, res) => {
    const db = readDB();
    const pending = (db.idCardRequests || []).filter(r => r.status === 'Pending');
    res.json({ success: true, requests: pending });
});
app.post('/id-cards/:id/action', (req, res) => {
    const db = readDB();
    const cardReq = (db.idCardRequests || []).find(r => r.id == req.params.id);
    if (cardReq) {
        cardReq.status = req.body.status;
        writeDB(db);
        res.json({ success: true, message: `Request ${req.body.status}` });
    } else {
        res.status(404).json({ success: false, message: "Request not found" });
    }
});
app.get('/placements', (req, res) => {
    const db = readDB();
    let results = db.placements || [];
    if (req.query.department) results = results.filter(p => p.department === req.query.department);
    res.json({ success: true, placements: results.sort((a, b) => b.postedOn - a.postedOn) });
});
app.post('/placements', (req, res) => {
    const db = readDB();
    db.placements = (db.placements || []).concat({ id: Date.now(), ...req.body, postedOn: Date.now(), applications: [] });
    writeDB(db);
    res.json({ success: true, message: "Placement posted" });
});
app.get('/timetable', (req, res) => { res.json({ success: true, timetable: readDB().timetables?.[req.query.course] || {} }); });
app.get('/marks/:userId', (req, res) => { res.json({ success: true, marks: readDB().marks?.[req.params.userId] || [] }); });
app.get('/assignments', (req, res) => {
    const { course, facultyId } = req.query; const db = readDB();
    let all = Object.values(db.assignments || {}).flat();
    if (course) all = all.filter(a => a.course === course);
    if (facultyId) all = all.filter(a => a.facultyId === facultyId);
    res.json({ success: true, assignments: all });
});
app.post('/assignments', upload.single('assignmentFile'), (req, res) => {
    const db = readDB(); const { department } = req.body;
    if (!db.assignments) db.assignments = {}; if (!db.assignments[department]) db.assignments[department] = [];
    db.assignments[department].push({ id: Date.now(), ...req.body, filePath: req.file ? `/uploads/assignments/${req.file.filename}` : null, submissions: [] });
    writeDB(db); res.json({ success: true, message: "Assignment created" });
});
app.post('/assignments/:id/submit', upload.single('submissionFile'), (req, res) => {
    const db = readDB(); let found = false;
    for (const d in db.assignments) {
        const a = db.assignments[d].find(x => x.id == req.params.id);
        if (a) { a.submissions.push({ ...req.body, filePath: req.file ? `/uploads/submissions/${req.file.filename}` : null, submittedOn: new Date() }); found = true; break; }
    }
    if (found) { writeDB(db); res.json({ success: true, message: "Submitted" }); } else res.status(404).json({ success: false });
});

// FIX/UPDATE: Leave application goes to mentor/HOD
app.post('/leaves', (req, res) => {
    const db = readDB();
    const user = db.users[req.body.userId];
    
    let approvalTarget = 'HOD'; 
    let mentorId = user?.mentorId; 

    // If the applicant is a student, the approval target is their mentor
    if (user && user.role === 'Student' && mentorId) {
        approvalTarget = mentorId;
    }

    db.leaveRequests = (db.leaveRequests || []).concat({ 
        id: Date.now(), 
        ...req.body, 
        status: 'Pending', 
        appliedOn: new Date(),
        approvalTarget: approvalTarget
    });
    
    writeDB(db); 
    res.json({ success: true, message: `Leave submitted to ${approvalTarget} for approval.` });
});


// FIX/UPDATE: Fetch pending leaves based on mentorId (for student leave)
app.get('/leaves/pending/:department', (req, res) => {
    const db = readDB();
    const targetDept = req.params.department;
    const { currentUserId } = req.query; 
    const currentUser = db.users[currentUserId];
    
    let leaves = (db.leaveRequests || []).filter(l => l.status === 'Pending');

    if (currentUser && currentUser.role === 'HOD') {
        leaves = leaves.filter(l => 
            (l.approvalTarget === 'HOD' && l.department === targetDept) ||
            (l.approvalTarget === currentUser.id)
        );
    } else if (currentUser && currentUser.role === 'Faculty') {
        leaves = leaves.filter(l => l.approvalTarget === currentUser.id);
    } else if (currentUser && currentUser.role === 'Admin') {
        // Admin sees all pending leaves
    } else {
        // Unauthorized access attempting to filter
        return res.status(403).json({ success: false, message: "Authorization required to view pending leaves." });
    }

    res.json({ success: true, leaves: leaves });
});


app.post('/leaves/:id/action', (req, res) => {
    const db = readDB(); const l = (db.leaveRequests || []).find(x => x.id == req.params.id);
    if (l) { l.status = req.body.status; writeDB(db); res.json({ success: true, message: `Leave ${req.body.status}` }); }
    else res.status(404).json({ success: false });
});

// =========================================
// 🚀 FIXED ROUTING SECTION FOR DEPLOYMENT 🚀
// =========================================

// 1. Explicitly serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. The catch-all route for client-side routing
app.get('*', (req, res) => {
    // Basic check to prevent serving HTML for missing API routes
    if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('/users') || req.originalUrl.includes('/batches') || req.originalUrl.includes('/subjects')) {
        return res.status(404).json({ success: false, message: "API endpoint not found." });
    }
    // For all other routes, assume it is a frontend route and serve index.html
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));