// --- UTILITY FUNCTIONS ---
const API_BASE_URL = '';

// Data for dynamic course selection
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

function showNotification(message, isError = false) {
    const toast = document.getElementById('notification-toast');
    const messageP = document.getElementById('notification-message');

    if (!toast || !messageP) return;

    messageP.textContent = message;
    toast.className = 'fixed bottom-20 md:bottom-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg transition-all duration-500 transform z-50';

    if (isError) {
        toast.classList.add('bg-red-600');
    } else {
        toast.classList.add('bg-green-600');
    }

    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.transform = 'translateY(5rem)';
        toast.style.opacity = '0';
    }, 4000);
}


// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const roleSelect = document.getElementById('role');
    const departmentSelectContainer = document.getElementById('department-select-container');
    const departmentSelect = document.getElementById('department');
    const engineeringDeptSelectContainer = document.getElementById('engineering-dept-select-container');
    const engineeringDeptSelect = document.getElementById('engineering-dept');
    const loginForm = document.getElementById('loginForm');
    const userIdInput = document.getElementById('userId');
    const passwordInput = document.getElementById('password');
    const dashboardContainer = document.getElementById('dashboard-container');
    const mainContent = document.getElementById('main-content');
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

    const forgotPasswordLinkWrapper = showForgotPasswordLink.parentElement;
    const signupLinkWrapper = showSignupLink.parentElement;

    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const newPasswordContainer = document.getElementById('new-password-container'); // NEW

    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const newPasswordForm = document.getElementById('newPasswordForm'); // NEW


    // --- NEW: URL PARAMETER HANDLING ---
    const handleUrlParams = () => {
        const params = new URLSearchParams(window.location.search);
        const resetToken = params.get('resetToken');
        const verificationStatus = params.get('status');

        if (resetToken) {
            showAuthPage(newPasswordContainer);
            newPasswordContainer.querySelector('input[name="token"]').value = resetToken;
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (verificationStatus) {
            if (verificationStatus === 'verified') {
                showNotification('Email verified successfully! You can now log in.');
            } else if (verificationStatus === 'already_verified') {
                 showNotification('This account has already been verified. Please log in.', true);
            } else if (verificationStatus === 'failed') {
                const reason = params.get('reason') || 'Verification failed';
                showNotification(`Error: ${reason}. Please try signing up again.`, true);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };
    handleUrlParams();

    function updateDepartmentVisibility() {
        const isDeptLogin = roleSelect.value === 'Department Login';
        const isEngineeringSelected = departmentSelect.value === 'Department of Engineering';
        departmentSelectContainer.classList.toggle('hidden', !isDeptLogin);
        engineeringDeptSelectContainer.classList.toggle('hidden', !isDeptLogin || !isEngineeringSelected);
        const isAdminSelected = roleSelect.value === 'Admin';
        forgotPasswordLinkWrapper.classList.toggle('hidden', isAdminSelected);
        signupLinkWrapper.classList.toggle('hidden', isAdminSelected);
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
                department = engineeringDeptSelect.value;
                if (!department) {
                    errorMessage.textContent = 'Please select an engineering branch.';
                    return;
                }
            } else {
                department = mainDepartmentValue;
            }
        }

        if (!userId || !password) {
            errorMessage.textContent = 'Please enter both User ID and Password.';
            return;
        }

        const roleForBackend = selectedRole === 'Department Login' ? 'HOD' : selectedRole;
        const loginPayload = { userId, password, role: roleForBackend, department };

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginPayload)
            });
            const data = await response.json();
            if (response.ok) {
                sessionStorage.setItem('loggedInUser', JSON.stringify(data.user));
                sessionStorage.setItem('userId', data.user.id);
                showDashboard(data.user);
            } else {
                errorMessage.textContent = data.message || 'Login failed.';
            }
        } catch (error) {
            errorMessage.textContent = 'Could not connect to the server.';
        }
    });

    // MODIFIED: Signup form now sends a verification email
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const signupMessage = document.getElementById('signup-message');

        const emailRegex = /^[a-zA-Z.-_]+@[a-zA-Z.-_]+\.in$/;
        if (!emailRegex.test(data.email)) {
            signupMessage.className = 'text-red-500 text-center';
            signupMessage.textContent = 'Invalid email. Use format: name.userid@tulas.edu.in';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/request-signup-verification`, {
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

    // MODIFIED: Forgot password form now sends a reset link
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const messageEl = document.getElementById('forgot-password-message');
        try {
            const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
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
    
    // NEW: Event listener for the new password form
    newPasswordForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const messageEl = document.getElementById('new-password-message');
        messageEl.textContent = '';

        if (data.newPassword.length < 6) {
             messageEl.className = 'text-red-500 text-center';
            messageEl.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (data.newPassword !== data.confirmPassword) {
            messageEl.className = 'text-red-500 text-center';
            messageEl.textContent = 'Passwords do not match.';
            return;
        }
        
        const payload = { token: data.token, newPassword: data.newPassword };

        try {
             const response = await fetch(`${API_BASE_URL}/set-new-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if(response.ok) {
                showNotification(result.message);
                newPasswordForm.reset();
                showAuthPage(loginContainer);
            } else {
                messageEl.className = 'text-red-500 text-center';
                messageEl.textContent = result.message;
            }
        } catch(err) {
            messageEl.className = 'text-red-500 text-center';
            messageEl.textContent = 'Could not connect to the server.';
        }
    });


    function showAuthPage(pageToShow) {
        loginContainer.classList.add('hidden');
        signupContainer.classList.add('hidden');
        forgotPasswordContainer.classList.add('hidden');
        newPasswordContainer.classList.add('hidden'); // MODIFIED
        pageToShow.classList.remove('hidden');
    }

    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(signupContainer); });
    showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(forgotPasswordContainer); });
    showLoginLinkFromSignup.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(loginContainer); });
    showLoginLinkFromForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(loginContainer); });

    logoutButton.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.reload();
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
            'student-announcements': showStudentAnnouncements,
            'student-leave': showStudentLeave, 
            'faculty-assignments': showFacultyAssignments,
            'faculty-timetable': showFacultyTimetable,
            'faculty-attendance': showFacultyAttendance,
            'faculty-marks': showFacultyMarks,
            'faculty-search': showFacultySearch,
            'faculty-ml-insights': showFacultyMLInsights,
            'faculty-announcements': showFacultyAnnouncements,
            'faculty-leave': showFacultyLeave, 
            'hod-dashboard': showHODDashboard,
            'hod-faculty': showHODFaculty,
            'hod-announcements': showHODAnnouncements,
            'admin-announce': showAdminAnnouncements,
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
    
    // MODIFIED: Admin dashboard no longer shows requests
    function populateAdminDashboard() {
        const links = [
            { name: 'Announcements', target: 'admin-announce' },
            { name: 'Manage Users', target: 'admin-manage-users' },
            // { name: 'Sign-up Requests', target: 'admin-signup-requests' }, // REMOVED
            // { name: 'Password Requests', target: 'admin-password-requests' }, // REMOVED
            { name: 'ID Card Requests', target: 'admin-id-requests' },
            { name: 'Timetables', target: 'admin-timetables'},
        ];
        populateNav(links);
        setDefaultPage(links);
    }

    // MODIFIED: HOD dashboard no longer shows signup requests
    function populateHODDashboard() {
        const links = [
            { name: 'Department', target: 'hod-dashboard' },
            { name: 'Manage Faculty', target: 'hod-faculty' },
            { name: 'Announcements', target: 'hod-announcements' },
            // { name: 'Sign-up Requests', target: 'admin-signup-requests' }, // REMOVED
            { name: 'Search Student', target: 'faculty-search' },
            { name: 'My Profile', target: 'user-profile' }
        ];
        populateNav(links);
        setDefaultPage(links);
    }

    // --- ALL CONTENT RENDERING FUNCTIONS (showUserProfile, etc.) ---
    // These functions are UNCHANGED. Your existing working code is all here.
    // I am omitting them for brevity, but they should be included in your final file.
    // ... PASTE ALL YOUR `showUserProfile` through `showAdminAnnouncements` functions here ...
    async function showUserProfile() { /* ... your existing code ... */ }
    function showUserProfileEditForm(profile) { /* ... your existing code ... */ }
    async function showStudentAnalytics() { /* ... your existing code ... */ }
    async function showStudentAssignments() { /* ... your existing code ... */ }
    async function showStudentAttendance() { /* ... your existing code ... */ }
    async function showStudentFees() { /* ... your existing code ... */ }
    async function showStudentTimetable() { /* ... your existing code ... */ }
    async function showStudentIdCard() { /* ... your existing code ... */ }
    async function showStudentLeave() { /* ... your existing code ... */ }
    async function showFacultyAssignments() { /* ... your existing code ... */ }
    async function showFacultyLeave() { /* ... your existing code ... */ }
    async function showFacultyTimetable() { /* ... your existing code ... */ }
    async function showFacultyAttendance() { /* ... your existing code ... */ }
    async function showFacultyMarks() { /* ... your existing code ... */ }
    async function showFacultySearch() { /* ... your existing code ... */ }
    async function showFacultyMLInsights() { /* ... your existing code ... */ }
    async function showHODDashboard() { /* ... your existing code ... */ }
    async function showHODFaculty() { /* ... your existing code ... */ }
    async function showAdminManageUsers() { /* ... your existing code ... */ }
    async function showAdminTimetables() { /* ... your existing code ... */ }
    function renderEditableTimetable(type, id, data) { /* ... your existing code ... */ }
    async function showAdminIdRequests() { /* ... your existing code ... */ }
    async function showAdminSignupRequests() { /* ... your existing code ... */ }
    async function showAdminPasswordRequests() { /* ... your existing code ... */ }
    async function showStudentAnnouncements() { /* ... your existing code ... */ }
    async function showFacultyAnnouncements() { /* ... your existing code ... */ }
    async function showHODAnnouncements() { /* ... your existing code ... */ }
    async function showAdminAnnouncements() { /* ... your existing code ... */ }


    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        showDashboard(JSON.parse(loggedInUser));
    }
    updateDepartmentVisibility();
});