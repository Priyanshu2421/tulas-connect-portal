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

// Helper to render a loading spinner
function renderLoader(container) {
    container.innerHTML = `<div class="loader"></div>`;
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
    const resetPasswordContainer = document.getElementById('reset-password-container');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    
    // --- LOGIN FORM VISIBILITY LOGIC ---
    function updateDepartmentVisibility() {
        const isDeptLogin = roleSelect.value === 'Department Login';
        const isEngineeringSelected = departmentSelect.value === 'Department of Engineering';

        departmentSelectContainer.classList.toggle('hidden', !isDeptLogin);
        engineeringDeptSelectContainer.classList.toggle('hidden', !isDeptLogin || !isEngineeringSelected);

        const isAdminSelected = roleSelect.value === 'Admin';
        forgotPasswordLinkWrapper.classList.toggle('hidden', isAdminSelected);
        signupLinkWrapper.classList.toggle('hidden', isAdminSelected);
    }

    // --- EVENT LISTENERS ---
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
                setTimeout(() => {
                    // Clear the token from URL and show login page
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showAuthPage(loginContainer);
                }, 2000);
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
        window.location.href = '/';
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

    // --- DASHBOARD POPULATION FUNCTIONS ---
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

    // --- Placeholder implementations for other functions ---
    async function showStudentAnalytics() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Student Analytics</h2><p>This section will contain charts and data about your academic performance. Coming Soon!</p></div>`; }
    async function showStudentAssignments() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>My Assignments</h2><p>View and submit your assignments here. Coming Soon!</p></div>`; }
    async function showStudentAttendance() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>My Attendance</h2><p>Track your attendance records for all subjects. Coming Soon!</p></div>`; }
    async function showStudentFees() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Fee Details</h2><p>Check your fee payment history and upcoming dues. Coming Soon!</p></div>`; }
    async function showStudentTimetable() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>My Timetable</h2><p>Your class schedule will be displayed here. Coming Soon!</p></div>`; }
    async function showStudentIdCard() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>My ID Card</h2><p>View and request a new ID card. Coming Soon!</p></div>`; }
    async function showStudentLeave() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Apply for Leave</h2><p>Submit and track your leave applications. Coming Soon!</p></div>`; }
    async function showFacultyAssignments() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Manage Assignments</h2><p>Create, distribute, and grade assignments. Coming Soon!</p></div>`; }
    async function showFacultyLeave() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Student Leave Requests</h2><p>Approve or reject leave requests from students. Coming Soon!</p></div>`; }
    async function showFacultyTimetable() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>My Timetable</h2><p>Your teaching schedule. Coming Soon!</p></div>`; }
    async function showFacultyAttendance() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Mark Attendance</h2><p>Mark daily attendance for your classes. Coming Soon!</p></div>`; }
    async function showFacultyMarks() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Enter Marks</h2><p>Enter and manage student marks for exams. Coming Soon!</p></div>`; }
    async function showFacultySearch() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Search Student</h2><p>Find student profiles and academic records. Coming Soon!</p></div>`; }
    async function showFacultyMLInsights() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>ML Insights</h2><p>View AI-powered insights on student performance. Coming Soon!</p></div>`; }
    async function showHODDashboard() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Department Dashboard</h2><p>An overview of your department's analytics. Coming Soon!</p></div>`; }
    async function showHODFaculty() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Manage Faculty</h2><p>View and manage faculty members in your department. Coming Soon!</p></div>`; }
    async function showAdminManageUsers() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Manage All Users</h2><p>Add, edit, and remove users across the system. Coming Soon!</p></div>`; }
    async function showAdminTimetables() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Manage Timetables</h2><p>Create and publish timetables for all departments. Coming Soon!</p></div>`; }
    async function showAdminIdRequests() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>ID Card Requests</h2><p>Process requests for new ID cards. Coming Soon!</p></div>`; }
    async function showAdminSignupRequests() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Sign-up Requests</h2><p>Approve or reject new user registration requests. Coming Soon!</p></div>`; }
    async function showStudentAnnouncements() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Announcements</h2><p>Latest news and updates from the institute. Coming Soon!</p></div>`; }
    async function showFacultyAnnouncements() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Post Announcements</h2><p>Create announcements for your students or department. Coming Soon!</p></div>`; }
    async function showHODAnnouncements() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Department Announcements</h2><p>Manage announcements for your entire department. Coming Soon!</p></div>`; }
    async function showAdminAnnouncements() { mainContent.innerHTML = `<div class="bg-white p-6 rounded-lg shadow"><h2>Institute Announcements</h2><p>Create and manage announcements for the entire institute. Coming Soon!</p></div>`; }

    // --- CHECK FOR LOGGED IN USER OR URL PARAMS ON PAGE LOAD ---
    function checkInitialState(){
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('reset_token');
        const verificationMessage = urlParams.get('message'); // For post-verification message

        if(verificationMessage){
            // Show notification from URL and then clean the URL
            showNotification(decodeURIComponent(verificationMessage));
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if(resetToken){
            document.getElementById('reset-token-input').value = resetToken;
            showAuthPage(resetPasswordContainer);
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