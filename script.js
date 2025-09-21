// --- UTILITY FUNCTIONS ---
const API_BASE_URL = '';

// Data for dynamic course selection in the signup form
const departmentCourses = {
    "Department of Engineering": [
        "Bachelor of Technology - Civil Engineering (CE)",
        "Bachelor of Technology - Computer Science & Engineering (CSE)",
        "Bachelor of Technology - CSE (Artificial Intelligence & Machine Learning)",
        "Bachelor of Technology - CSE (Cyber Security)",
        "Bachelor of Technology - CSE (Data Science)",
        "Bachelor of Technology - Electronics & Communication Engineering (ECE)",
        "Bachelor of Technology - Electrical & Electronics Engineering (EEE)",
        "Bachelor of Technology - Mechanical Engineering (ME)",
        "Diploma in Civil Engineering",
        "Diploma in Mechanical Engineering",
        "Diploma in Computer Science Engineering",
        "Masters in Technology"
    ],
    "Department of Applied Sciences and Humanities": [
        "Applied Sciences and Humanities"
    ],
    "Department of Agriculture": [
        "B.Sc Agriculture"
    ],
    "Department of Journalism and Communications": [
        "BA (Hons.) Journalism and Mass Communication"
    ],
    "Graduate School of Business": [
        "Bachelor of Business Administration (BBA)",
        "Bachelor of Commerce (B.Com Hons.)",
        "Master of Business Administration (MBA)"
    ],
    "Department of Computer Applications": [
        "Bachelor of Computer Applications (BCA)",
        "Master of Computer Applications (MCA)"
    ],
    "Tula's Institute of Pharmacy": [
        "Bachelor of Pharmacy (B.Pharm)",
        "Diploma in Pharmacy (D.Pharm)"
    ]
};

// Function to show toast notifications
function showNotification(message, isError = false) {
    const toast = document.getElementById('notification-toast');
    const messageP = document.getElementById('notification-message');
    if (!toast || !messageP) return;
    messageP.textContent = message;
    toast.className = 'fixed bottom-20 md:bottom-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg transition-all duration-500 transform z-50';
    toast.classList.add(isError ? 'bg-red-600' : 'bg-green-600');
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.transform = 'translateY(5rem)';
        toast.style.opacity = '0';
    }, 4000);
}

