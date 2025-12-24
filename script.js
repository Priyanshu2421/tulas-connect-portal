<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TULA'S CONNECT - ERP</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-50">

    <!-- Notification Toast -->
    <div id="toast" class="fixed bottom-5 right-5 transform translate-y-full opacity-0 transition-all duration-500 z-50 px-6 py-3 rounded-lg shadow-2xl font-medium text-white"></div>

    <!-- Generic Modal -->
    <div id="modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
             <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition text-2xl">&times;</button>
             <div id="modal-content" class="p-6"></div>
        </div>
    </div>

    <!-- AUTHENTICATION WRAPPER -->
    <div id="auth-wrapper" class="fixed inset-0 w-full h-full flex items-center justify-center p-4 z-50" style="display: none;">
        
        <!-- LOGIN SECTION -->
        <div id="login-box" class="auth-card transition-all duration-300 relative z-10">
            <div class="auth-header text-center mb-8">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv_4ADbeFBqg9mRZQYTRGpzcdXlZN0IFw_0A&s" onerror="this.src='https://placehold.co/64x64/22c55e/ffffff?text=TL'" alt="Logo" class="mx-auto mb-4 h-16">
                <h1 class="text-gray-900 font-black text-2xl tracking-tight uppercase">Tula's Connect</h1>
                <p class="text-green-600 text-sm font-semibold italic mt-1 uppercase tracking-tighter">"Connecting Communities, Empowering Futures"</p>
                <p class="text-gray-400 text-[10px] uppercase tracking-widest mt-1 font-bold">Enterprise Resource Portal</p>
            </div>

            <form id="login-form" class="space-y-4">
                <div class="input-group">
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1 text-left">Access Level</label>
                    <select id="login-role" onchange="updateAuthUI()" class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none">
                        <option>Student</option>
                        <option>Faculty</option>
                        <option value="Department Login">Department Head (HOD)</option>
                        <option>Admin</option>
                    </select>
                </div>
                
                <div id="login-dept-wrapper" class="hidden space-y-4 text-left">
                    <div class="input-group">
                        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Department</label>
                        <select id="login-dept" onchange="updateAuthUI()" class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"></select>
                    </div>
                    <div id="login-eng-branch-wrapper" class="hidden input-group">
                        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Engineering Branch</label>
                        <select id="login-eng-branch" class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"></select>
                    </div>
                </div>

                <div class="input-group text-left">
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">User ID / Roll No</label>
                    <input type="text" id="login-id" required placeholder="Enter your ID" class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                
                <div class="input-group relative text-left">
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
                    <input type="password" id="login-pass" required placeholder="••••••••" class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none">
                    <button type="button" onclick="togglePass('login-pass')" class="absolute right-3 top-8 text-gray-400 hover:text-green-600 transition">👁️</button>
                </div>

                <div class="space-y-2 text-left">
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Verification</label>
                    <div class="flex items-center space-x-3 bg-white/50 p-2 rounded-lg border border-gray-200">
                        <canvas id="login-captcha-canvas" width="120" height="40" onclick="generateLoginCaptcha()" class="rounded border shadow-sm cursor-pointer"></canvas>
                        <button type="button" onclick="generateLoginCaptcha()" class="text-gray-400 hover:text-green-600 transition p-2">🔄</button>
                        <input type="text" id="login-captcha-input" placeholder="Code" required class="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                    </div>
                </div>

                <button type="submit" class="btn-primary w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg mt-4">SECURE LOGIN</button>
            </form>

            <div class="mt-8 text-center border-t pt-6">
                <p class="text-sm text-gray-600">New student? <button onclick="toggleAuthScreen('signup')" class="text-green-700 font-bold hover:underline">Create Account</button></p>
            </div>
        </div>

        <!-- SIGNUP SECTION -->
        <div id="signup-box" class="hidden auth-card transition-all duration-300 relative z-10 max-h-[90vh] overflow-y-auto">
            <div class="auth-header text-center mb-6">
                <h2 class="text-2xl font-black text-gray-900 tracking-tight uppercase">Registration</h2>
                <p class="text-green-600 text-xs font-semibold italic mt-1 uppercase tracking-tighter">"Connecting Communities, Empowering Futures"</p>
            </div>
            <form id="signup-form" class="space-y-3 text-left">
                <div class="input-group">
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Role Selection</label>
                    <select name="role" id="signup-role" required onchange="updateSignupUI()" class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none">
                        <option value="">Select Role</option>
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                    </select>
                </div>

                <input type="text" name="name" placeholder="Full Legal Name" required class="w-full p-3 bg-gray-50 border rounded-xl">
                <input type="email" name="email" placeholder="Email (@tulas.edu.in)" required class="w-full p-3 bg-gray-50 border rounded-xl">
                <input type="tel" name="phone" placeholder="Phone Number" required class="w-full p-3 bg-gray-50 border rounded-xl">

                <div id="student-fields" class="hidden">
                    <input type="text" name="userId" id="signup-userid" placeholder="University Roll No." class="w-full p-3 bg-gray-50 border rounded-xl mt-3">
                </div>

                <div id="signup-dept-wrapper" class="hidden mt-3">
                    <select name="department" id="signup-dept" required onchange="updateSignupUI()" class="w-full p-3 bg-gray-50 border rounded-xl">
                        <option value="">Select Department</option>
                    </select>
                </div>

                <div id="signup-course-wrapper" class="hidden mt-3">
                    <select name="course" id="signup-course" class="w-full p-3 bg-gray-50 border rounded-xl">
                        <option value="">Select Course</option>
                    </select>
                </div>

                <input type="password" name="pass" placeholder="Create Password" required class="w-full p-3 bg-gray-50 border rounded-xl mt-3">
                
                <div class="space-y-2 mt-3">
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Human Check</label>
                    <div class="flex items-center space-x-3 bg-white/50 p-2 rounded-lg border border-gray-200">
                        <canvas id="captcha-canvas" width="120" height="40" onclick="generateCaptcha()" class="rounded border shadow-sm cursor-pointer"></canvas>
                        <button type="button" onclick="generateCaptcha()" class="text-gray-400 hover:text-green-600 p-2">🔄</button>
                        <input type="text" id="captcha-input" placeholder="Code" required class="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                    </div>
                </div>

                <button type="submit" class="btn-primary w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition mt-4 shadow-lg">REGISTER ACCOUNT</button>
            </form>
            <div class="mt-6 text-center text-xs">
                <button onclick="toggleAuthScreen('login')" class="text-green-700 font-bold hover:underline">← Back to Login</button>
            </div>
        </div>
    </div>

    <!-- DASHBOARD VIEW -->
    <div id="dashboard" class="hidden min-h-screen flex flex-col md:flex-row">
        <aside id="sidebar" class="text-gray-100 w-72 fixed h-full transform -translate-x-full md:translate-x-0 transition-transform duration-300 z-30 flex flex-col">
            <div class="p-6 flex items-center space-x-3 border-b border-white/10">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv_4ADbeFBqg9mRZQYTRGpzcdXlZN0IFw_0A&s" class="h-10 w-10 rounded-full bg-white p-1">
                <div>
                    <h1 class="font-black text-lg leading-tight uppercase tracking-tight">Tula's</h1>
                    <p class="text-[9px] text-green-400 font-medium uppercase tracking-tight leading-none mt-0.5">Empowering Futures</p>
                    <p id="nav-role-badge" class="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1">Portal</p>
                </div>
            </div>
            <nav id="nav-links" class="flex-1 overflow-y-auto py-6 space-y-1"></nav>
            <div class="p-4 border-t border-white/10">
                <button onclick="logout()" class="w-full flex items-center space-x-3 px-4 py-3 text-red-300 hover:bg-red-500/20 rounded-xl transition">
                    <span>🚪</span><span class="font-bold">Sign Out</span>
                </button>
            </div>
        </aside>

        <div class="flex-1 md:ml-72 flex flex-col min-h-screen bg-gray-50">
            <header class="md:hidden bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                <div class="flex items-center space-x-3">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv_4ADbeFBqg9mRZQYTRGpzcdXlZN0IFw_0A&s" class="h-8">
                    <span class="font-black text-green-800 tracking-tighter uppercase text-sm">Tula's Connect</span>
                </div>
                <button onclick="toggleSidebar()" class="p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">☰</button>
            </header>

            <main class="p-4 md:p-8 flex-1 overflow-y-auto">
                <div id="content-area" class="max-w-6xl mx-auto min-h-[85vh] p-6 md:p-10 bg-white rounded-2xl shadow-xl border border-gray-100 animate-fadeIn">
                </div>
            </main>
        </div>
    </div>

    <!-- AI Helper -->
    <button id="chatbot-open-btn" onclick="toggleChatbot()" class="fixed bottom-5 left-5 w-14 h-14 bg-green-600 rounded-full shadow-2xl hover:bg-green-700 transition transform hover:scale-110 z-40 flex items-center justify-center text-2xl">
        🤖
    </button>
    <div id="chatbot-modal" class="hidden fixed bottom-5 left-5 w-full max-w-sm h-[60vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden transform transition-all">
        <div class="p-4 bg-green-800 text-white flex justify-between items-center">
            <h3 class="font-bold">Tula's AI Assistant</h3>
            <button onclick="toggleChatbot()" class="text-2xl">&times;</button>
        </div>
        <div id="chat-history" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"></div>
        <form id="chat-form" class="p-3 border-t bg-white">
            <div class="flex space-x-2">
                <input type="text" id="chat-input" placeholder="Ask me anything..." class="flex-1 p-2 border rounded-xl outline-none focus:ring-1 focus:ring-green-500">
                <button type="submit" class="bg-green-600 text-white px-4 rounded-xl hover:bg-green-700 transition">Send</button>
            </div>
        </form>
    </div>

