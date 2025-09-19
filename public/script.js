// --- UTILITY FUNCTIONS ---
const API_BASE_URL = '';
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
    const loginForm = document.getElementById('loginForm');
    const userIdInput = document.getElementById('userId');
    const passwordInput = document.getElementById('password');
    const departmentSelect = document.getElementById('department');
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
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    // --- EVENT LISTENERS ---
    roleSelect.addEventListener('change', (e) => {
        departmentSelectContainer.classList.toggle('hidden', e.target.value !== 'Department Login');
        const isAdminSelected = e.target.value === 'Admin';
        forgotPasswordLinkWrapper.classList.toggle('hidden', isAdminSelected);
        signupLinkWrapper.classList.toggle('hidden', isAdminSelected);
    });
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = userIdInput.value.trim();
        const password = passwordInput.value.trim();
        const selectedRole = roleSelect.value;
        const department = departmentSelect.value;
        const errorMessage = document.getElementById('error-message');
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
        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            signupMessage.className = response.ok ? 'text-green-600 text-center' : 'text-red-500 text-center';
            signupMessage.textContent = result.message;
            if (response.ok) signupForm.reset();
        } catch (error) {
            signupMessage.className = 'text-red-500 text-center';
            signupMessage.textContent = 'Could not connect to the server.';
        }
    });
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const messageEl = document.getElementById('forgot-password-message');
        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            messageEl.className = response.ok ? 'text-green-600 text-center' : 'text-red-500 text-center';
            messageEl.textContent = result.message || 'Request failed.';
            if (response.ok) forgotPasswordForm.reset();
        } catch (error) {
            messageEl.className = 'text-red-500 text-center';
            messageEl.textContent = 'Could not connect to server.';
        }
    });
    function showAuthPage(pageToShow) {
        loginContainer.classList.add('hidden');
        signupContainer.classList.add('hidden');
        forgotPasswordContainer.classList.add('hidden');
        pageToShow.classList.remove('hidden');
    }
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(signupContainer); });
    showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(forgotPasswordContainer); });
    showLoginLinkFromSignup.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(loginContainer); });
    showLoginLinkFromForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthPage(loginContainer); });
    logoutButton.addEventListener('click', () => {
        sessionStorage.clear();
        document.getElementById('login-signup-wrapper').classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
        loginForm.reset();
        document.getElementById('error-message').textContent = '';
        headerProfilePic.src = '';
        departmentSelectContainer.classList.add('hidden');
        showAuthPage(loginContainer);
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
    if (signupRoleSelect && signupDepartmentContainer) {
        signupRoleSelect.addEventListener('change', (e) => {
            const selectedRole = e.target.value;
            if (selectedRole === 'Student' || selectedRole === 'Faculty') {
                signupDepartmentContainer.classList.remove('hidden');
            } else {
                signupDepartmentContainer.classList.add('hidden');
            }
        });
    }
    if (signupRoleSelect) {
        const adminOption = Array.from(signupRoleSelect.options).find(option => option.text === 'Admin');
        if (adminOption) {
            adminOption.remove();
        }
    }
    
    // --- DASHBOARD & NAVIGATION ---
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
        roleDashboards[user.role]();
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
            'user-profile': showUserProfile, 'student-analytics': showStudentAnalytics,
            'student-assignments': showStudentAssignments, 'student-attendance': showStudentAttendance,
            'student-fees': showStudentFees, 'student-timetable': showStudentTimetable,
            'student-id-card': showStudentIdCard, 'student-announcements': showStudentAnnouncements,
            'student-leave': showStudentLeave, 'faculty-assignments': showFacultyAssignments,
            'faculty-timetable': showFacultyTimetable, 'faculty-attendance': showFacultyAttendance,
            'faculty-marks': showFacultyMarks, 'faculty-search': showFacultySearch,
            'faculty-ml-insights': showFacultyMLInsights, 'faculty-announcements': showFacultyAnnouncements,
            'faculty-leave': showFacultyLeave, 'hod-dashboard': showHODDashboard,
            'hod-faculty': showHODFaculty, 'hod-announcements': showHODAnnouncements,
            'admin-announce': showAdminAnnouncements, 'admin-manage-users': showAdminManageUsers,
            'admin-timetables': showAdminTimetables, 'admin-id-requests': showAdminIdRequests,
            'admin-signup-requests': showAdminSignupRequests, 'admin-password-requests': showAdminPasswordRequests,
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
            { name: 'My Profile', target: 'user-profile' }, { name: 'Announcements', target: 'student-announcements' },
            { name: 'My Analytics', target: 'student-analytics' }, { name: 'Assignments', target: 'student-assignments' },
            { name: 'Attendance', target: 'student-attendance' }, { name: 'Apply for Leave', target: 'student-leave' },
            { name: 'Fee Details', target: 'student-fees' }, { name: 'Timetable', target: 'student-timetable' },
            { name: 'ID Card', target: 'student-id-card' },
        ];
        populateNav(links); setDefaultPage(links);
    }
    function populateFacultyDashboard() {
        const links = [
            { name: 'My Profile', target: 'user-profile' }, { name: 'Announcements', target: 'faculty-announcements' },
            { name: 'Assignments', target: 'faculty-assignments' }, { name: 'Leave Requests', target: 'faculty-leave' },
            { name: 'ML Insights', target: 'faculty-ml-insights' }, { name: 'Attendance', target: 'faculty-attendance' },
            { name: 'Marks', target: 'faculty-marks' }, { name: 'Search Student', target: 'faculty-search' },
        ];
        populateNav(links); setDefaultPage(links);
    }
    function populateAdminDashboard() {
        const links = [{ name: 'Announcements', target: 'admin-announce' }, { name: 'Manage Users', target: 'admin-manage-users' }, { name: 'Sign-up Requests', target: 'admin-signup-requests' }, { name: 'Password Requests', target: 'admin-password-requests' }, { name: 'ID Card Requests', target: 'admin-id-requests' }, { name: 'Timetables', target: 'admin-timetables' },];
        populateNav(links); setDefaultPage(links);
    }
    function populateHODDashboard() {
        const links = [
            { name: 'Department', target: 'hod-dashboard' }, { name: 'Manage Faculty', target: 'hod-faculty' },
            { name: 'Announcements', target: 'hod-announcements' }, { name: 'Sign-up Requests', target: 'admin-signup-requests' },
            { name: 'Search Student', target: 'faculty-search' }, { name: 'My Profile', target: 'user-profile' }
        ];
        populateNav(links); setDefaultPage(links);
    }

    // --- CONTENT RENDERING FUNCTIONS ---
    async function showUserProfile() {
        mainContent.innerHTML = `<div class="text-center p-8 bg-white rounded-lg shadow">Loading profile...</div>`;
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
                    headerProfilePic.src = result.updatedUser.photoUrl ? `${API_BASE_URL}${result.updatedUser.photoUrl}` : 'https://placehold.co/40x40/a0aec0/ffffff?text=U';
                    showUserProfile();
                } else { showNotification('Failed to update profile.', true); }
            } catch (error) { showNotification("Could not connect to server.", true); }
        });
    }

    async function showStudentAnalytics() { /* ... full function code ... */ }
    async function showStudentAssignments() { /* ... full function code ... */ }
    async function showStudentAttendance() { /* ... full function code ... */ }
    async function showStudentFees() { /* ... full function code ... */ }
    async function showStudentTimetable() { /* ... full function code ... */ }
    async function showFacultyAssignments() { /* ... full function code ... */ }
    async function showFacultyTimetable() { /* ... full function code ... */ }
    async function showFacultyAttendance() { /* ... full function code ... */ }
    async function showFacultyMarks() { /* ... full function code ... */ }
    async function showFacultySearch() { /* ... full function code ... */ }
    async function showFacultyMLInsights() { /* ... full function code ... */ }
    async function showHODDashboard() { /* ... full function code ... */ }
    async function showHODFaculty() { /* ... full function code ... */ }

    // All announcement functions are here
    async function showStudentAnnouncements() { /* ... full function code ... */ }
    async function showFacultyAnnouncements() { /* ... full function code ... */ }
    async function showHODAnnouncements() { /* ... full function code ... */ }
    async function showAdminAnnouncements() { /* ... full function code ... */ }

    // --- LEAVE APPLICATION FUNCTIONS ---
    async function showStudentLeave() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const response = await fetch(`${API_BASE_URL}/leave-requests/student/${user.id}`);
            const requests = await response.json();
            const requestsHtml = requests.length > 0 ? requests.map(r => {
                const statusColor = { 'Approved': 'text-green-600 bg-green-100', 'Denied': 'text-red-600 bg-red-100', 'Pending': 'text-orange-500 bg-orange-100' }[r.status] || 'text-gray-500';
                return `<div class="border p-4 rounded-md"><div class="flex justify-between items-start"><div><p class="font-semibold">Leave from ${new Date(r.startDate).toLocaleDateString()} to ${new Date(r.endDate).toLocaleDateString()}</p><p class="text-sm text-gray-600 mt-1"><strong>Reason:</strong> ${r.reason}</p>${r.status === 'Denied' ? `<p class="text-sm text-red-700 mt-1"><strong>Denial Reason:</strong> ${r.denialReason}</p>` : ''}</div><span class="text-sm font-bold px-3 py-1 rounded-full ${statusColor}">${r.status}</span></div></div>`;
            }).join('') : '<p class="text-gray-500">You have not submitted any leave requests yet.</p>';
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg space-y-8"><div><h2 class="text-2xl font-bold mb-4">Apply for Leave</h2><form id="leave-request-form" class="space-y-4 p-4 border rounded-lg bg-gray-50"><div><label for="leave-start-date" class="block text-sm font-medium text-gray-700">Start Date</label><input type="date" id="leave-start-date" name="startDate" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md"></div><div><label for="leave-end-date" class="block text-sm font-medium text-gray-700">End Date</label><input type="date" id="leave-end-date" name="endDate" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md"></div><div><label for="leave-reason" class="block text-sm font-medium text-gray-700">Reason for Leave</label><textarea id="leave-reason" name="reason" rows="3" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea></div><button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Submit Request</button></form></div><div><h2 class="text-2xl font-bold mb-4">My Leave History</h2><div class="space-y-4">${requestsHtml}</div></div></div>`;
            document.getElementById('leave-request-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                const payload = { ...data, studentId: user.id, studentName: user.name, studentDepartment: user.department };
                try {
                    const response = await fetch(`${API_BASE_URL}/leave-requests`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        showNotification('Leave request submitted successfully!');
                        showStudentLeave();
                    } else {
                        const error = await response.json();
                        showNotification(`Error: ${error.message}`, true);
                    }
                } catch (err) {
                    showNotification('Could not connect to the server.', true);
                }
            });
        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load leave application page.</div>`;
        }
    }
    async function showFacultyLeave() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading leave requests...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const response = await fetch(`${API_BASE_URL}/leave-requests/faculty/${user.department}`);
            const requests = await response.json();
            const requestsHtml = requests.length > 0 ? requests.map(r => {
                const statusColor = { 'Approved': 'text-green-600 bg-green-100', 'Denied': 'text-red-600 bg-red-100', 'Pending': 'text-orange-500 bg-orange-100' }[r.status] || 'text-gray-500';
                let actionButtons = '';
                if (r.status === 'Pending') {
                    actionButtons = `<button class="approve-leave-btn bg-green-500 text-white px-3 py-1 text-sm rounded" data-id="${r.id}">Approve</button><button class="deny-leave-btn bg-red-500 text-white px-3 py-1 text-sm rounded" data-id="${r.id}">Deny</button>`;
                } else {
                    actionButtons = `<span class="text-sm font-bold">Resolved</span>`;
                }
                return `<div class="border p-4 rounded-lg"><div class="flex flex-col md:flex-row justify-between md:items-center"><div><p class="font-bold text-lg">${r.studentName} (${r.studentId})</p><p class="text-sm text-gray-500">Applied for: ${new Date(r.startDate).toLocaleDateString()} to ${new Date(r.endDate).toLocaleDateString()}</p><p class="mt-2"><strong>Reason:</strong> ${r.reason}</p></div><div class="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2"><span class="text-sm font-bold px-3 py-1 rounded-full ${statusColor}">${r.status}</span><div class="flex gap-2 mt-2">${actionButtons}</div></div></div></div>`;
            }).join('') : '<p>No leave requests have been submitted in your department.</p>';
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">Student Leave Requests</h2><div class="space-y-4">${requestsHtml}</div></div>`;
            document.querySelectorAll('.approve-leave-btn, .deny-leave-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const requestId = e.target.dataset.id;
                    const status = e.target.classList.contains('approve-leave-btn') ? 'Approved' : 'Denied';
                    const payload = { requestId, status };
                    try {
                        const response = await fetch(`${API_BASE_URL}/leave-requests/resolve`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                        });
                        if (response.ok) {
                            showNotification('Request resolved successfully!');
                            showFacultyLeave();
                        } else {
                            showNotification('Failed to resolve request.', true);
                        }
                    } catch (err) {
                        showNotification('Could not connect to the server.', true);
                    }
                });
            });
        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load leave requests.</div>`;
        }
    }

    // --- ID CARD FEATURE (NEW & IMPROVED) ---
    async function showStudentIdCard() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading ID card...</div>`;
        try {
            const userId = sessionStorage.getItem('userId');
            const [profileRes, statusRes] = await Promise.all([
                fetch(`${API_BASE_URL}/profile/${userId}`),
                fetch(`${API_BASE_URL}/id-card-status/${userId}`)
            ]);
            if (!profileRes.ok || !statusRes.ok) throw new Error('Could not load data.');
            const { profile } = await profileRes.json();
            const statusData = await statusRes.json();

            if (statusData.status === 'Approved') {
                mainContent.innerHTML = `
                    <div class="bg-white p-4 sm:p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
                        <h2 class="text-2xl font-bold mb-4 text-center">Your ID Card</h2>
                        <div id="id-card-container" class="bg-white rounded-xl shadow-2xl overflow-hidden max-w-sm mx-auto border-2 border-gray-200">
                            <div class="bg-green-700 p-3 text-white text-center">
                                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv_4ADbeFBqg9mRZQYTRGpzcdXlZN0IFw_0A&s" alt="Tula's Logo" class="h-12 mx-auto mb-2">
                                <h3 class="font-bold text-lg">TULA'S INSTITUTE, DEHRADUN</h3>
                            </div>
                            <div class="p-4 text-center">
                                <img src="${API_BASE_URL}${statusData.photoUrl}" alt="Student Photo" class="w-32 h-32 rounded-full mx-auto border-4 border-green-500 object-cover">
                                <h4 class="text-xl font-bold mt-3">${statusData.userName}</h4>
                                <p class="text-gray-600">Student</p>
                            </div>
                            <div class="px-4 pb-4">
                                <div class="text-sm space-y-2">
                                    <div class="flex justify-between border-b pb-1"><span class="font-semibold text-gray-500">Roll No:</span><span>${statusData.userId}</span></div>
                                    <div class="flex justify-between border-b pb-1"><span class="font-semibold text-gray-500">Course:</span><span>${statusData.course}</span></div>
                                    <div class="flex justify-between border-b pb-1"><span class="font-semibold text-gray-500">Batch:</span><span>${statusData.batch}</span></div>
                                    <div class="flex justify-between border-b pb-1"><span class="font-semibold text-gray-500">Phone:</span><span>${statusData.phone}</span></div>
                                    <div class="flex justify-between"><span class="font-semibold text-gray-500">Blood Group:</span><span>${statusData.bloodGroup}</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="text-center mt-6">
                            <button id="print-id-card-btn" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Print ID Card</button>
                        </div>
                    </div>`;
                
                document.getElementById('print-id-card-btn').addEventListener('click', () => {
                     const printContent = document.getElementById('id-card-container').innerHTML;
                     const newWindow = window.open('', '_blank');
                     newWindow.document.write('<html><head><title>Print ID Card</title>');
                     newWindow.document.write('<script src="https://cdn.tailwindcss.com"><\/script>');
                     newWindow.document.write('</head><body class="p-8">');
                     newWindow.document.write(printContent);
                     newWindow.document.write('</body></html>');
                     newWindow.document.close();
                     newWindow.focus();
                     setTimeout(() => { newWindow.print(); newWindow.close(); }, 500);
                });
                return;
            }

            const statusColor = { 'Pending': 'text-orange-500', 'Denied': 'text-red-600', 'Not Applied': 'text-gray-500' }[statusData.status] || 'text-gray-500';
            let statusHTML = `<div class="mb-6 p-4 rounded-lg bg-gray-50"><h3 class="font-semibold text-lg">Application Status</h3><p class="text-2xl font-bold ${statusColor}">${statusData.status}</p>${statusData.status === 'Denied' && statusData.reason ? `<p class="mt-2 text-sm"><strong>Reason for Denial:</strong> ${statusData.reason}</p>` : ''}</div>`;
            let formHTML = '';
            if (statusData.status === 'Not Applied' || statusData.status === 'Denied') {
                formHTML = `
                    <form id="id-card-form" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label class="block">Full Name</label><input type="text" name="name" value="${profile.name || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                            <div><label class="block">Roll No. / User ID</label><input type="text" name="userId" value="${profile.id || ''}" class="w-full mt-1 p-2 border rounded bg-gray-100" readonly></div>
                            <div><label class="block">Course (e.g., B.Tech, BCA)</label><input type="text" name="course" value="${profile.course || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                            <div><label class="block">Batch (e.g., A1, B2)</label><input type="text" name="batch" value="${profile.batch || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                            <div><label class="block">Mobile No.</label><input type="tel" name="phone" value="${profile.phone || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                            <div><label class="block">Blood Group</label><input type="text" name="bloodGroup" value="${profile.bloodGroup || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block">Upload Your Photo (Max 15MB)</label>
                            <input type="file" name="idCardPhoto" id="idCardPhotoInput" accept="image/*" class="w-full mt-1 p-2 border rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" required>
                        </div>
                        <div class="mt-6">
                            <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">Submit Application</button>
                        </div>
                    </form>`;
            } else {
                formHTML = `<p>Your application is currently being processed. You cannot submit a new one at this time.</p>`;
            }
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto"><h2 class="text-2xl font-bold mb-4">ID Card Application</h2>${statusHTML}${formHTML}</div>`;
            if (document.getElementById('id-card-form')) {
                document.getElementById('id-card-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const photoInput = document.getElementById('idCardPhotoInput');
                    const file = photoInput.files[0];
                    if (file && file.size > 15 * 1024 * 1024) {
                        showNotification('File is too large. Maximum size is 15MB.', true);
                        return;
                    }
                    const formData = new FormData(e.target);
                    try {
                        const response = await fetch(`${API_BASE_URL}/id-card-request`, { method: 'POST', body: formData });
                        const result = await response.json();
                        if (result.success) {
                            showNotification('Application submitted successfully!');
                            showStudentIdCard();
                        } else {
                            showNotification(`Error: ${result.message}`, true);
                        }
                    } catch (error) {
                        showNotification('Could not connect to the server.', true);
                    }
                });
            }
        } catch (error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load ID card application page. ${error.message}</div>`; }
    }
    
    // --- ADMIN FUNCTIONS ---
    async function showAdminManageUsers() { /* ... full function code ... */ }
    async function showAdminTimetables() { /* ... full function code ... */ }
    async function showAdminIdRequests() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading ID Card Requests...</div>`;
        try {
            const res = await fetch(`${API_BASE_URL}/id-card-requests`);
            const requests = await res.json();
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">ID Card Requests</h2><div class="space-y-4">${requests.length > 0 ? requests.map(r => `
                <div class="border rounded-lg p-4 flex flex-col md:flex-row items-start gap-6">
                    <img src="${API_BASE_URL}${r.photoUrl}" class="w-28 h-28 object-cover rounded-md flex-shrink-0 border-2 border-gray-200">
                    <div class="flex-grow">
                        <p class="font-bold text-lg">${r.userName} (${r.userId})</p>
                        <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-2">
                            <p><strong>Course:</strong> ${r.course || 'N/A'}</p>
                            <p><strong>Batch:</strong> ${r.batch || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${r.phone || 'N/A'}</p>
                            <p><strong>Blood Grp:</strong> ${r.bloodGroup || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 w-full md:w-auto mt-2 md:mt-0 items-start md:items-end">
                         <p class="text-sm font-bold">Status: <span class="${r.status === 'Pending' ? 'text-orange-500' : r.status === 'Approved' ? 'text-green-600' : 'text-red-600'}">${r.status}</span></p>
                        ${r.status === 'Pending' ? `
                            <div class="flex gap-2">
                                <button class="resolve-id-btn bg-green-500 text-white px-3 py-1 text-sm rounded" data-action="approve" data-userid="${r.userId}">Approve</button>
                                <button class="resolve-id-btn bg-red-500 text-white px-3 py-1 text-sm rounded" data-action="deny" data-userid="${r.userId}">Deny</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('') : '<p>No pending ID card requests.</p>'}</div></div>`;

            document.querySelectorAll('.resolve-id-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const { action, userid } = e.target.dataset;
                    let reason = null;
                    if (action === 'deny') {
                        reason = prompt("Reason for denial (optional):");
                        if (reason === null) return;
                    }
                    try {
                        const response = await fetch(`${API_BASE_URL}/resolve-id-card-request`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: userid, action, reason })
                        });
                        if (response.ok) { showNotification('Request resolved.'); showAdminIdRequests(); }
                        else { showNotification('Action failed.', true); }
                    } catch (err) { showNotification('Server Error.', true); }
                });
            });
        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load requests.</div>`;
        }
    }
    async function showAdminSignupRequests() { /* ... full function code ... */ }
    async function showAdminPasswordRequests() { /* ... full function code ... */ }

    // --- Check for logged-in user on page load ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        showDashboard(JSON.parse(loggedInUser));
    }
});