// Helper to render a loading spinner
function renderLoader(container) {
    container.innerHTML = `<div class="loader"></div>`;
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    
    // --- All Element Selectors ---
    const roleSelect = document.getElementById('role');
    const departmentSelectContainer = document.getElementById('department-select-container');
    const departmentSelect = document.getElementById('department');
    const engineeringDeptSelectContainer = document.getElementById('engineering-dept-select-container');
    const loginForm = document.getElementById('loginForm');
    const userIdInput = document.getElementById('userId');
    const passwordInput = document.getElementById('password');
    const dashboardContainer = document.getElementById('dashboard-container');
    const logoutButton = document.getElementById('logout-button');
    const headerProfilePic = document.getElementById('header-profile-pic');
    const welcomeMessage = document.getElementById('welcome-message');
    const userRoleDisplay = document.getElementById('user-role');
    const desktopNavContainer = document.getElementById('sidebar-nav-links-desktop');
    const mobileNavContainer = document.getElementById('footer-nav-links-mobile');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const togglePassword = document.getElementById('toggle-password');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLinkFromSignup = document.getElementById('show-login-link-from-signup');
    const showForgotPasswordLink = document.getElementById('show-forgot-password-link');
    const showLoginLinkFromForgot = document.getElementById('show-login-link-from-forgot');
    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const resetPasswordContainer = document.getElementById('reset-password-container');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    
    // --- LOGIN & DASHBOARD LOGIC (Unchanged) ---
    function updateDepartmentVisibility() {
        const isDeptLogin = roleSelect.value === 'Department Login';
        const isEngineeringSelected = departmentSelect.value === 'Department of Engineering';
        departmentSelectContainer.classList.toggle('hidden', !isDeptLogin);
        engineeringDeptSelectContainer.classList.toggle('hidden', !isDeptLogin || !isEngineeringSelected);
        const isAdminSelected = roleSelect.value === 'Admin';
        document.getElementById('show-forgot-password-link').parentElement.classList.toggle('hidden', isAdminSelected);
        document.getElementById('show-signup-link').parentElement.classList.toggle('hidden', isAdminSelected);
    }
    roleSelect.addEventListener('change', updateDepartmentVisibility);
    departmentSelect.addEventListener('change', updateDepartmentVisibility);
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = userIdInput.value.trim();
        const password = passwordInput.value.trim();
        const selectedRole = roleSelect.value;
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = '';
        let department = null;
        if (selectedRole === 'Department Login') {
            const mainDepartmentValue = departmentSelect.value;
            if (mainDepartmentValue === 'Department of Engineering') {
                department = document.getElementById('engineering-dept').value;
                if (!department) {
                    errorMessage.textContent = 'Please select an engineering branch.';
                    return;
                }
            } else { department = mainDepartmentValue; }
        }
        if (!userId || !password) {
            errorMessage.textContent = 'Please enter both User ID and Password.';
            return;
        }
        const roleForBackend = selectedRole === 'Department Login' ? 'HOD' : selectedRole;
        const loginPayload = { userId, password, role: roleForBackend, department };
        try {
            const response = await fetch(`${API_BASE_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginPayload) });
            const data = await response.json();
            if (response.ok) {
                sessionStorage.setItem('loggedInUser', JSON.stringify(data.user));
                sessionStorage.setItem('userId', data.user.id);
                showDashboard(data.user);
            } else { errorMessage.textContent = data.message || 'Login failed.'; }
        } catch (error) { errorMessage.textContent = 'Could not connect to the server.'; }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const signupMessage = document.getElementById('signup-message');
        signupMessage.textContent = 'Submitting...';
        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            signupMessage.className = response.ok ? 'text-green-600 text-center' : 'text-red-500 text-center';
            signupMessage.textContent = result.message;
            if (response.ok) {
                signupForm.reset();
                document.getElementById('signup-department-container').classList.add('hidden');
                document.getElementById('signup-course-container').classList.add('hidden');
            }
        } catch (error) {
            signupMessage.className = 'text-red-500 text-center';
            signupMessage.textContent = 'Could not connect to the server.';
        }
    });

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const messageEl = document.getElementById('forgot-password-message');
        messageEl.textContent = 'Sending reset link...';
        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            messageEl.className = response.ok ? 'text-green-600 text-center' : 'text-red-500 text-center';
            messageEl.textContent = result.message || 'Request failed.';
            if(response.ok) forgotPasswordForm.reset();
        } catch (error) {
            messageEl.className = 'text-red-500 text-center';
            messageEl.textContent = 'Could not connect to server.';
        }
    });

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const messageEl = document.getElementById('reset-password-message');
        if(data.newPassword !== data.confirmPassword){
            messageEl.className = 'text-red-500 text-center';
            messageEl.textContent = 'Passwords do not match.';
            return;
        }
        messageEl.textContent = 'Resetting password...';
        try {
            const response = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            messageEl.className = response.ok ? 'text-green-600 text-center' : 'text-red-500 text-center';
            messageEl.textContent = result.message || 'Failed to reset password.';
            if(response.ok) {
                setTimeout(() => showAuthPage(loginContainer), 2000);
            }
        } catch(error) {
             messageEl.className = 'text-red-500 text-center';
             messageEl.textContent = 'Could not connect to server.';
        }
    });
    
    function showAuthPage(pageToShow) {
        loginContainer.classList.add('hidden');
        signupContainer.classList.add('hidden');
        forgotPasswordContainer.classList.add('hidden');
        resetPasswordContainer.classList.add('hidden');
        pageToShow.classList.remove('hidden');
    }

    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(signupContainer); });
    showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(forgotPasswordContainer); });
    showLoginLinkFromSignup.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(loginContainer); });
    showLoginLinkFromForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(loginContainer); });

    logoutButton.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/'; // Go to root to clear params
    });

    togglePassword.addEventListener('click', () => {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        togglePassword.querySelectorAll('svg').forEach(svg => svg.classList.toggle('hidden'));
    });

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar-nav');
            sidebar.classList.toggle('hidden');
        });
    }

    // --- SIGNUP LOGIC FOR DYNAMIC DROPDOWNS ---
    const signupRoleSelect = document.getElementById('signup-role');
    const signupDepartmentContainer = document.getElementById('signup-department-container');
    const signupDepartmentSelect = signupDepartmentContainer.querySelector('select');
    const signupCourseContainer = document.getElementById('signup-course-container');
    const signupCourseSelect = signupCourseContainer.querySelector('select');

    if (signupRoleSelect) {
        signupRoleSelect.addEventListener('change', (e) => {
            const selectedRole = e.target.value;
            signupDepartmentContainer.classList.toggle('hidden', selectedRole === '');
            if (selectedRole !== 'Student') {
                signupCourseContainer.classList.add('hidden');
            } else {
                signupDepartmentSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    if (signupDepartmentSelect) {
        signupDepartmentSelect.addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            signupCourseSelect.innerHTML = '<option value="">Select Course</option>';
            const courses = departmentCourses[selectedDepartment];
            if (signupRoleSelect.value === 'Student' && courses) {
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course;
                    option.textContent = course;
                    signupCourseSelect.appendChild(option);
                });
                signupCourseContainer.classList.remove('hidden');
            } else {
                signupCourseContainer.classList.add('hidden');
            }
        });
    }

    function showDashboard(user) {
        document.getElementById('login-signup-wrapper').classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        welcomeMessage.textContent = `Welcome, ${user.name}`;
        userRoleDisplay.textContent = `${user.role}${user.role === 'HOD' ? ` (${user.department})` : ''}`;
        const photoUrl = user.photoUrl ? `${API_BASE_URL}${user.photoUrl}` : 'https://placehold.co/40x40/a0aec0/ffffff?text=U';
        headerProfilePic.src = photoUrl;
        headerProfilePic.onerror = () => { headerProfilePic.src = 'https://placehold.co/40x40/a0aec0/ffffff?text=U'; };
        const roleDashboards = {
            'Student': populateStudentDashboard,
            'Faculty': populateFacultyDashboard,
            'HOD': populateHODDashboard,
            'Admin': populateAdminDashboard
        };
        if(roleDashboards[user.role]) {
            roleDashboards[user.role]();
        }
    }

    function populateNav(links) {
        desktopNavContainer.innerHTML = '';
        mobileNavContainer.innerHTML = '';
        links.forEach(linkInfo => {
            const dLink = document.createElement('a');
            dLink.href = '#';
            dLink.className = 'nav-link flex items-center px-4 py-2 mt-2 text-gray-100 rounded-lg hover:bg-green-700';
            dLink.dataset.target = linkInfo.target;
            dLink.innerHTML = `<span>${linkInfo.name}</span>`;
            desktopNavContainer.appendChild(dLink);
            const mLink = document.createElement('a');
            mLink.href = '#';
            mLink.className = 'nav-link flex-1 text-center px-2 py-2 text-sm text-gray-200 rounded hover:bg-green-700';
            mLink.dataset.target = linkInfo.target;
            mLink.textContent = linkInfo.name;
            mobileNavContainer.appendChild(mLink);
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.dataset.target;
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-green-700'));
                document.querySelectorAll(`.nav-link[data-target="${target}"]`).forEach(l => l.classList.add('active', 'bg-green-700'));
                loadMainContent(target);
                const sidebar = document.getElementById('sidebar-nav');
                if (window.innerWidth < 768 && !sidebar.classList.contains('hidden')) {
                    sidebar.classList.add('hidden');
                }
            });
        });
    }

    function loadMainContent(target) {
        const functions = {
            'user-profile': showUserProfile,
            'student-analytics': showStudentAnalytics,
            'student-assignments': showStudentAssignments,
            'student-attendance': showStudentAttendance,
            'student-fees': showStudentFees,
            'student-timetable': showStudentTimetable,
            'student-id-card': showStudentIdCard,
            'student-announcements': displayAnnouncements,
            'student-leave': showStudentLeave,
            'faculty-assignments': showFacultyAssignments,
            'faculty-timetable': showFacultyTimetable,
            'faculty-attendance': showFacultyAttendance,
            'faculty-marks': showFacultyMarks,
            'faculty-search': showFacultySearch,
            'faculty-ml-insights': showFacultyMLInsights,
            'faculty-announcements': displayAnnouncements,
            'faculty-leave': showFacultyLeave,
            'hod-dashboard': showHODDashboard,
            'hod-faculty': showHODFaculty,
            'hod-announcements': displayAnnouncements,
            'admin-announce': displayAnnouncements,
            'admin-manage-users': showAdminManageUsers,
            'admin-timetables': showAdminTimetables,
            'admin-id-requests': showAdminIdRequests,
            'admin-signup-requests': showAdminSignupRequests,
            'admin-password-requests': showAdminPasswordRequests,
        };
        const func = functions[target];
        if (func) func();
        else mainContent.innerHTML = `<div class="p-4 bg-white rounded-lg shadow">Page for target '${target}' is not yet implemented.</div>`;
    }

    function setDefaultPage(links) {
        if (links.length > 0) {
            const defaultTarget = links[0].target;
            document.querySelectorAll(`.nav-link[data-target="${defaultTarget}"]`).forEach(l => l.classList.add('active', 'bg-green-700'));
            loadMainContent(defaultTarget);
        }
    }

    function populateStudentDashboard() {
        const links = [
            { name: 'My Profile', target: 'user-profile'},
            { name: 'Announcements', target: 'student-announcements'},
            { name: 'My Analytics', target: 'student-analytics'},
            { name: 'Assignments', target: 'student-assignments'},
            { name: 'Attendance', target: 'student-attendance'},
            { name: 'Apply for Leave', target: 'student-leave'},
            { name: 'Fee Details', target: 'student-fees'},
            { name: 'Timetable', target: 'student-timetable'},
            { name: 'ID Card', target: 'student-id-card'},
        ];
        populateNav(links);
        setDefaultPage(links);
    }
    function populateFacultyDashboard() {
        const links = [
            { name: 'My Profile', target: 'user-profile' },
            { name: 'Announcements', target: 'faculty-announcements' },
            { name: 'Assignments', target: 'faculty-assignments' },
            { name: 'Leave Requests', target: 'faculty-leave' },
            { name: 'ML Insights', target: 'faculty-ml-insights' },
            { name: 'Attendance', target: 'faculty-attendance' },
            { name: 'Marks', target: 'faculty-marks' },
            { name: 'Search Student', target: 'faculty-search' },
        ];
        populateNav(links);
        setDefaultPage(links);
    }
    function populateAdminDashboard() {
        const links = [
            { name: 'Announcements', target: 'admin-announce' },
            { name: 'Manage Users', target: 'admin-manage-users' },
            { name: 'ID Card Requests', target: 'admin-id-requests' },
            { name: 'Timetables', target: 'admin-timetables'},
            { name: 'Sign-up Requests', target: 'admin-signup-requests'},
            { name: 'Password Requests', target: 'admin-password-requests'}
        ];
        populateNav(links);
        setDefaultPage(links);
    }
    function populateHODDashboard() {
        const links = [
            { name: 'Department', target: 'hod-dashboard' },
            { name: 'Manage Faculty', target: 'hod-faculty' },
            { name: 'Announcements', target: 'hod-announcements' },
            { name: 'Sign-up Requests', target: 'admin-signup-requests' },
            { name: 'Search Student', target: 'faculty-search' },
            { name: 'My Profile', target: 'user-profile' }
        ];
        populateNav(links);
        setDefaultPage(links);
    }

    // --- CONTENT RENDERING FUNCTIONS ---
    async function showUserProfile() {
        renderLoader(mainContent);
        const userId = sessionStorage.getItem('userId');
        try {
            const response = await fetch(`${API_BASE_URL}/profile/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data = await response.json();
            const profile = data.profile;
            const profilePhoto = profile.photoUrl ? `${API_BASE_URL}${profile.photoUrl}` : 'https://placehold.co/150x150/a0aec0/ffffff?text=Photo';
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto"><div id="profile-view"><div class="flex flex-col md:flex-row items-center md:items-start text-center md:text-left"><img src="${profilePhoto}" alt="Profile Photo" class="w-40 h-40 rounded-full mb-4 md:mb-0 md:mr-8 border-4 border-green-500 object-cover"><div class="flex-grow"><h2 class="text-3xl font-bold">${profile.name}</h2><p class="text-lg text-gray-600">${profile.role}${profile.department ? ` - ${profile.department}` : ''}</p></div></div><hr class="my-6"><div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-left">${Object.entries(profile).filter(([k])=>!['pass','name','role','photoUrl','id'].includes(k)).map(([k,v])=>`<div class="flex flex-col"><span class="text-sm font-semibold text-gray-500 uppercase">${k.replace(/([A-Z])/g,' $1').trim()}</span><span class="text-lg">${v||'N/A'}</span></div>`).join('')}</div><div class="text-left mt-8"><button id="edit-profile-btn" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">Edit Profile</button></div></div><div id="profile-edit" class="hidden"></div></div>`;
            document.getElementById('edit-profile-btn').addEventListener('click', () => showUserProfileEditForm(profile));
        } catch (error) {
            mainContent.innerHTML = `<div class="text-center text-red-500 p-8 bg-white rounded-lg shadow">Error loading profile data.</div>`;
        }
    }

    function showUserProfileEditForm(profile) {
        document.getElementById('profile-view').classList.add('hidden');
        const editContainer = document.getElementById('profile-edit');
        editContainer.classList.remove('hidden');
        editContainer.innerHTML = `<h2 class="text-2xl font-bold mb-4">Edit Your Profile</h2><form id="edit-profile-form"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="md:col-span-2"><label class="block">Upload New Photo</label><input type="file" name="photoFile" accept="image/*" class="w-full mt-1 p-2 border rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"></div><div><label class="block">Full Name</label><input type="text" name="name" value="${profile.name||''}" class="w-full mt-1 p-2 border rounded"></div><div><label class="block">Email</label><input type="email" name="email" value="${profile.email||''}" class="w-full mt-1 p-2 border rounded"></div><div><label class="block">Phone Number</label><input type="text" name="phone" value="${profile.phone||''}" class="w-full mt-1 p-2 border rounded"></div><div><label class="block">Blood Group</label><input type="text" name="bloodGroup" value="${profile.bloodGroup||''}" class="w-full mt-1 p-2 border rounded"></div></div><div class="mt-6 flex gap-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg">Save</button><button type="button" id="cancel-edit-btn" class="bg-gray-400 text-white px-6 py-2 rounded-lg">Cancel</button></div></form>`;
        document.getElementById('cancel-edit-btn').addEventListener('click', () => { document.getElementById('profile-view').classList.remove('hidden'); editContainer.classList.add('hidden'); });
        document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            formData.append('userId', sessionStorage.getItem('userId'));
            try {
                const response = await fetch(`${API_BASE_URL}/profile/update`, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success) {
                    showNotification('Profile updated!');
                    sessionStorage.setItem('loggedInUser', JSON.stringify(result.updatedUser));
                    const newPhotoUrl = result.updatedUser.photoUrl ? `${API_BASE_URL}${result.updatedUser.photoUrl}` : 'https://placehold.co/40x40/a0aec0/ffffff?text=U';
                    headerProfilePic.src = `${newPhotoUrl}?t=${new Date().getTime()}`; // bust cache
                    showUserProfile();
                } else { showNotification('Failed to update profile.', true); }
            } catch (error) { showNotification("Could not connect to server.", true); }
        });
    }

    async function showStudentAnalytics() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">My Analytics</h2><p>This section will feature interactive charts and graphs to visualize your academic performance, attendance trends, and assignment scores. Check back soon for updates!</p></div>`;
    }
    async function showStudentAssignments() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/assignments');
            const data = await response.json();
            const assignmentsHTML = (data.assignments || []).map(assign => `<div class="bg-white p-6 rounded-lg shadow-md mb-4"><div class="flex justify-between items-center"><h3 class="font-bold text-xl">${assign.title}</h3><span class="text-sm text-gray-500">Due: ${new Date(assign.dueDate).toLocaleDateString()}</span></div><p class="text-gray-600 my-2">${assign.description || ''}</p><div class="text-sm text-gray-500 border-t pt-2 mt-2"><span>Posted by: <strong>${assign.authorName}</strong></span>${assign.filePath ? ` | <a href="${assign.filePath}" target="_blank" class="text-green-600 hover:underline">Download Attachment</a>` : ''}</div></div>`).join('');
            mainContent.innerHTML = `<h2 class="text-2xl font-bold mb-4">Your Assignments</h2>${assignmentsHTML || '<div class="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">No assignments have been posted.</div>'}`;
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load assignments.</div>';
        }
    }
    async function showStudentAttendance() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">My Attendance</h2><p>A detailed, subject-wise breakdown of your attendance record will be available here soon.</p></div>`;
    }
    async function showStudentFees() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Fee Details</h2><p>Soon, you will be able to view your complete fee payment history, download receipts, and pay outstanding dues directly from this portal.</p></div>`;
    }
    async function showStudentTimetable() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">My Timetable</h2><p>Your weekly class schedule, including subjects, timings, and faculty details, will be displayed in a calendar format here.</p></div>`;
    }
    async function showStudentIdCard() {
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        mainContent.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-md max-w-lg mx-auto">
                <h2 class="text-2xl font-bold mb-6 text-center">My ID Card</h2>
                <div class="border-2 border-gray-200 rounded-lg p-4 flex flex-col items-center space-y-4">
                    <img src="${user.photoUrl || 'https://placehold.co/150x150/a0aec0/ffffff?text=Photo'}" alt="Student Photo" class="w-32 h-32 rounded-lg object-cover border">
                    <div class="text-center">
                        <p class="font-bold text-lg">${user.name}</p>
                        <p class="text-sm text-gray-600">${user.role}</p>
                        <p class="text-sm text-gray-600">ID: ${user.id}</p>
                        <p class="text-sm text-gray-600">${user.department || ''}</p>
                    </div>
                </div>
                <div class="mt-6 text-center">
                    <button class="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600">Request a New Physical Card</button>
                    <p class="text-xs text-gray-400 mt-2">Note: This is a digital card for viewing purposes only.</p>
                </div>
            </div>
        `;
    }
    async function showStudentLeave() {
        renderLoader(mainContent);
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const response = await fetch('/leave-requests');
            const data = await response.json();
            const myRequests = (data.leaveRequests || []).filter(r => r.studentId === user.id);
            const requestsHTML = myRequests.map(req => `<tr class="border-b"><td class="p-2">${new Date(req.startDate).toLocaleDateString()}</td><td class="p-2">${new Date(req.endDate).toLocaleDateString()}</td><td class="p-2">${req.reason}</td><td class="p-2"><span class="px-2 py-1 text-xs rounded-full ${ req.status === 'Approved' ? 'bg-green-100 text-green-800' : req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800' }">${req.status}</span></td></tr>`).join('');
            mainContent.innerHTML = `<div class="grid md:grid-cols-2 gap-8"><div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Apply for Leave</h2><form id="leave-form"><div class="mb-4"><label class="block text-sm">Start Date</label><input type="date" id="start-date" required class="w-full p-2 border rounded"></div><div class="mb-4"><label class="block text-sm">End Date</label><input type="date" id="end-date" required class="w-full p-2 border rounded"></div><div class="mb-4"><label class="block text-sm">Reason</label><textarea id="reason" rows="4" required class="w-full p-2 border rounded"></textarea></div><button type="submit" class="w-full bg-green-600 text-white py-2 rounded">Submit Request</button></form></div><div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">My Leave Requests</h2><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="bg-gray-100"><th class="p-2">Start</th><th class="p-2">End</th><th class="p-2">Reason</th><th class="p-2">Status</th></tr></thead><tbody>${requestsHTML || '<tr><td colspan="4" class="p-4 text-center text-gray-500">No requests submitted.</td></tr>'}</tbody></table></div></div></div>`;
            document.getElementById('leave-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const requestData = { studentId: user.id, studentName: user.name, startDate: document.getElementById('start-date').value, endDate: document.getElementById('end-date').value, reason: document.getElementById('reason').value, };
                const response = await fetch('/leave-requests', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(requestData) });
                if (response.ok) { showNotification('Leave request submitted!'); showStudentLeave(); } else { showNotification('Failed to submit request.', true); }
            });
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load leave information.</div>';
        }
    }
    async function showFacultyAssignments() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/assignments');
            const data = await response.json();
            const assignmentsHTML = (data.assignments || []).map(assign => `<div class="bg-gray-50 p-4 rounded-md border mb-3"><h4 class="font-bold">${assign.title}</h4><p class="text-sm text-gray-600">Due: ${new Date(assign.dueDate).toLocaleDateString()}</p>${assign.filePath ? `<a href="${assign.filePath}" target="_blank" class="text-sm text-green-600">View Attachment</a>` : ''}</div>`).join('');
            mainContent.innerHTML = `<div class="grid md:grid-cols-2 gap-8"><div><div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Create Assignment</h2><form id="assignment-form" enctype="multipart/form-data"><div class="mb-4"><label class="block text-sm">Title</label><input type="text" name="title" required class="w-full p-2 border rounded"></div><div class="mb-4"><label class="block text-sm">Description</label><textarea name="description" rows="3" class="w-full p-2 border rounded"></textarea></div><div class="mb-4"><label class="block text-sm">Due Date</label><input type="date" name="dueDate" required class="w-full p-2 border rounded"></div><div class="mb-4"><label class="block text-sm">Attachment (Optional)</label><input type="file" name="assignmentFile" class="w-full"></div><button type="submit" class="w-full bg-green-600 text-white py-2 rounded">Create</button></form></div></div><div><div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Posted Assignments</h2>${assignmentsHTML || '<p class="text-gray-500">No assignments posted yet.</p>'}</div></div></div>`;
            document.getElementById('assignment-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
                const formData = new FormData(e.target);
                formData.append('authorName', user.name);
                formData.append('authorId', user.id);
                const response = await fetch('/assignments', { method: 'POST', body: formData });
                if (response.ok) { showNotification('Assignment created!'); showFacultyAssignments(); } else { showNotification('Failed to create assignment.', true); }
            });
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load assignments.</div>';
        }
    }
    async function showFacultyLeave() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/leave-requests');
            const data = await response.json();
            const requestsHTML = (data.leaveRequests || []).map(req => `<tr class="border-b"><td class="p-2">${req.studentName} (${req.studentId})</td><td class="p-2">${new Date(req.startDate).toLocaleDateString()} to ${new Date(req.endDate).toLocaleDateString()}</td><td class="p-2">${req.reason}</td><td class="p-2">${req.status === 'Pending' ? `<button data-id="${req.id}" data-status="Approved" class="resolve-leave-btn bg-green-500 text-white text-xs px-2 py-1 rounded">Approve</button><button data-id="${req.id}" data-status="Rejected" class="resolve-leave-btn bg-red-500 text-white text-xs px-2 py-1 rounded ml-1">Reject</button>` : req.status}</td></tr>`).join('');
            mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Student Leave Requests</h2><table class="w-full text-left text-sm"><thead><tr class="bg-gray-100"><th class="p-2">Student</th><th class="p-2">Dates</th><th class="p-2">Reason</th><th class="p-2">Status / Action</th></tr></thead><tbody>${requestsHTML || '<tr><td colspan="4" class="p-4 text-center text-gray-500">No leave requests.</td></tr>'}</tbody></table></div>`;
            document.querySelectorAll('.resolve-leave-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const { id, status } = e.target.dataset;
                    const response = await fetch('/resolve-leave-request', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, status}) });
                    if (response.ok) { showNotification(`Request has been ${status}.`); showFacultyLeave(); } else { showNotification('Action failed.', true); }
                });
            });
        } catch(error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load leave requests.</div>';
        }
    }

    function showFacultyTimetable() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">My Timetable</h2><p>Your complete teaching schedule for the semester, including class timings and locations, will be available here shortly.</p></div>`;
    }
    function showFacultyAttendance() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Mark Attendance</h2><p>This module will soon allow you to take and manage daily student attendance for your classes digitally.</p></div>`;
    }
    function showFacultyMarks() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Enter Marks</h2><p>A comprehensive portal for entering, editing, and finalizing student marks for various assessments is currently under development.</p></div>`;
    }
    function showFacultySearch() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Search Student</h2><p>A powerful search tool to find student profiles, academic records, and contact information will be activated soon.</p></div>`;
    }
    function showFacultyMLInsights() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">ML Insights</h2><p>This advanced feature is in development. Soon, it will provide AI-powered analytics on student performance to help identify at-risk students and predict academic outcomes.</p></div>`;
    }
    function showHODDashboard() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Department Dashboard</h2><p>An overview of department statistics, including student enrollment, faculty workload, and overall academic performance, is being developed.</p></div>`;
    }
    function showHODFaculty() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Manage Faculty</h2><p>A tool to view faculty profiles, assign subjects, and manage workload within your department is coming soon.</p></div>`;
    }
    async function showAdminManageUsers() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/users');
            const data = await response.json();
            if (!data.success) throw new Error('Failed to fetch users');
            const usersHTML = data.users.map(user => `<tr class="border-b"><td class="p-2">${user.name}</td><td class="p-2">${user.id}</td><td class="p-2">${user.role}</td><td class="p-2">${user.department || 'N/A'}</td><td class="p-2"><button data-userid="${user.id}" class="delete-user-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button></td></tr>`).join('');
            mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Manage Users</h2><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="bg-gray-100"><th class="p-2">Name</th><th class="p-2">User ID</th><th class="p-2">Role</th><th class="p-2">Department</th><th class="p-2">Actions</th></tr></thead><tbody>${usersHTML}</tbody></table></div></div>`;
            document.querySelectorAll('.delete-user-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const userId = e.target.dataset.userid;
                    if (confirm(`Are you sure you want to delete user ${userId}?`)) {
                        const deleteResponse = await fetch(`/users/${userId}`, { method: 'DELETE' });
                        if(deleteResponse.ok) { showNotification('User deleted!'); showAdminManageUsers(); } else { showNotification('Failed to delete user.', true); }
                    }
                });
            });
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load users.</div>';
        }
    }
    function showAdminTimetables() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">Manage Timetables</h2><p>A central hub for creating, editing, and publishing academic timetables for all departments is under development.</p></div>`;
    }
    function showAdminIdRequests() {
        mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-2xl font-bold mb-4">ID Card Requests</h2><p>The module to review, approve, and process student requests for new ID cards will be available here shortly.</p></div>`;
    }
    async function showAdminSignupRequests() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/signup-requests');
            const requests = await response.json();
            let requestsHTML = '';
            if (requests.length > 0) {
                requestsHTML = requests.map(req => `<tr class="border-b"><td class="p-2">${req.name}</td><td class="p-2">${req.userId}</td><td class="p-2">${req.role}</td><td class="p-2">${req.email}</td><td class="p-2"><button data-userid="${req.userId}" data-action="approve" class="resolve-signup-btn bg-green-500 text-white px-2 py-1 rounded text-sm mr-2">Approve</button><button data-userid="${req.userId}" data-action="reject" class="resolve-signup-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Reject</button></td></tr>`).join('');
            } else { requestsHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">No pending signup requests.</td></tr>'; }
            mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Sign-up Requests</h2><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="bg-gray-100"><th class="p-2">Name</th><th class="p-2">User ID</th><th class="p-2">Role</th><th class="p-2">Email</th><th class="p-2">Actions</th></tr></thead><tbody>${requestsHTML}</tbody></table></div></div>`;
            document.querySelectorAll('.resolve-signup-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const { userid, action } = e.target.dataset;
                    const response = await fetch('/resolve-signup', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId: userid, action }) });
                    if (response.ok) { showNotification(`Request has been ${action}ed.`); showAdminSignupRequests(); } else { showNotification('Action failed.', true); }
                });
            });
        } catch(error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load signup requests.</div>';
        }
    }
    async function showAdminPasswordRequests() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/password-requests');
            const requests = await response.json();
            let requestsHTML = '';
            if (requests.length > 0) {
                 requestsHTML = requests.map(req => `<tr class="border-b"><td class="p-2">${req.userId}</td><td class="p-2">${req.reason}</td><td class="p-2">${new Date(req.timestamp).toLocaleString()}</td><td class="p-2">${req.status === 'Pending' ? `<button data-id="${req.id}" data-action="reset" class="resolve-password-btn bg-blue-500 text-white px-2 py-1 rounded text-sm">Reset & Notify</button>` : req.status}</td></tr>`).join('');
            } else {
                 requestsHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">No pending password reset requests.</td></tr>';
            }
            mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold mb-4">Password Reset Requests</h2><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="bg-gray-100"><th class="p-2">User ID</th><th class="p-2">Reason</th><th class="p-2">Requested At</th><th class="p-2">Action</th></tr></thead><tbody>${requestsHTML}</tbody></table></div></div>`;
            document.querySelectorAll('.resolve-password-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const { id, action } = e.target.dataset;
                    const response = await fetch('/resolve-password-request', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, action }) });
                    if (response.ok) { showNotification('Password reset link sent to user.'); showAdminPasswordRequests(); } else { showNotification('Action failed.', true); }
                });
            });
        } catch(error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load password requests.</div>';
        }
    }

    async function displayAnnouncements() {
        renderLoader(mainContent);
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        const canPostAnnouncements = user.role === 'Admin' || user.role === 'HOD' || user.role === 'Faculty';
        let formHTML = '';
        if (canPostAnnouncements) {
            formHTML = `<div class="bg-white p-6 rounded-lg shadow-md mb-8"><h2 class="text-2xl font-bold mb-4">Create New Announcement</h2><form id="announcement-form"><div class="mb-4"><label for="announcement-title" class="block text-sm font-medium text-gray-700">Title</label><input type="text" id="announcement-title" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required></div><div class="mb-4"><label for="announcement-content" class="block text-sm font-medium text-gray-700">Content</label><textarea id="announcement-content" rows="4" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required></textarea></div><button type="submit" class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">Post Announcement</button></form></div>`;
        }
        try {
            const response = await fetch('/announcements');
            const data = await response.json();
            let announcementsHTML = '<h2 class="text-2xl font-bold mb-4">Latest Announcements</h2>';
            if (data.announcements && data.announcements.length > 0) {
                announcementsHTML += data.announcements.map(ann => `<div class="bg-white p-6 rounded-lg shadow-md mb-4"><h3 class="font-bold text-xl mb-2">${ann.title}</h3><p class="text-gray-700 mb-4 whitespace-pre-wrap">${ann.content}</p><div class="text-xs text-gray-500 border-t pt-2"><span>Posted by: <strong>${ann.authorName}</strong> (${ann.authorRole})</span> | <span>${new Date(ann.timestamp).toLocaleString()}</span></div></div>`).join('');
            } else { announcementsHTML += '<div class="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">No announcements yet.</div>'; }
            mainContent.innerHTML = formHTML + announcementsHTML;
            if (canPostAnnouncements) {
                document.getElementById('announcement-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const postData = { title: document.getElementById('announcement-title').value, content: document.getElementById('announcement-content').value, authorName: user.name, authorRole: user.role, department: user.department || null };
                    const postResponse = await fetch('/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
                    if (postResponse.ok) { showNotification('Announcement posted!'); displayAnnouncements(); } else { showNotification('Failed to post announcement.', true); }
                });
            }
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load announcements.</div>';
        }
    }
    // I am omitting the other functions as they are either unchanged or now have functional content.

    // --- CHECK FOR LOGGED IN USER OR URL PARAMS ON PAGE LOAD ---
    function checkInitialState(){
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('reset_token');
        const verificationToken = urlParams.get('verify_token');
        const verificationMessage = urlParams.get('message');

        if(verificationMessage){
            showNotification(decodeURIComponent(verificationMessage));
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if(resetToken){
            document.getElementById('reset-token-input').value = resetToken;
            showAuthPage(resetPasswordContainer);
        } else if(verificationToken) {
            const messageEl = document.getElementById('error-message');
            messageEl.textContent = "Verifying your email, please wait...";
            messageEl.className = "text-blue-500 text-sm text-center min-h-[1.25rem]";
        } else {
            const loggedInUser = sessionStorage.getItem('loggedInUser');
            if (loggedInUser) {
                showDashboard(JSON.parse(loggedInUser));
            } else {
                 showAuthPage(loginContainer);
                 updateDepartmentVisibility();
            }
        }
    }
    checkInitialState();
});