<script>
// =========================================
// === CONFIGURATION & DATA ===
// =========================================
const API_BASE = ''; 
let currentUser = JSON.parse(sessionStorage.getItem('user')) || null;
let currentCaptcha = '';
let currentLoginCaptcha = ''; 
const REQUIRED_DOMAIN = '@tulas.edu.in'; 

const DEPT_DATA = {
    "Department of Engineering": {
        branches: ["Computer Science & Engineering", "Civil Engineering", "Mechanical Engineering", "Electronics & Communication Engineering", "Electrical & Electronics Engineering"],
        courses: ["B.Tech CSE", "B.Tech Civil", "B.Tech Mechanical", "B.Tech ECE", "B.Tech EEE", "M.Tech CSE", "M.Tech Civil", "M.Tech Thermal Engg"],
        years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        sections: ["A", "B", "C"]
    },
    "Department of Computer Applications": { courses: ["BCA", "MCA"], years: ["1st Year", "2nd Year", "3rd Year"], sections: ["A", "B"] },
    "Graduate School of Business": { courses: ["BBA", "MBA", "B.Com (Hons)"], years: ["1st Year", "2nd Year"], sections: ["A"] },
    "Department of Agriculture": { courses: ["B.Sc Agriculture"], years: ["1st Year", "2nd Year", "3rd Year", "4th Year"], sections: ["A"] },
    "Department of Applied Sciences and Humanities": { courses: ["B.Sc Physics", "B.Sc Chemistry", "B.A. English"], years: ["1st Year", "2nd Year", "3rd Year"], sections: ["A"] },
    "Department of Journalism and Communications": { courses: ["BA (Hons) Journalism & Mass Comm", "MA JMC"], years: ["1st Year", "2nd Year"], sections: ["A"] },
    "Tula's Institute of Pharmacy": { courses: ["B.Pharm", "D.Pharm"], years: ["1st Year", "2nd Year", "3rd Year", "4th Year"], sections: ["A"] }
};

// =========================================
// === INITIALIZATION ===
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    initAuthDropdowns();
    generateCaptcha(); 
    generateLoginCaptcha(); 

    const authWrapper = document.getElementById('auth-wrapper');
    const dashboard = document.getElementById('dashboard');

    if (currentUser) {
        authWrapper.style.display = 'none';
        dashboard.classList.remove('hidden');
        showDashboard();
    } else {
        authWrapper.style.display = 'flex'; 
        updateAuthUI();
    }

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const captcha = document.getElementById('login-captcha-input').value.toUpperCase();
        if (captcha !== currentLoginCaptcha) {
            showToast('Incorrect Captcha', true);
            generateLoginCaptcha();
            return;
        }
        const role = document.getElementById('login-role').value;
        let dept = null;
        if (role === 'Department Login') {
            dept = document.getElementById('login-dept').value;
            if (dept === 'Department of Engineering') dept = document.getElementById('login-eng-branch').value;
        }
        await handleAuth('/login', {
            userId: document.getElementById('login-id').value.trim(),
            password: document.getElementById('login-pass').value,
            role: role === 'Department Login' ? 'HOD' : role,
            department: dept,
        });
    };

    document.getElementById('signup-form').onsubmit = async (e) => {
        e.preventDefault();
        const captcha = document.getElementById('captcha-input').value.toUpperCase();
        if (captcha !== currentCaptcha) {
            showToast('Incorrect Captcha', true);
            generateCaptcha();
            return;
        }
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData);
        if (!payload.email.toLowerCase().endsWith(REQUIRED_DOMAIN)) {
            showToast(`Must use institutional email ${REQUIRED_DOMAIN}`, true);
            return;
        }
        await handleAuth('/signup', payload, true);
    };

    document.getElementById('chat-form').onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        if(!input.value.trim()) return;
        addMessageToChat(input.value.trim(), true);
        input.value = '';
        setTimeout(() => addMessageToChat("How can I assist you with the portal today?", false), 800);
    };
});

// =========================================
// === DASHBOARD ROUTING ===
// =========================================

async function loadContent(pageId, activeBtn) {
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.add('-translate-x-full');
    const container = document.getElementById('content-area');
    container.innerHTML = '<div class="loader"></div>';

    try {
        switch (pageId) {
            case 'profile': await loadProfile(container); break;
            case 'timetable': await loadTimetable(container); break;
            case 'attendance': await loadAttendance(container); break;
            case 'marks': await loadMarks(container); break;
            case 'assignments': await loadAssignmentsStudent(container); break;
            case 'leaves': await loadLeavesCommon(container); break;
            case 'fac-attendance': await loadFacultyAttendance(container); break;
            case 'fac-assignments': await loadFacultyAssignments(container); break;
            case 'fac-leaves': await loadFacultyLeaves(container); break;
            case 'admin-users': await loadAdminUsers(container); break;
            case 'admin-announcements': await loadAdminAnnouncements(container); break;
            case 'admin-signup-requests': await showAdminSignupRequests(container); break;
            case 'admin-batches': await loadAdminBatches(container); break;
            default: container.innerHTML = `<p class="text-center text-gray-400 py-20 uppercase tracking-widest font-black">Under Construction</p>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="p-8 text-center"><div class="bg-red-50 text-red-600 p-6 rounded-2xl inline-block shadow-sm font-bold border border-red-100">⚠️ Error loading section. Please check your server connection.</div></div>`;
    }
}

// =========================================
// === FEATURE FUNCTIONS (STUDENT) ===
// =========================================

async function loadProfile(container) {
    const res = await fetch(`${API_BASE}/profile/${currentUser.id}`);
    const data = await res.json();
    if (!data.success) throw new Error("Fetch failed");
    const p = data.profile;
    container.innerHTML = `
        <div class="flex flex-col md:flex-row gap-10 items-start">
            <div class="w-full md:w-80 bg-white p-8 rounded-3xl border shadow-sm text-center">
                <img src="${p.photoUrl ? API_BASE+p.photoUrl : 'https://placehold.co/200?text='+p.name[0]}" class="w-40 h-40 mx-auto rounded-full object-cover border-4 border-green-50 shadow-md mb-6">
                <h2 class="text-2xl font-black text-gray-900">${p.name}</h2>
                <span class="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full text-xs font-black mt-2 uppercase tracking-widest">${p.role}</span>
                <div class="mt-8 pt-8 border-t space-y-3">
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-widest">Enrollment No</p>
                    <p class="font-mono text-gray-800 font-bold">${p.id}</p>
                </div>
            </div>
            <div class="flex-1 space-y-8">
                <div class="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 class="text-xl font-black text-green-800 mb-8 uppercase tracking-tighter">Academic Details</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                        ${detailItem('Full Name', p.name)}
                        ${detailItem('Email Address', p.email)}
                        ${detailItem('Phone', p.phone || 'N/A')}
                        ${detailItem('Department', p.department)}
                        ${p.course ? detailItem('Course', p.course) : ''}
                        ${detailItem('Blood Group', p.bloodGroup || 'N/A')}
                    </div>
                </div>
            </div>
        </div>`;
}

function detailItem(label, value) {
    return `<div><p class="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">${label}</p><p class="font-bold text-gray-700">${value}</p></div>`;
}

async function loadTimetable(container) {
    const res = await fetch(`${API_BASE}/timetable?course=${encodeURIComponent(currentUser.course || '')}`);
    const data = await res.json();
    const tt = data.timetable || {};
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase">Weekly Schedule</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${Object.entries(tt).map(([day, slots]) => `
            <div class="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div class="bg-green-600 text-white p-3 font-black text-sm text-center uppercase tracking-widest">${day}</div>
                <div class="p-5 space-y-4">
                    ${slots.map(s => `
                        <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <p class="text-[10px] font-black text-green-600 uppercase mb-1">${s.time}</p>
                            <p class="font-bold text-gray-800">${s.subject}</p>
                            <p class="text-xs text-gray-400 font-medium">${s.faculty}</p>
                        </div>
                    `).join('') || '<p class="text-gray-300 text-center py-6 text-sm font-bold italic">No Classes Scheduled</p>'}
                </div>
            </div>
        `).join('')}
    </div>`;
}

async function loadAttendance(container) {
    const res = await fetch(`${API_BASE}/attendance/${currentUser.id}`);
    const data = await res.json();
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase">Attendance Record</h2>
    <div class="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table class="w-full">
            <tr class="bg-gray-50 text-left">
                <th class="p-5 text-xs font-black text-gray-400 uppercase">Subject</th>
                <th class="p-5 text-xs font-black text-gray-400 uppercase">P / T</th>
                <th class="p-5 text-xs font-black text-gray-400 uppercase text-center">Status</th>
            </tr>
            ${Object.entries(data.attendance || {}).map(([sub, stats]) => {
                const pct = (stats.present / stats.total * 100) || 0;
                return `<tr class="border-t hover:bg-gray-50 transition">
                    <td class="p-5 font-bold text-gray-700">${sub}</td>
                    <td class="p-5 font-mono text-gray-500">${stats.present} / ${stats.total}</td>
                    <td class="p-5 text-center">
                        <span class="px-4 py-1 rounded-full text-[10px] font-black uppercase ${pct < 75 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">${pct.toFixed(1)}%</span>
                    </td>
                </tr>`;
            }).join('') || '<tr><td colspan="3" class="p-20 text-center text-gray-300 font-bold">No Data Available</td></tr>'}
        </table>
    </div>`;
}

async function loadMarks(container) {
    const res = await fetch(`${API_BASE}/marks/${currentUser.id}`);
    const data = await res.json();
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase tracking-tight">Examination Marks</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${(data.marks || []).map(m => `
            <div class="bg-white p-6 rounded-2xl border flex justify-between items-center shadow-sm">
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase mb-1">${m.exam}</p>
                    <p class="font-bold text-gray-800 text-lg">${m.subject}</p>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-black text-green-700">${m.marks}</span>
                    <span class="text-gray-300 font-bold">/ ${m.total}</span>
                </div>
            </div>
        `).join('') || '<div class="col-span-2 p-20 text-center text-gray-300 font-bold">Waiting for Result Declaration</div>'}
    </div>`;
}

async function loadAssignmentsStudent(container) {
    const res = await fetch(`${API_BASE}/assignments?course=${encodeURIComponent(currentUser.course || '')}`);
    const data = await res.json();
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase">Course Assignments</h2>
    <div class="space-y-6">
        ${(data.assignments || []).map(a => `
            <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                         <span class="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-md uppercase uppercase">${a.course}</span>
                         <span class="text-xs text-gray-400 font-bold">Due: ${new Date(a.dueDate).toLocaleDateString()}</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${a.title}</h3>
                    <p class="text-sm text-gray-500 line-clamp-1">${a.description}</p>
                </div>
                <button onclick="openSubmitModal(${a.id})" class="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-green-700 transition shadow-md whitespace-nowrap">UPLOAD WORK</button>
            </div>
        `).join('') || '<p class="text-center py-20 text-gray-300 font-bold uppercase tracking-widest">All Caught Up!</p>'}
    </div>`;
}

async function loadLeavesCommon(container) {
    const res = await fetch(`${API_BASE}/leaves/${currentUser.id}`);
    const data = await res.json();
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-black text-green-900 uppercase">Leave Applications</h2>
            <button onclick="openLeaveModal()" class="bg-green-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm hover:bg-green-700 shadow-lg">+ APPLY NEW</button>
        </div>
        <div class="space-y-4">
            ${(data.leaves || []).map(l => `
                <div class="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center">
                    <div>
                        <p class="text-lg font-bold text-gray-800">${l.type}</p>
                        <p class="text-xs text-gray-400 font-bold">${new Date(l.fromDate).toLocaleDateString()} to ${new Date(l.toDate).toLocaleDateString()}</p>
                    </div>
                    <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${l.status==='Approved'?'bg-green-100 text-green-700':l.status==='Rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}">
                        ${l.status}
                    </span>
                </div>
            `).join('') || '<p class="text-center py-20 text-gray-300 font-bold">No Leave Requests Found</p>'}
        </div>`;
}

// =========================================
// === FEATURE FUNCTIONS (FACULTY) ===
// =========================================

async function loadFacultyAttendance(container) {
    container.innerHTML = `
        <h2 class="text-2xl font-black mb-8 text-green-900 uppercase tracking-tight">Mark Student Attendance</h2>
        <div class="bg-gray-50 p-8 rounded-3xl border border-dashed border-gray-300 mb-8">
            <label class="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">Select Academic Group</label>
            <select id="class-select" onchange="previewAttendanceSheet(this.value)" class="w-full p-4 border rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-green-500 outline-none transition font-bold text-gray-700">
                <option value="">Select Subject and Batch...</option>
            </select>
        </div>
        <div id="attendance-preview-area" class="animate-fadeIn"></div>`;
    const res = await fetch(`${API_BASE}/faculty/attendance/data?facultyId=${currentUser.id}`);
    const data = await res.json();
    const select = document.getElementById('class-select');
    if(!data.assignedSubjects || data.assignedSubjects.length === 0) {
        select.innerHTML = '<option>No subjects assigned to you</option>';
        return;
    }
    data.assignedSubjects.forEach(sub => {
        sub.batchIds.forEach(bid => {
            const opt = document.createElement('option');
            opt.value = `${sub.code},${bid}`;
            opt.textContent = `${sub.name} (${sub.code}) - Batch ${bid}`;
            select.appendChild(opt);
        });
    });
}

async function loadFacultyAssignments(container) {
    const res = await fetch(`${API_BASE}/assignments?facultyId=${currentUser.id}`);
    const data = await res.json();
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-black text-green-900 uppercase">Manage Assignments</h2>
            <button onclick="openCreateAssignModal()" class="bg-green-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm shadow-lg">+ POST NEW</button>
        </div>
        <div class="grid grid-cols-1 gap-6">
            ${(data.assignments || []).map(a => `
                <div class="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-lg text-gray-800">${a.title}</h4>
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">${a.course} • Submissions: ${a.submissions.length}</p>
                    </div>
                    <button class="text-green-600 font-black text-xs uppercase hover:underline">View Submissions</button>
                </div>
            `).join('') || '<p class="text-center py-20 text-gray-300 font-bold">You have not posted any assignments yet</p>'}
        </div>`;
}

async function loadFacultyLeaves(container) {
    const res = await fetch(`${API_BASE}/leaves/pending/${encodeURIComponent(currentUser.department)}?currentUserId=${currentUser.id}`);
    const data = await res.json();
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase">Pending Approvals</h2>
    <div class="space-y-6">
        ${(data.leaves || []).map(l => `
            <div class="bg-white p-8 rounded-3xl border shadow-sm border-yellow-100">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h4 class="font-black text-lg text-gray-900">${l.userId}</h4>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">${l.type} Application</p>
                    </div>
                    <span class="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">${new Date(l.fromDate).toLocaleDateString()} to ${new Date(l.toDate).toLocaleDateString()}</span>
                </div>
                <p class="text-gray-600 italic bg-gray-50 p-4 rounded-xl mb-6">"${l.reason}"</p>
                <div class="flex justify-end space-x-3">
                    <button onclick="updateLeaveStatus(${l.id}, 'Rejected')" class="px-6 py-2 border border-red-100 text-red-500 font-black text-xs rounded-xl hover:bg-red-50 transition">REJECT</button>
                    <button onclick="updateLeaveStatus(${l.id}, 'Approved')" class="px-6 py-2 bg-green-600 text-white font-black text-xs rounded-xl hover:bg-green-700 shadow-md transition">APPROVE</button>
                </div>
            </div>
        `).join('') || '<p class="text-center py-20 text-gray-300 font-bold">All Pending Requests Cleared</p>'}
    </div>`;
}

// =========================================
// === FEATURE FUNCTIONS (ADMIN/HOD) ===
// =========================================

async function loadAdminUsers(container) {
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase">User Directory</h2>
    <div class="bg-white rounded-3xl border shadow-sm overflow-x-auto">
        <table class="w-full">
            <tr class="bg-gray-50 text-left border-b">
                <th class="p-5 text-xs font-black text-gray-400 uppercase">Name/ID</th>
                <th class="p-5 text-xs font-black text-gray-400 uppercase">Role</th>
                <th class="p-5 text-xs font-black text-gray-400 uppercase">Department</th>
                <th class="p-5 text-xs font-black text-gray-400 uppercase">Actions</th>
            </tr>
            ${(data.users || []).map(u => `
                <tr class="border-b hover:bg-gray-50 transition">
                    <td class="p-5"><p class="font-bold">${u.name}</p><p class="text-xs font-mono text-gray-400">${u.id}</p></td>
                    <td class="p-5"><span class="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">${u.role}</span></td>
                    <td class="p-5 text-xs font-bold text-gray-500">${u.department || 'All'}</td>
                    <td class="p-5"><button onclick="deleteUser('${u.id}')" class="text-red-400 hover:text-red-600">🗑️</button></td>
                </tr>
            `).join('')}
        </table>
    </div>`;
}

async function loadAdminAnnouncements(container) {
    const res = await fetch(`${API_BASE}/announcements`);
    const data = await res.json();
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-black text-green-900 uppercase">Portal Announcements</h2>
            <button onclick="openCreateAnnouncementModal()" class="bg-green-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm shadow-lg">+ NEW POST</button>
        </div>
        <div class="space-y-6">
            ${(data.announcements || []).map(a => `
                <div class="bg-white p-8 rounded-3xl border shadow-sm">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-[10px] font-black text-green-600 uppercase tracking-widest">${new Date(a.date).toLocaleDateString()}</span>
                        <span class="bg-gray-100 text-gray-500 text-[9px] font-black px-2 py-0.5 rounded uppercase">Target: ${a.target}</span>
                    </div>
                    <h3 class="text-xl font-black text-gray-900 mb-2 tracking-tight">${a.title}</h3>
                    <p class="text-gray-600 leading-relaxed">${a.body}</p>
                </div>
            `).join('') || '<p class="text-center py-20 text-gray-300 font-bold">No announcements broadcasted yet</p>'}
        </div>`;
}

async function showAdminSignupRequests(container) {
    const res = await fetch(`${API_BASE}/signup-requests/pending`);
    const data = await res.json();
    container.innerHTML = `<h2 class="text-2xl font-black mb-8 text-green-900 uppercase">Pending Approvals</h2>
    <div class="grid grid-cols-1 gap-6">
        ${(data.requests || []).map(r => `
            <div class="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h4 class="font-black text-xl text-gray-900 mb-1">${r.name}</h4>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">${r.role} • ${r.department}</p>
                    <p class="text-[10px] text-gray-400 font-mono mt-1">${r.email}</p>
                </div>
                <div class="flex space-x-3 w-full md:w-auto">
                    <button onclick="manageSignupRequest(${r.id}, 'reject')" class="flex-1 md:flex-none px-6 py-3 border border-red-100 text-red-500 font-black text-xs rounded-2xl hover:bg-red-50 transition uppercase">Reject</button>
                    <button onclick="handleApprovalFlow('${r.id}', '${r.role}', '${r.userId}', '${r.email}')" class="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white font-black text-xs rounded-2xl hover:bg-green-700 shadow-md transition uppercase">Approve</button>
                </div>
            </div>
        `).join('') || '<p class="text-center py-20 text-gray-300 font-bold uppercase tracking-widest italic">All Requests Verified</p>'}
    </div>`;
}

async function loadAdminBatches(container) {
    let url = `${API_BASE}/batches`;
    if(currentUser.role === 'HOD') url += `?department=${encodeURIComponent(currentUser.department)}&adminId=${currentUser.id}`;
    const res = await fetch(url);
    const data = await res.json();
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-black text-green-900 uppercase">Batch Management</h2>
            <div class="flex space-x-3">
                <button onclick="openEnrollBatchModal()" class="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm shadow-md transition hover:bg-blue-700">ENROLL USERS</button>
                <button onclick="openCreateBatchModal()" class="bg-green-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm shadow-lg transition hover:bg-green-700">+ NEW BATCH</button>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${(data.batches || []).map(b => `
                <div class="bg-white p-8 rounded-3xl border shadow-sm group">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-black text-xl text-gray-900">${b.id}</h3>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">${b.department}</p>
                        </div>
                        <button onclick="deleteBatch('${b.id}', '${currentUser.id}')" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">🗑️</button>
                    </div>
                    <div class="pt-4 border-t border-gray-50 flex justify-between text-xs font-black text-gray-400">
                        <span>${b.students.length} STUDENTS</span>
                        <span>${b.subjects.length} SUBJECTS</span>
                    </div>
                </div>
            `).join('') || '<p class="col-span-2 text-center py-20 text-gray-300 font-bold italic">No Academic Batches Defined</p>'}
        </div>`;
}

// =========================================
// === UTILITIES ===
// =========================================

function generateCaptchaText(id) {
    const canvas = document.getElementById(id); if(!canvas) return '';
    const ctx = canvas.getContext('2d');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let text = '';
    ctx.clearRect(0,0,120,40);
    ctx.font = 'bold 22px monospace';
    for(let i=0; i<5; i++) {
        const c = chars.charAt(Math.floor(Math.random()*chars.length));
        text += c;
        ctx.fillStyle = `rgb(${Math.random()*150},${Math.random()*150},${Math.random()*150})`;
        ctx.save(); ctx.translate(15+(i*20), 25+(Math.random()*5)); ctx.rotate((Math.random()-0.5)*0.3);
        ctx.fillText(c, 0, 0); ctx.restore();
    }
    return text;
}
function generateCaptcha() { currentCaptcha = generateCaptchaText('captcha-canvas'); }
function generateLoginCaptcha() { currentLoginCaptcha = generateCaptchaText('login-captcha-canvas'); }

function initAuthDropdowns() {
    const selects = [document.getElementById('login-dept'), document.getElementById('signup-dept')];
    selects.forEach(s => {
        if(s) s.innerHTML = '<option value="">Select Department</option>' + Object.keys(DEPT_DATA).map(d => `<option value="${d}">${d}</option>`).join('');
    });
}

function updateAuthUI() {
    const role = document.getElementById('login-role').value;
    const isHOD = role === 'Department Login';
    document.getElementById('login-dept-wrapper').classList.toggle('hidden', !isHOD);
    if(isHOD && document.getElementById('login-dept').value === 'Department of Engineering') {
        document.getElementById('login-eng-branch-wrapper').classList.remove('hidden');
        document.getElementById('login-eng-branch').innerHTML = DEPT_DATA['Department of Engineering'].branches.map(b => `<option>${b}</option>`).join('');
    } else {
        document.getElementById('login-eng-branch-wrapper').classList.add('hidden');
    }
}

function updateSignupUI() {
    const role = document.getElementById('signup-role').value;
    const dept = document.getElementById('signup-dept').value;
    document.getElementById('signup-dept-wrapper').classList.toggle('hidden', !role);
    document.getElementById('student-fields').classList.toggle('hidden', role !== 'Student');
    if (role === 'Student' && dept) {
        document.getElementById('signup-course-wrapper').classList.remove('hidden');
        document.getElementById('signup-course').innerHTML = (DEPT_DATA[dept]?.courses || []).map(c => `<option value="${c}">${c}</option>`).join('');
    } else {
        document.getElementById('signup-course-wrapper').classList.add('hidden');
    }
}

function toggleAuthScreen(s) { 
    document.getElementById('login-box').classList.toggle('hidden', s!=='login');
    document.getElementById('signup-box').classList.toggle('hidden', s!=='signup');
    s === 'login' ? generateLoginCaptcha() : generateCaptcha();
}

function showToast(m, e=false) {
    const t = document.getElementById('toast');
    t.textContent = m;
    t.className = `fixed bottom-5 right-5 transform translate-y-0 opacity-100 transition-all z-50 px-6 py-3 rounded-2xl shadow-2xl text-white font-bold text-xs uppercase tracking-widest ${e?'bg-red-600':'bg-green-600'}`;
    setTimeout(() => t.classList.add('translate-y-full', 'opacity-0'), 3500);
}

function handleAuth(endpoint, payload, isSignup = false) {
    fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(r => r.json()).then(data => {
        if (data.success) {
            if (isSignup) {
                showToast('Registration Success! Pending Approval');
                toggleAuthScreen('login');
            } else {
                currentUser = data.user;
                sessionStorage.setItem('user', JSON.stringify(currentUser));
                showDashboard();
            }
        } else {
            showToast(data.message || 'Verification Failed', true);
            isSignup ? generateCaptcha() : generateLoginCaptcha();
        }
    }).catch(() => showToast('Server unreachable', true));
}

function showDashboard() {
    document.getElementById('auth-wrapper').style.display = 'none';
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('nav-role-badge').textContent = currentUser.role;
    renderNavigation();
}

function renderNavigation() {
    const nav = document.getElementById('nav-links');
    nav.innerHTML = '';
    const MENU = {
        'Student': [{id:'profile', l:'Profile', i:'👤'}, {id:'timetable', l:'Timetable', i:'📅'}, {id:'attendance', l:'Attendance', i:'📊'}, {id:'assignments', l:'Assignments', i:'📁'}, {id:'marks', l:'Results', i:'📝'}, {id:'leaves', l:'Leaves', i:'📨'}],
        'Faculty': [{id:'profile', l:'Profile', i:'👤'}, {id:'fac-attendance', l:'Attendance', i:'✅'}, {id:'fac-assignments', l:'Assignments', i:'📚'}, {id:'fac-leaves', l:'Student Leaves', i:'📫'}],
        'HOD': [{id:'profile', l:'Profile', i:'👤'}, {id:'admin-batches', l:'Batches', i:'👥'}, {id:'admin-signup-requests', l:'Approvals', i:'✋'}, {id:'fac-leaves', l:'Leaves', i:'✅'}],
        'Admin': [{id:'profile', l:'Profile', i:'👤'}, {id:'admin-users', l:'Users', i:'👥'}, {id:'admin-announcements', l:'Announce', i:'📢'}, {id:'admin-signup-requests', l:'New Approvals', i:'✋'}, {id:'admin-batches', l:'Batches', i:'👥'}]
    };
    (MENU[currentUser.role] || []).forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'nav-link w-full flex items-center space-x-3';
        btn.innerHTML = `<span class="text-lg">${item.i}</span><span class="font-bold text-sm">${item.l}</span>`;
        btn.onclick = () => loadContent(item.id, btn);
        nav.appendChild(btn);
    });
    if (nav.firstChild) nav.firstChild.click();
}

// Global UI helpers
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('-translate-x-full'); }
function toggleChatbot() { document.getElementById('chatbot-modal').classList.toggle('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
function togglePass(id) { const i = document.getElementById(id); i.type = i.type === 'password' ? 'text' : 'password'; }
function logout() { sessionStorage.clear(); location.reload(); }
function addMessageToChat(text, isUser) {
    const history = document.getElementById('chat-history');
    const msg = document.createElement('div');
    msg.className = isUser ? 'flex justify-end' : 'flex justify-start';
    msg.innerHTML = `<div class="${isUser?'bg-green-600 text-white rounded-br-none':'bg-gray-200 text-gray-800 rounded-bl-none'} p-3 rounded-2xl max-w-[80%] text-xs font-bold shadow-sm">${text}</div>`;
    history.appendChild(msg);
    history.scrollTop = history.scrollHeight;
}

// Modal Handlers (Submit work, Apply leave, etc)
window.openLeaveModal = () => showModal(`<h3 class="text-xl font-black mb-6 uppercase text-green-900">Request Leave</h3><form onsubmit="event.preventDefault(); submitLeave(this)" class="space-y-4"><select name="type" class="w-full p-3 border rounded-xl font-bold"><option>Sick Leave</option><option>Casual Leave</option><option>Emergency</option></select><div class="grid grid-cols-2 gap-4"><input type="date" name="fromDate" required class="p-3 border rounded-xl font-bold"><input type="date" name="toDate" required class="p-3 border rounded-xl font-bold"></div><textarea name="reason" placeholder="Reason for leave..." required class="w-full p-3 border rounded-xl h-32 font-medium"></textarea><button type="submit" class="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase shadow-lg">SUBMIT APPLICATION</button></form>`);
async function submitLeave(form) {
    const fd = Object.fromEntries(new FormData(form));
    const res = await fetch(`${API_BASE}/leaves`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({userId:currentUser.id, department:currentUser.department, ...fd}) });
    const data = await res.json();
    showToast(data.message || 'Submitted'); closeModal(); loadContent('leaves');
}
window.openSubmitModal = (id) => showModal(`<h3 class="text-xl font-black mb-6 uppercase text-blue-900">Upload Assignment</h3><form onsubmit="event.preventDefault(); submitWork(this, ${id})" class="space-y-4"><input type="file" name="submissionFile" required class="w-full p-4 border border-dashed rounded-xl bg-gray-50"><button type="submit" class="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg uppercase">UPLOAD & SUBMIT</button></form>`);
async function submitWork(form, id) {
    const fd = new FormData(form); fd.append('studentId', currentUser.id); fd.append('studentName', currentUser.name);
    await fetch(`${API_BASE}/assignments/${id}/submit`, { method: 'POST', body: fd });
    showToast('Work Submitted Successfully'); closeModal(); loadContent('assignments');
}

// Admin Logic
window.manageSignupRequest = async (id, action) => {
    const res = await fetch(`${API_BASE}/signup-requests/${id}/${action}`, { method: 'POST' });
    const data = await res.json(); showToast(data.message); loadContent('admin-signup-requests');
};
window.handleApprovalFlow = (id, role, currentId, email) => {
    if(role === 'Student') { manageSignupRequest(id, 'approve'); return; }
    showModal(`<h3 class="text-xl font-black mb-4 uppercase">Assign Official ID</h3><form onsubmit="event.preventDefault(); submitApprovalWithId('${id}', this.newId.value)" class="space-y-4"><input type="text" name="newId" value="${role==='Faculty'?'F':'HOD'}" required class="w-full p-3 border rounded-xl font-bold"><button class="w-full bg-green-600 text-white py-3 rounded-xl font-black">CONFIRM & APPROVE</button></form>`);
};
async function submitApprovalWithId(id, newId) {
    await fetch(`${API_BASE}/signup-requests/${id}/approve`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({newUserId: newId}) });
    showToast('User Approved'); closeModal(); loadContent('admin-signup-requests');
}
async function updateLeaveStatus(id, status) {
    await fetch(`${API_BASE}/leaves/${id}/action`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status}) });
    showToast(`Leave ${status}`); loadContent('fac-leaves');
}
async function deleteUser(id) {
    if(!confirm('Delete this user?')) return;
    await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    showToast('User Removed'); loadContent('admin-users');
}
async function submitAttendanceSheet(e, bid, sub) {
    e.preventDefault(); showToast('Submitting Attendance...');
    const fd = new FormData(e.target);
    for (const [key, status] of fd.entries()) {
        if (key.startsWith('status_')) {
            const sid = key.split('_')[1];
            await fetch(`${API_BASE}/attendance/mark`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ facultyId: currentUser.id, batchId: bid, subjectCode: sub, studentId: sid, status }) });
        }
    }
    showToast('Attendance Recorded'); loadContent('fac-attendance');
}

function showModal(html) { document.getElementById('modal-content').innerHTML = html; document.getElementById('modal').classList.remove('hidden'); }

</script>
</body>
</html>