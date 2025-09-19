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

    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');

    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');


    // --- EVENT LISTENERS ---

    roleSelect.addEventListener('change', (e) => {
        departmentSelectContainer.classList.toggle('hidden', e.target.value !== 'Department Login');
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
            if(response.ok) forgotPasswordForm.reset();
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

    // This is a new listener for the signup role dropdown
    const signupRoleSelect = document.getElementById('signup-role');
    const signupDepartmentContainer = document.getElementById('signup-department-container');
    if(signupRoleSelect && signupDepartmentContainer) {
        signupRoleSelect.addEventListener('change', (e) => {
            const selectedRole = e.target.value;
            // Show department selection for Students and Faculty
            if (selectedRole === 'Student' || selectedRole === 'Faculty') {
                signupDepartmentContainer.classList.remove('hidden');
            } else {
                signupDepartmentContainer.classList.add('hidden');
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
            'user-profile': showUserProfile,
            'student-analytics': showStudentAnalytics,
            'student-assignments': showStudentAssignments,
            'student-attendance': showStudentAttendance,
            'student-fees': showStudentFees,
            'student-timetable': showStudentTimetable,
            'student-id-card': showStudentIdCard,
            'student-announcements': showStudentAnnouncements,
            'faculty-assignments': showFacultyAssignments,
            'faculty-timetable': showFacultyTimetable,
            'faculty-attendance': showFacultyAttendance,
            'faculty-marks': showFacultyMarks,
            'faculty-search': showFacultySearch,
            'faculty-ml-insights': showFacultyMLInsights,
            'faculty-announcements': showFacultyAnnouncements,
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
            { name: 'ML Insights', target: 'faculty-ml-insights' },
            { name: 'Attendance', target: 'faculty-attendance' },
            { name: 'Marks', target: 'faculty-marks' },
            { name: 'Search Student', target: 'faculty-search' },
        ];
        populateNav(links);
        setDefaultPage(links);
    }
    function populateAdminDashboard() {
        const links = [ { name: 'Announcements', target: 'admin-announce' }, { name: 'Manage Users', target: 'admin-manage-users' }, { name: 'Sign-up Requests', target: 'admin-signup-requests' }, { name: 'Password Requests', target: 'admin-password-requests' }, { name: 'ID Card Requests', target: 'admin-id-requests' }, { name: 'Timetables', target: 'admin-timetables'}, ];
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

    async function showStudentAnalytics() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading analytics...</div>`;
        const studentId = sessionStorage.getItem('userId');
        try {
            const response = await fetch(`${API_BASE_URL}/analytics/${studentId}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.message || "Failed to fetch analytics data.");

            const { attendancePercentage, overallPercentage, cgpa, subjectWiseMarks } = data.analytics;
            mainContent.innerHTML = `<div class="space-y-8"><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Overall CGPA</h3><p class="text-4xl font-bold text-green-600 mt-2">${cgpa}</p></div><div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Overall Percentage</h3><p class="text-4xl font-bold text-blue-600 mt-2">${overallPercentage}%</p></div><div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Attendance</h3><p class="text-4xl font-bold text-orange-500 mt-2">${attendancePercentage}%</p></div></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="bg-white p-6 rounded-lg shadow-lg"><h3 class="text-xl font-bold mb-4">Subject-wise Performance</h3><div class="overflow-x-auto">${subjectWiseMarks.length > 0 ? `<table class="min-w-full"><thead class="bg-gray-100"><tr><th class="py-2 px-3 text-left">Subject</th><th class="py-2 px-3 text-center">Marks</th><th class="py-2 px-3 text-center">Grade Point</th></tr></thead><tbody class="divide-y">${subjectWiseMarks.map(s => `<tr><td class="py-2 px-3 font-medium">${s.subjectName}</td><td class="py-2 px-3 text-center">${s.marksObtained}/${s.maxMarks}</td><td class="py-2 px-3 text-center font-bold">${s.gradePoint}</td></tr>`).join('')}</tbody></table>` : '<p>No marks data available yet.</p>'}</div></div><div class="bg-white p-6 rounded-lg shadow-lg"><h3 class="text-xl font-bold mb-4">Marks Distribution</h3><canvas id="marksChart"></canvas></div></div></div>`;

            if(subjectWiseMarks.length > 0) {
                const ctx = document.getElementById('marksChart').getContext('2d');
                new Chart(ctx, { type: 'bar', data: { labels: subjectWiseMarks.map(s => s.subjectCode), datasets: [{ label: 'Marks Obtained', data: subjectWiseMarks.map(s => s.marksObtained), backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: 'rgba(22, 163, 74, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } } });
            }
        } catch(error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load your analytics data. ${error.message}</div>`;
        }
    }

    async function showStudentAssignments() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading assignments...</div>`;
        try {
            const [assignmentsRes, submissionsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/assignments`),
                fetch(`${API_BASE_URL}/submissions/student/${sessionStorage.getItem('userId')}`)
            ]);
            const assignments = await assignmentsRes.json();
            const submissions = await submissionsRes.json();

            if (assignments.length === 0) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">No assignments have been posted yet.</div>`; return; }
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">Assignments & Practicals</h2><div class="space-y-6">${assignments.map(asg => { const submission = submissions.find(s => s.assignmentId === asg.id); const statusColor = { 'Approved': 'text-green-600', 'Denied': 'text-red-600', 'Pending': 'text-orange-500' }[submission?.status] || 'text-gray-500'; const assignmentFileLink = asg.filePath ? `<a href="${API_BASE_URL}${asg.filePath}" target="_blank" class="text-green-600 font-medium hover:underline">Download Assignment File</a>` : ''; return `<div class="border p-4 rounded-lg"><h3 class="text-xl font-semibold">${asg.title}</h3><p class="text-gray-600 my-2">${asg.description}</p>${assignmentFileLink}<p class="text-sm text-red-600 font-medium mt-2">Due Date: ${new Date(asg.dueDate).toLocaleDateString()}</p><hr class="my-4">${!submission || submission.status === 'Denied' ? `<form class="assignment-submission-form" data-assignment-id="${asg.id}"><label class="block mb-2 font-medium">Submit Your Work:</label><input type="file" name="submissionFile" class="p-2 border rounded w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" required><button type="submit" class="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg">Submit</button></form>` : ''}<div class="mt-2"><p><strong>Status:</strong> <span class="${statusColor}">${submission ? submission.status : 'Not Submitted'}</span></p>${submission?.status === 'Denied' ? `<p class="text-sm"><strong>Reason:</strong> ${submission.reason}</p>` : ''}${submission?.status === 'Approved' ? `<p class="text-sm text-green-600">Your work has been approved.</p>` : ''}</div></div>`; }).join('')}</div></div>`;
            document.querySelectorAll('.assignment-submission-form').forEach(form => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    formData.append('assignmentId', e.target.dataset.assignmentId);
                    formData.append('studentId', sessionStorage.getItem('userId'));
                    try {
                        const response = await fetch(`${API_BASE_URL}/submissions`, { method: 'POST', body: formData });
                        if(response.ok) { showNotification('Submission successful!'); showStudentAssignments(); } else { showNotification('Submission failed.', true); }
                    } catch (error) { showNotification('Could not connect to server.', true); }
                });
            });
        } catch (error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load assignments.</div>`; }
    }

    async function showStudentAttendance() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading attendance...</div>`;
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/student/${sessionStorage.getItem('userId')}`);
            if (!response.ok) throw new Error('Could not fetch attendance');
            const attendance = await response.json();
            if (attendance.length === 0) {
                mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">No attendance records found.</div>`;
                return;
            }
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">My Attendance</h2><div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-gray-100"><tr><th class="py-2 px-3 text-left">Date</th><th class="py-2 px-3 text-left">Class</th><th class="py-2 px-3 text-center">Status</th></tr></thead><tbody class="divide-y">${attendance.map(rec => `<tr><td class="py-2 px-3">${new Date(rec.date).toLocaleDateString()}</td><td class="py-2 px-3 font-medium">${rec.class}</td><td class="py-2 px-3 text-center font-bold ${rec.status === 'P' ? 'text-green-600' : 'text-red-600'}">${rec.status === 'P' ? 'Present' : 'Absent'}</td></tr>`).join('')}</tbody></table></div></div>`;
        } catch(error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load attendance.</div>`; }
    }

    async function showStudentFees() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading fee details...</div>`;
        try {
            const response = await fetch(`${API_BASE_URL}/fees/${sessionStorage.getItem('userId')}`);
            if (!response.ok) throw new Error('Could not fetch fees');
            const feeInfo = await response.json();
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">Fee & Transport Details</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><p class="text-sm font-semibold text-gray-500">Total Fees</p><p class="text-xl font-bold">₹${feeInfo.fees.total || 0}</p></div><div><p class="text-sm font-semibold text-gray-500">Amount Paid</p><p class="text-xl font-bold text-green-600">₹${feeInfo.fees.paid || 0}</p></div><div class="md:col-span-2"><p class="text-sm font-semibold text-gray-500">Remaining Balance</p><p class="text-xl font-bold text-red-600">₹${feeInfo.fees.due || 0}</p></div></div><hr class="my-6"><h3 class="text-xl font-semibold mb-3">Transport Details</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><p class="text-sm font-semibold text-gray-500">Status</p><p class="text-xl font-bold">${feeInfo.transport.status || 'N/A'}</p></div><div><p class="text-sm font-semibold text-gray-500">Route</p><p class="text-xl font-bold">${feeInfo.transport.route || 'N/A'}</p></div><div><p class="text-sm font-semibold text-gray-500">Vehicle Number</p><p class="text-xl font-bold">${feeInfo.transport.vehicleNumber || 'N/A'}</p></div></div></div>`;
        } catch(error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load fee details.</div>`; }
    }

    async function showStudentTimetable() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading timetable...</div>`;
        try {
            const response = await fetch(`${API_BASE_URL}/timetable/student/${sessionStorage.getItem('userId')}`);
            if (!response.ok) throw new Error('Could not fetch timetable');
            const timetable = await response.json();
            const days = Object.keys(timetable.schedule);
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">My Weekly Timetable</h2><div class="overflow-x-auto"><table class="min-w-full border"><thead class="bg-gray-100"><tr><th class="py-2 px-3 border">Day</th>${timetable.timeSlots.map(ts => `<th class="py-2 px-3 border">${ts}</th>`).join('')}</tr></thead><tbody class="divide-y">${days.map(day => `<tr><td class="py-2 px-3 border font-semibold">${day}</td>${timetable.schedule[day].map(slot => `<td class="py-2 px-3 border text-center">${slot ? `<div>${slot.subject}</div><div class="text-xs text-gray-500">${slot.faculty}</div>` : '---'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
        } catch(error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load timetable.</div>`; }
    }

    async function showStudentIdCard() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading ID card status...</div>`;
        try {
            const userId = sessionStorage.getItem('userId');
            const [profileRes, statusRes] = await Promise.all([
                fetch(`${API_BASE_URL}/profile/${userId}`),
                fetch(`${API_BASE_URL}/id-card-status/${userId}`)
            ]);
            if (!profileRes.ok || !statusRes.ok) throw new Error('Could not load data.');

            const { profile } = await profileRes.json();
            const statusData = await statusRes.json();

            const statusColor = { 'Pending': 'text-orange-500', 'Approved': 'text-green-600', 'Denied': 'text-red-600', 'Not Applied': 'text-gray-500' }[statusData.status] || 'text-gray-500';
            let statusHTML = `<div class="mb-6 p-4 rounded-lg bg-gray-50"><h3 class="font-semibold text-lg">Application Status</h3><p class="text-2xl font-bold ${statusColor}">${statusData.status}</p>${statusData.status === 'Denied' && statusData.reason ? `<p class="mt-2 text-sm"><strong>Reason:</strong> ${statusData.reason}</p>` : ''}</div>`;

            let formHTML = '';
            if (statusData.status === 'Not Applied' || statusData.status === 'Denied') {
                formHTML = `<form id="id-card-form">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label class="block">Full Name</label><input type="text" name="name" value="${profile.name || ''}" class="w-full mt-1 p-2 border rounded bg-gray-100" readonly></div>
                                    <div><label class="block">Phone Number</label><input type="tel" name="phone" value="${profile.phone || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                                    <div><label class="block">Program</label><input type="text" name="program" value="${profile.program || ''}" class="w-full mt-1 p-2 border rounded bg-gray-100" readonly></div>
                                    <div><label class="block">Department</label><input type="text" name="department" value="${profile.department || ''}" class="w-full mt-1 p-2 border rounded bg-gray-100" readonly></div>
                                    <div><label class="block">Date of Birth</label><input type="date" name="dob" value="${profile.dob || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                                    <div><label class="block">Blood Group</label><input type="text" name="bloodGroup" value="${profile.bloodGroup || ''}" required class="w-full mt-1 p-2 border rounded"></div>
                                    <div class="md:col-span-2">
                                        <label class="block">Upload Your Photo (Max 12MB)</label>
                                        <input type="file" name="idCardPhoto" id="idCardPhotoInput" accept="image/*" class="w-full mt-1 p-2 border rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" required>
                                        <input type="hidden" name="userId" value="${profile.id || ''}">
                                    </div>
                                </div>
                                <div class="mt-6">
                                    <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">Submit Application</button>
                                </div>
                            </form>`;
            } else {
                formHTML = `<p>Your application is currently being processed or has been approved. You cannot submit a new one at this time.</p>`;
            }

            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto"><h2 class="text-2xl font-bold mb-4">ID Card Application</h2>${statusHTML}${formHTML}</div>`;

            if (document.getElementById('id-card-form')) {
                document.getElementById('id-card-form').addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const photoInput = document.getElementById('idCardPhotoInput');
                    const file = photoInput.files[0];

                    if (file && file.size > 12 * 1024 * 1024) { // 12MB check
                        showNotification('File is too large. Maximum size is 12MB.', true);
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
        } catch (error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load ID card application page.</div>`; }
    }

    // --- FACULTY FUNCTIONS ---
    async function showFacultyAssignments() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading assignments...</div>`;
        try {
            const [assignments, submissions] = await Promise.all([
                fetch(`${API_BASE_URL}/assignments`).then(res => res.json()),
                fetch(`${API_BASE_URL}/submissions`).then(res => res.json())
            ]);

            const assignmentsHtml = assignments.map(asg => {
                const asgSubmissions = submissions.filter(s => s.assignmentId === asg.id);
                return `<div class="border p-4 rounded-lg">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-xl font-semibold">${asg.title}</h3>
                                    <p class="text-gray-600 my-1">${asg.description}</p>
                                    <p class="text-sm text-red-600">Due: ${new Date(asg.dueDate).toLocaleDateString()}</p>
                                    ${asg.filePath ? `<a href="${API_BASE_URL}${asg.filePath}" target="_blank" class="text-green-600 hover:underline">View Assignment File</a>` : ''}
                                </div>
                                <span class="text-sm font-bold bg-gray-200 px-3 py-1 rounded-full">${asgSubmissions.length} Submissions</span>
                            </div>
                            <hr class="my-3">
                            <div class="space-y-2">
                                ${asgSubmissions.length > 0 ? asgSubmissions.map(sub => `
                                    <div class="flex justify-between items-center p-2 rounded-md ${sub.status === 'Approved' ? 'bg-green-50' : sub.status === 'Denied' ? 'bg-red-50' : 'bg-gray-50'}">
                                        <div>
                                            <p class="font-medium">${sub.studentName} (${sub.studentId})</p>
                                            <a href="${API_BASE_URL}${sub.filePath}" target="_blank" class="text-sm text-blue-600 hover:underline">View Submission</a>
                                        </div>
                                        <div>
                                            ${sub.status === 'Pending' ? `
                                                <button class="approve-btn bg-green-500 text-white px-2 py-1 text-sm rounded" data-id="${sub.id}">Approve</button>
                                                <button class="deny-btn bg-red-500 text-white px-2 py-1 text-sm rounded" data-id="${sub.id}">Deny</button>
                                            ` : `<span class="font-bold ${sub.status === 'Approved' ? 'text-green-700' : 'text-red-700'}">${sub.status}</span>`}
                                        </div>
                                    </div>`).join('') : '<p class="text-gray-500 text-sm">No submissions yet.</p>'
                                }
                            </div>
                        </div>`;
            }).join('');

            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Manage Assignments</h2>
                    <button id="add-assignment-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg">Add New Assignment</button>
                </div>
                <div id="add-assignment-form-container" class="hidden mb-6 p-4 border rounded-lg bg-gray-50">
                    <form id="add-assignment-form">
                        <input type="text" name="title" placeholder="Title" required class="w-full p-2 border rounded mb-2">
                        <textarea name="description" placeholder="Description" required class="w-full p-2 border rounded mb-2"></textarea>
                        <label>Due Date: <input type="date" name="dueDate" required class="p-2 border rounded mb-2"></label>
                        <label>Assignment File (Optional): <input type="file" name="assignmentFile" class="w-full p-2 border rounded"></label>
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 mt-2 rounded-lg">Create</button>
                    </form>
                </div>
                <div class="space-y-6">${assignmentsHtml}</div>
            </div>`;

            document.getElementById('add-assignment-btn').addEventListener('click', () => {
                document.getElementById('add-assignment-form-container').classList.toggle('hidden');
            });

            document.getElementById('add-assignment-form').addEventListener('submit', async e => {
                e.preventDefault();
                const formData = new FormData(e.target);
                try {
                    const res = await fetch(`${API_BASE_URL}/assignments`, { method: 'POST', body: formData });
                    if(res.ok) { showNotification('Assignment created!'); showFacultyAssignments(); }
                    else { showNotification('Failed to create assignment.', true); }
                } catch (err) { showNotification('Server error.', true); }
            });

            document.querySelectorAll('.approve-btn, .deny-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const submissionId = e.target.dataset.id;
                    const action = e.target.classList.contains('approve-btn') ? 'Approved' : 'Denied';
                    let reason = null;
                    if(action === 'Denied') {
                        reason = prompt("Please provide a reason for denial:");
                        if (reason === null) return; // User cancelled
                    }
                    try {
                        const res = await fetch(`${API_BASE_URL}/submissions/resolve`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ submissionId, status: action, reason })
                        });
                        if (res.ok) { showNotification(`Submission ${action}.`); showFacultyAssignments(); }
                        else { showNotification('Action failed.', true); }
                    } catch (err) { showNotification('Server error.', true); }
                });
            });

        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load assignments.</div>`;
        }
    }

    async function showFacultyTimetable() {
         mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading timetable...</div>`;
        try {
            const response = await fetch(`${API_BASE_URL}/timetable/faculty/${sessionStorage.getItem('userId')}`);
            if (!response.ok) throw new Error('Could not fetch timetable');
            const timetable = await response.json();
            const days = Object.keys(timetable.schedule);
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg"><h2 class="text-2xl font-bold mb-4">My Weekly Timetable</h2><div class="overflow-x-auto"><table class="min-w-full border"><thead class="bg-gray-100"><tr><th class="py-2 px-3 border">Day</th>${timetable.timeSlots.map(ts => `<th class="py-2 px-3 border">${ts}</th>`).join('')}</tr></thead><tbody class="divide-y">${days.map(day => `<tr><td class="py-2 px-3 border font-semibold">${day}</td>${timetable.schedule[day].map(slot => `<td class="py-2 px-3 border text-center">${slot || '---'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
        } catch(error) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load timetable.</div>`; }
    }

    async function showFacultyAttendance() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Mark Attendance</h2>
            <div class="flex gap-4 mb-4">
                <input type="date" id="attendance-date" class="p-2 border rounded">
                <select id="attendance-class" class="p-2 border rounded">
                    <option>CS-301</option>
                    <option>CS-501</option>
                    <option>CS-502</option>
                </select>
                <button id="load-students-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Load Students</button>
            </div>
            <div id="student-list-container"></div>
        </div>`;

        document.getElementById('load-students-btn').addEventListener('click', async () => {
            const container = document.getElementById('student-list-container');
            container.innerHTML = 'Loading students...';
            try {
                const res = await fetch(`${API_BASE_URL}/users?role=Student`);
                const { users } = await res.json();

                const studentRows = users.map(s => `
                    <tr class="student-row border-b" data-student-id="${s.id}">
                        <td class="p-2">${s.name}</td>
                        <td class="p-2">${s.id}</td>
                        <td class="p-2">
                            <label class="mr-4"><input type="radio" name="status-${s.id}" value="P" checked> Present</label>
                            <label><input type="radio" name="status-${s.id}" value="A"> Absent</label>
                        </td>
                    </tr>
                `).join('');

                container.innerHTML = `
                    <table class="min-w-full bg-white">
                        <thead><tr class="bg-gray-100"><th class="p-2 text-left">Name</th><th class="p-2 text-left">ID</th><th class="p-2 text-left">Status</th></tr></thead>
                        <tbody>${studentRows}</tbody>
                    </table>
                    <button id="submit-attendance-btn" class="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg">Submit Attendance</button>
                `;

                document.getElementById('submit-attendance-btn').addEventListener('click', async () => {
                    const date = document.getElementById('attendance-date').value;
                    const className = document.getElementById('attendance-class').value;
                    if (!date) {
                        showNotification('Please select a date.', true);
                        return;
                    }
                    const records = Array.from(document.querySelectorAll('.student-row')).map(row => ({
                        studentId: row.dataset.studentId,
                        status: row.querySelector('input[type="radio"]:checked').value,
                        date: date,
                        class: className
                    }));

                    try {
                        const response = await fetch(`${API_BASE_URL}/attendance`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ records })
                        });
                        if (response.ok) { showNotification('Attendance submitted successfully!'); }
                        else { showNotification('Failed to submit attendance.', true); }
                    } catch(err) { showNotification('Server error.', true); }
                });

            } catch(err) { container.innerHTML = '<p class="text-red-500">Could not load students.</p>'; }
        });
    }

    async function showFacultyMarks() {
         mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Enter Marks</h2>
            <div class="flex gap-4 mb-4">
                <select id="marks-subject" class="p-2 border rounded">
                    <option value="CS-501 - Algorithms">CS-501 - Algorithms</option>
                    <option value="CS-502 - Database Systems">CS-502 - Database Systems</option>
                    <option value="CS-503 - Operating Systems">CS-503 - Operating Systems</option>
                </select>
                <button id="load-marks-students-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Load Students</button>
            </div>
            <div id="marks-student-list-container"></div>
        </div>`;

        document.getElementById('load-marks-students-btn').addEventListener('click', async () => {
             const container = document.getElementById('marks-student-list-container');
             container.innerHTML = 'Loading students...';
             try {
                const res = await fetch(`${API_BASE_URL}/users?role=Student`);
                const { users } = await res.json();

                const studentRows = users.map(s => `
                    <tr class="marks-row border-b" data-student-id="${s.id}">
                        <td class="p-2">${s.name} (${s.id})</td>
                        <td class="p-2"><input type="number" placeholder="Marks" class="marks-obtained w-24 p-1 border rounded"></td>
                        <td class="p-2"><input type="number" value="100" class="max-marks w-24 p-1 border rounded"></td>
                        <td class="p-2"><input type="number" placeholder="GP" class="grade-point w-24 p-1 border rounded"></td>
                    </tr>
                `).join('');

                 container.innerHTML = `
                    <table class="min-w-full bg-white">
                        <thead><tr class="bg-gray-100"><th class="p-2 text-left">Student</th><th class="p-2 text-left">Marks Obtained</th><th class="p-2 text-left">Max Marks</th><th class="p-2 text-left">Grade Point</th></tr></thead>
                        <tbody>${studentRows}</tbody>
                    </table>
                    <button id="submit-marks-btn" class="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg">Submit Marks</button>
                `;

                document.getElementById('submit-marks-btn').addEventListener('click', async () => {
                    const subjectInfo = document.getElementById('marks-subject').value;
                    const [subjectCode, subjectName] = subjectInfo.split(' - ');

                    const records = Array.from(document.querySelectorAll('.marks-row')).map(row => ({
                        studentId: row.dataset.studentId,
                        subjectCode,
                        subjectName,
                        marksObtained: parseInt(row.querySelector('.marks-obtained').value) || 0,
                        maxMarks: parseInt(row.querySelector('.max-marks').value) || 100,
                        gradePoint: parseInt(row.querySelector('.grade-point').value) || 0,
                    })).filter(r => r.marksObtained > 0); // Only submit rows where marks were entered

                    if (records.length === 0) {
                        showNotification('Please enter marks for at least one student.', true);
                        return;
                    }

                     try {
                        const response = await fetch(`${API_BASE_URL}/marks`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ records })
                        });
                        if (response.ok) { showNotification('Marks submitted successfully!'); }
                        else { showNotification('Failed to submit marks.', true); }
                    } catch(err) { showNotification('Server error.', true); }
                });

             } catch(err) { container.innerHTML = '<p class="text-red-500">Could not load students.</p>'; }
        });
    }

    async function showFacultySearch() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Search Student</h2>
            <div class="flex gap-2">
                <input type="text" id="student-search-input" placeholder="Enter Student ID" class="flex-grow p-2 border rounded">
                <button id="student-search-btn" class="bg-blue-600 text-white px-6 py-2 rounded-lg">Search</button>
            </div>
            <div id="student-search-results" class="mt-6"></div>
        </div>`;

        document.getElementById('student-search-btn').addEventListener('click', async () => {
            const studentId = document.getElementById('student-search-input').value.trim();
            const resultsContainer = document.getElementById('student-search-results');
            if (!studentId) {
                resultsContainer.innerHTML = '<p class="text-red-500">Please enter a student ID.</p>';
                return;
            }
            resultsContainer.innerHTML = 'Searching...';
            try {
                const [profileRes, analyticsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/profile/${studentId}`),
                    fetch(`${API_BASE_URL}/analytics/${studentId}`)
                ]);

                if (!profileRes.ok) {
                    resultsContainer.innerHTML = '<p class="text-red-500">Student not found.</p>';
                    return;
                }
                const { profile } = await profileRes.json();
                const { analytics } = await analyticsRes.json();

                 resultsContainer.innerHTML = `
                    <div class="border p-4 rounded-lg">
                        <h3 class="text-xl font-bold">${profile.name} (${profile.id})</h3>
                        <p>${profile.department} - ${profile.course}</p>
                        <hr class="my-3">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="text-center p-2 bg-gray-100 rounded">
                                <p class="text-sm">CGPA</p>
                                <p class="font-bold text-2xl">${analytics.cgpa}</p>
                            </div>
                            <div class="text-center p-2 bg-gray-100 rounded">
                                <p class="text-sm">Attendance</p>
                                <p class="font-bold text-2xl">${analytics.attendancePercentage}%</p>
                            </div>
                             <div class="text-center p-2 bg-gray-100 rounded">
                                <p class="text-sm">Overall %</p>
                                <p class="font-bold text-2xl">${analytics.overallPercentage}%</p>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                resultsContainer.innerHTML = '<p class="text-red-500">An error occurred while searching.</p>';
            }
        });
    }

    async function showFacultyMLInsights() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading ML Insights...</div>`;
        try {
            const response = await fetch(`${API_BASE_URL}/historical-data`);
            const { historicalData } = await response.json();

            const students = {};
            historicalData.forEach(d => {
                if (!students[d.studentId]) students[d.studentId] = { semesters: [], cgp_s: [], attendance: [] };
                students[d.studentId].semesters.push(d.semester);
                students[d.studentId].cgp_s.push(d.cgpa);
                students[d.studentId].attendance.push(d.attendance);
            });

            let predictions = [];
            for (const studentId in students) {
                const data = students[studentId];
                if (data.semesters.length > 1) {
                    const lastCgpa = data.cgp_s[data.cgp_s.length - 1];
                    const secondLastCgpa = data.cgp_s[data.cgp_s.length - 2];
                    const trend = lastCgpa - secondLastCgpa;
                    let predictedCgpa = lastCgpa + trend * 0.8;
                    predictedCgpa = Math.max(0, Math.min(10, predictedCgpa));

                    predictions.push({
                        studentId,
                        lastCgpa: lastCgpa.toFixed(2),
                        predictedCgpa: predictedCgpa.toFixed(2),
                        risk: predictedCgpa < 6.5 ? 'High' : predictedCgpa < 7.5 ? 'Medium' : 'Low'
                    });
                }
            }

            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-4">Student Performance Prediction</h2>
                <p class="text-sm text-gray-500 mb-4">This is a simplified prediction based on past CGPA trends to identify students at risk.</p>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-100"><tr>
                            <th class="p-2 text-left">Student ID</th>
                            <th class="p-2 text-center">Last CGPA</th>
                            <th class="p-2 text-center">Predicted Next Sem CGPA</th>
                            <th class="p-2 text-center">Risk Level</th>
                        </tr></thead>
                        <tbody>${predictions.map(p => `
                            <tr class="border-b">
                                <td class="p-2">${p.studentId}</td>
                                <td class="p-2 text-center">${p.lastCgpa}</td>
                                <td class="p-2 text-center font-bold">${p.predictedCgpa}</td>
                                <td class="p-2 text-center"><span class="px-3 py-1 text-xs rounded-full ${p.risk === 'High' ? 'bg-red-200 text-red-800' : p.risk === 'Medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}">${p.risk}</span></td>
                            </tr>
                        `).join('')}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load ML insights.</div>`;
        }
    }

    // --- HOD FUNCTIONS ---
    async function showHODDashboard() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading HOD Dashboard...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const res = await fetch(`${API_BASE_URL}/hod/dashboard/${user.department}`);
            const { data } = await res.json();

            mainContent.innerHTML = `
                <div class="space-y-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Total Students</h3><p class="text-4xl font-bold text-blue-600 mt-2">${data.totalStudents}</p></div>
                        <div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Total Faculty</h3><p class="text-4xl font-bold text-purple-600 mt-2">${data.totalFaculty}</p></div>
                        <div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Avg. Attendance</h3><p class="text-4xl font-bold text-orange-500 mt-2">${data.avgAttendance}%</p></div>
                        <div class="bg-white p-6 rounded-lg shadow-lg text-center"><h3 class="text-lg font-semibold text-gray-500">Avg. CGPA</h3><p class="text-4xl font-bold text-green-600 mt-2">${data.avgCgpa}</p></div>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <h3 class="text-xl font-bold mb-4">Programs Offered</h3>
                        <div class="overflow-x-auto">
                            <table class="min-w-full">
                                <thead class="bg-gray-100"><tr>
                                    <th class="p-2 text-left">Program</th>
                                    <th class="p-2 text-left">Degree</th>
                                    <th class="p-2 text-left">Specialization</th>
                                </tr></thead>
                                <tbody>
                                    ${data.programs.map(p => `<tr class="border-b"><td class="p-2">${p.programName}</td><td class="p-2">${p.degree}</td><td class="p-2">${p.specialization}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
             mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load HOD dashboard.</div>`;
        }
    }

    async function showHODFaculty() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading Faculty...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const res = await fetch(`${API_BASE_URL}/users?role=Faculty&department=${user.department}`);
            const { users } = await res.json();
             mainContent.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Faculty Members - ${user.department}</h2>
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="bg-gray-100"><tr>
                                <th class="p-2 text-left">Name</th>
                                <th class="p-2 text-left">Email</th>
                                <th class="p-2 text-left">Phone</th>
                            </tr></thead>
                            <tbody>
                                ${users.map(f => `<tr class="border-b">
                                    <td class="p-2">${f.name}</td>
                                    <td class="p-2">${f.email}</td>
                                    <td class="p-2">${f.phone}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
             mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load faculty data.</div>`;
        }
    }

    // --- ADMIN FUNCTIONS ---

    async function showAdminManageUsers() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading users...</div>`;
        try {
            const res = await fetch(`${API_BASE_URL}/users`);
            const { users } = await res.json();

            const renderTable = (filteredUsers) => {
                document.getElementById('user-table-container').innerHTML = `
                    <table class="min-w-full">
                        <thead class="bg-gray-100"><tr>
                            <th class="p-2 text-left">Name</th><th class="p-2 text-left">User ID</th><th class="p-2 text-left">Role</th><th class="p-2 text-left">Department</th><th></th>
                        </tr></thead>
                        <tbody>${filteredUsers.map(u => `
                            <tr class="border-b">
                                <td class="p-2">${u.name}</td><td class="p-2">${u.id}</td><td class="p-2">${u.role}</td><td class="p-2">${u.department || 'N/A'}</td>
                                <td class="p-2"><button class="delete-user-btn text-red-500" data-id="${u.id}" data-name="${u.name}">Delete</button></td>
                            </tr>
                        `).join('')}</tbody>
                    </table>`;
                 document.querySelectorAll('.delete-user-btn').forEach(btn => {
                    btn.addEventListener('click', async e => {
                        const id = e.target.dataset.id;
                        const name = e.target.dataset.name;
                        if (!confirm(`Are you sure you want to delete user ${name} (${id})?`)) return;
                        try {
                            const delRes = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
                            if(delRes.ok) { showNotification('User deleted.'); showAdminManageUsers(); }
                            else { showNotification('Failed to delete user.', true); }
                        } catch(err) { showNotification('Server error.', true); }
                    });
                });
            };

            mainContent.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Manage Users</h2>
                    <div class="mb-4">
                        <select id="role-filter" class="p-2 border rounded"><option value="">All Roles</option><option>Student</option><option>Faculty</option><option>Admin</option><option>HOD</option></select>
                    </div>
                    <div id="user-table-container" class="overflow-x-auto"></div>
                </div>`;

            renderTable(users);

            document.getElementById('role-filter').addEventListener('change', e => {
                const role = e.target.value;
                const filtered = role ? users.filter(u => u.role === role) : users;
                renderTable(filtered);
            });

        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load users.</div>`;
        }
    }

    async function showAdminTimetables() {
        const departmentOptions = `
            <option value="">-- Select a Department --</option>
            <option>Computer Science and Engg</option>
            <option>Dept of Computer Application</option>
            <option>Graduate School of Business</option>
            <option>Dept of Mechanical Engg</option>
            <option>Dept of ECE</option>
            <option>Dept of Electronics and Communication Engg</option>
            <option>Dept of Civil Engg</option>
            <option>Dept of Applied Science</option>
            <option>Dept of Agriculture</option>
            <option>Dept of Pharmacy</option>
        `;

        mainContent.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-lg">
                <div id="timetable-main-view">
                    <h2 class="text-2xl font-bold mb-6">Manage Timetables</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label for="timetable-department-filter" class="block text-sm font-medium text-gray-700 mb-1">Step 1: Department</label>
                            <select id="timetable-department-filter" class="w-full p-2 border rounded-md shadow-sm">
                                ${departmentOptions}
                            </select>
                        </div>
                        <div id="timetable-course-container" class="hidden"></div>
                        <div id="timetable-year-container" class="hidden"></div>
                    </div>
                    <div id="timetable-selection-container" class="mt-6"></div>
                </div>
                <div id="timetable-edit-container" class="hidden"></div>
            </div>
        `;

        const departmentSelect = document.getElementById('timetable-department-filter');
        const courseContainer = document.getElementById('timetable-course-container');
        const yearContainer = document.getElementById('timetable-year-container');
        const selectionContainer = document.getElementById('timetable-selection-container');

        departmentSelect.addEventListener('change', async (e) => {
            const selectedDepartment = e.target.value;
            courseContainer.innerHTML = '';
            courseContainer.classList.add('hidden');
            yearContainer.innerHTML = '';
            yearContainer.classList.add('hidden');
            selectionContainer.innerHTML = '';

            if (!selectedDepartment) return;

            courseContainer.innerHTML = '<p>Loading courses...</p>';
            courseContainer.classList.remove('hidden');

            try {
                const response = await fetch(`${API_BASE_URL}/hod/dashboard/${encodeURIComponent(selectedDepartment)}`);
                if (!response.ok) throw new Error('Could not fetch programs.');
                const { data } = await response.json();

                if (data.programs && data.programs.length > 0) {
                    const courseOptions = data.programs.map(p => `<option value="${p.degree}">${p.programName}</option>`).join('');
                    courseContainer.innerHTML = `
                        <label for="timetable-course-filter" class="block text-sm font-medium text-gray-700 mb-1">Step 2: Course</label>
                        <select id="timetable-course-filter" class="w-full p-2 border rounded-md shadow-sm">
                            <option value="">-- Select a Course --</option>
                            ${courseOptions}
                        </select>
                    `;
                    document.getElementById('timetable-course-filter').addEventListener('change', handleCourseSelection);
                } else {
                    courseContainer.innerHTML = '<p class="text-gray-500 mt-7">No courses found.</p>';
                }
            } catch (error) {
                courseContainer.innerHTML = `<p class="text-red-500 mt-7">Error: ${error.message}</p>`;
            }
        });

        const handleCourseSelection = () => {
            const selectedCourse = document.getElementById('timetable-course-filter').value;
            selectionContainer.innerHTML = '';
            yearContainer.classList.add('hidden');

            if (!selectedCourse) return;
            
            yearContainer.innerHTML = `
                <label for="timetable-year-filter" class="block text-sm font-medium text-gray-700 mb-1">Step 3: Year</label>
                <select id="timetable-year-filter" class="w-full p-2 border rounded-md shadow-sm">
                    <option value="">-- Select a Year --</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                </select>
            `;
            yearContainer.classList.remove('hidden');
            document.getElementById('timetable-year-filter').addEventListener('change', handleYearSelection);
        };

        const handleYearSelection = async () => {
            const selectedDepartment = departmentSelect.value;
            const selectedCourse = document.getElementById('timetable-course-filter').value;
            const selectedYear = document.getElementById('timetable-year-filter').value;
            selectionContainer.innerHTML = '';

            if (!selectedYear) return;

            selectionContainer.innerHTML = '<p>Loading timetables...</p>';

            try {
                const [allTimetablesRes, studentsRes, facultyRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/timetables`),
                    fetch(`${API_BASE_URL}/users?role=Student&department=${encodeURIComponent(selectedDepartment)}`),
                    fetch(`${API_BASE_URL}/users?role=Faculty&department=${encodeURIComponent(selectedDepartment)}`)
                ]);

                if (!allTimetablesRes.ok || !studentsRes.ok || !facultyRes.ok) throw new Error('Failed to fetch data.');

                const allTimetables = await allTimetablesRes.json();
                const { users: allStudents } = await studentsRes.json();
                const { users: faculty } = await facultyRes.json();

                const currentClientYear = new Date().getFullYear();
                const calculateYear = (academicYear) => {
                    if (!academicYear || !academicYear.includes('-')) return 0;
                    const startYear = parseInt(academicYear.split('-')[0], 10);
                    return (currentClientYear - startYear) + 1;
                };
                
                const yearStudents = allStudents.filter(s => s.course === selectedCourse && calculateYear(s.academicYear) === parseInt(selectedYear));
                const batches = [...new Set(yearStudents.map(s => s.batch).filter(b => b))];

                let studentHtml = '<div><h3 class="text-xl font-bold mb-4">Student Timetables (Batches)</h3>';
                if (batches.length > 0) {
                    studentHtml += '<div class="space-y-2">' + batches.map(batch => `
                        <div class="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <span>Batch: ${batch}</span>
                            <button class="edit-timetable-btn bg-blue-500 text-white px-3 py-1 text-sm rounded-md" data-type="student" data-id="${batch}">Edit</button>
                        </div>
                    `).join('') + '</div>';
                } else {
                    studentHtml += '<p class="text-gray-500">No student batches found for this year and course.</p>';
                }
                studentHtml += '</div>';

                let facultyHtml = '<div class="mt-8"><h3 class="text-xl font-bold mb-4">Faculty Timetables</h3>';
                if (faculty.length > 0) {
                    facultyHtml += '<div class="space-y-2">' + faculty.map(f => `
                        <div class="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <span>${f.name} (${f.id})</span>
                            <button class="edit-timetable-btn bg-blue-500 text-white px-3 py-1 text-sm rounded-md" data-type="faculty" data-id="${f.id}">Edit</button>
                        </div>
                    `).join('') + '</div>';
                } else {
                    facultyHtml += '<p class="text-gray-500">No faculty found for this department.</p>';
                }
                facultyHtml += '</div>';

                selectionContainer.innerHTML = studentHtml + facultyHtml;

                document.querySelectorAll('.edit-timetable-btn').forEach(btn => {
                    btn.addEventListener('click', e => {
                        const { type, id } = e.target.dataset;
                        const timetableData = (type === 'student' ? allTimetables.student[id] : allTimetables.faculty[id]);
                        if (timetableData) {
                            renderEditableTimetable(type, id, timetableData);
                        } else {
                            showNotification(`Timetable for ${id} not found. You may need to create it first.`, true);
                        }
                    });
                });

            } catch (error) {
                selectionContainer.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
            }
        };
    }

    function renderEditableTimetable(type, id, data) {
        document.getElementById('timetable-main-view').classList.add('hidden');
        const editContainer = document.getElementById('timetable-edit-container');
        editContainer.classList.remove('hidden');

        const isStudent = type === 'student';

        const headerRow = data.timeSlots.map(slot => `<th class="p-1 border">${slot}</th>`).join('');
        const bodyRows = Object.keys(data.schedule).map(day => {
            const daySlots = data.schedule[day].map((slot, index) => {
                if (isStudent) {
                    const subject = slot?.subject || '';
                    const faculty = slot?.faculty || '';
                    return `<td class="p-1 border">
                                <input type="text" placeholder="Subject" class="w-full p-1 border rounded text-sm mb-1" data-day="${day}" data-index="${index}" data-field="subject" value="${subject}">
                                <input type="text" placeholder="Faculty" class="w-full p-1 border rounded text-sm" data-day="${day}" data-index="${index}" data-field="faculty" value="${faculty}">
                           </td>`;
                } else {
                    const value = slot || '';
                    return `<td class="p-1 border"><input type="text" class="w-full p-1 border rounded text-sm" data-day="${day}" data-index="${index}" value="${value}"></td>`;
                }
            }).join('');
            return `<tr><th class="p-1 border">${day}</th>${daySlots}</tr>`;
        }).join('');

        editContainer.innerHTML = `
            <h3 class="text-xl font-bold mb-4">Editing Timetable for ${type === 'student' ? `Batch ${id}` : `Faculty ${id}`}</h3>
            <div class="overflow-x-auto">
                 <table id="editable-timetable" class="min-w-full border-collapse">
                    <thead><tr><th class="p-1 border">Day/Time</th>${headerRow}</tr></thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>
            <div class="mt-4">
                <button id="save-timetable-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg">Save Changes</button>
                <button id="cancel-edit-timetable-btn" class="bg-gray-500 text-white px-4 py-2 rounded-lg">Back</button>
            </div>
        `;

        document.getElementById('cancel-edit-timetable-btn').addEventListener('click', () => {
             // Simply call the main function again to reset the view
            showAdminTimetables();
        });

        document.getElementById('save-timetable-btn').addEventListener('click', async () => {
            const newSchedule = {};
            const table = document.getElementById('editable-timetable');

            Object.keys(data.schedule).forEach(day => {
                newSchedule[day] = [];
                for (let i = 0; i < data.timeSlots.length; i++) {
                    if (isStudent) {
                        const subjectInput = table.querySelector(`input[data-day="${day}"][data-index="${i}"][data-field="subject"]`);
                        const facultyInput = table.querySelector(`input[data-day="${day}"][data-index="${i}"][data-field="faculty"]`);
                        if (subjectInput.value || facultyInput.value) {
                            newSchedule[day].push({ subject: subjectInput.value, faculty: facultyInput.value });
                        } else {
                            newSchedule[day].push(null);
                        }
                    } else {
                        const input = table.querySelector(`input[data-day="${day}"][data-index="${i}"]`);
                        newSchedule[day].push(input.value || null);
                    }
                }
            });

            const url = `${API_BASE_URL}/timetables/${type}/${id}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ schedule: newSchedule })
                });
                if (response.ok) {
                    showNotification('Timetable updated successfully!');
                    showAdminTimetables();
                } else {
                    throw new Error('Failed to save timetable.');
                }
            } catch (error) {
                showNotification(error.message, true);
            }
        });
    }


    async function showAdminIdRequests() {
         mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading ID Card Requests...</div>`;
         try {
            const res = await fetch(`${API_BASE_URL}/id-card-requests`);
            const requests = await res.json();

            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-4">ID Card Requests</h2>
                <div class="space-y-4">
                ${requests.length > 0 ? requests.map(r => `
                    <div class="border rounded-lg p-4 flex flex-col md:flex-row items-start gap-4">
                        <img src="${API_BASE_URL}${r.photoUrl}" class="w-24 h-24 object-cover rounded-md flex-shrink-0">
                        <div class="flex-grow">
                            <p class="font-bold text-lg">${r.userName} (${r.userId})</p>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                                <p><strong>Phone:</strong> ${r.phone || 'N/A'}</p>
                                <p><strong>DOB:</strong> ${r.dob || 'N/A'}</p>
                                <p><strong>Program:</strong> ${r.program || 'N/A'}</p>
                                <p><strong>Blood Grp:</strong> ${r.bloodGroup || 'N/A'}</p>
                                <p class="col-span-2"><strong>Department:</strong> ${r.department || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                             <p class="text-sm font-bold">Status: <span class="${r.status === 'Pending' ? 'text-orange-500' : r.status === 'Approved' ? 'text-green-600' : 'text-red-600'}">${r.status}</span></p>
                            ${r.status === 'Pending' ? `
                                <button class="resolve-id-btn bg-green-500 text-white px-3 py-1 text-sm rounded" data-action="approve" data-userid="${r.userId}">Approve</button>
                                <button class="resolve-id-btn bg-red-500 text-white px-3 py-1 text-sm rounded" data-action="deny" data-userid="${r.userId}">Deny</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('') : '<p>No pending ID card requests.</p>'}
                </div>
            </div>`;

            document.querySelectorAll('.resolve-id-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const { action, userid } = e.target.dataset;
                    let reason = null;
                    if (action === 'deny') {
                        reason = prompt("Reason for denial (optional):");
                        if (reason === null) return; // User cancelled
                    }
                    try {
                        const response = await fetch(`${API_BASE_URL}/resolve-id-card-request`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ userId: userid, action, reason })
                        });
                        if (response.ok) { showNotification('Request resolved.'); showAdminIdRequests(); }
                        else { showNotification('Action failed.', true); }
                    } catch(err) { showNotification('Server Error.', true); }
                });
            });

         } catch (error) {
             mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load requests.</div>`;
         }
    }

    async function showAdminSignupRequests() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading Sign-up Requests...</div>`;
        try {
            const currentUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
            let requests = await fetch(`${API_BASE_URL}/signup-requests`).then(res => res.json());

            // If the user is an HOD, filter requests for their department
            if (currentUser.role === 'HOD') {
                requests = requests.filter(r => r.department === currentUser.department);
            }

             mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-4">Sign-up Requests</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-100"><tr>
                            <th class="p-2 text-left">Name</th><th class="p-2 text-left">User ID</th><th class="p-2 text-left">Email</th><th class="p-2 text-left">Role</th><th class="p-2 text-left">Department</th><th></th>
                        </tr></thead>
                        <tbody>${requests.map(r => `
                            <tr class="border-b">
                                <td class="p-2">${r.name}</td><td class="p-2">${r.userId}</td><td class="p-2">${r.email}</td><td class="p-2">${r.role}</td><td class="p-2">${r.department || 'N/A'}</td>
                                <td class="p-2 flex gap-2">
                                    <button class="resolve-signup-btn bg-green-500 text-white px-2 py-1 text-sm rounded" data-action="approve" data-userid="${r.userId}">Approve</button>
                                    <button class="resolve-signup-btn bg-red-500 text-white px-2 py-1 text-sm rounded" data-action="deny" data-userid="${r.userId}">Deny</button>
                                </td>
                            </tr>
                        `).join('')}</tbody>
                    </table>
                     ${requests.length === 0 ? '<p class="mt-4">No pending sign-up requests.</p>' : ''}
                </div>
            </div>`;
            document.querySelectorAll('.resolve-signup-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const { action, userid } = e.target.dataset;
                     try {
                        const response = await fetch(`${API_BASE_URL}/resolve-signup`, {
                            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId: userid, action })
                        });
                        if (response.ok) { showNotification('Request resolved.'); showAdminSignupRequests(); }
                        else { showNotification('Action failed.', true); }
                    } catch(err) { showNotification('Server Error.', true); }
                });
            });
         } catch(err) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load requests.</div>`;}
    }

    async function showAdminPasswordRequests() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading Password Requests...</div>`;
        try {
            const requests = await fetch(`${API_BASE_URL}/password-requests`).then(res => res.json());
             mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-4">Password Reset Requests</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                         <thead class="bg-gray-100"><tr>
                            <th class="p-2 text-left">Name</th><th class="p-2 text-left">User ID</th><th></th>
                        </tr></thead>
                        <tbody>${requests.map(r => `
                             <tr class="border-b">
                                <td class="p-2">${r.userName}</td><td class="p-2">${r.userId}</td>
                                <td class="p-2 flex gap-2">
                                    <button class="resolve-pw-btn bg-green-500 text-white px-2 py-1 text-sm rounded" data-action="approve" data-userid="${r.userId}">Approve</button>
                                    <button class="resolve-pw-btn bg-red-500 text-white px-2 py-1 text-sm rounded" data-action="deny" data-userid="${r.userId}">Deny</button>
                                </td>
                            </tr>
                        `).join('')}</tbody>
                    </table>
                     ${requests.length === 0 ? '<p class="mt-4">No pending password requests.</p>' : ''}
                </div>
            </div>`;
            document.querySelectorAll('.resolve-pw-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const { action, userid } = e.target.dataset;
                     try {
                        const response = await fetch(`${API_BASE_URL}/resolve-password-request`, {
                            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId: userid, action })
                        });
                        if (response.ok) { showNotification('Request resolved.'); showAdminPasswordRequests(); }
                        else { showNotification('Action failed.', true); }
                    } catch(err) { showNotification('Server Error.', true); }
                });
            });
        } catch(err) { mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load requests.</div>`;}
    }

    // --- ANNOUNCEMENT FUNCTIONS (SHARED LOGIC) ---
    async function showStudentAnnouncements() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading announcements...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const response = await fetch(`${API_BASE_URL}/announcements/feed?role=${user.role}&department=${encodeURIComponent(user.department)}`);
            const { announcements } = await response.json();
            
            const announcementsHtml = announcements.length > 0 ? announcements.map(a => `
                <div class="border p-4 rounded-md bg-gray-50">
                    <p>${a.text}</p>
                    <p class="text-xs text-gray-500 mt-2">
                        Posted by ${a.authorName} (${a.authorRole}) on ${new Date(a.date).toLocaleString()}
                    </p>
                </div>
            `).join('') : '<p>No announcements right now.</p>';

            mainContent.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Announcements</h2>
                    <div class="space-y-4">
                        ${announcementsHtml}
                    </div>
                </div>`;
        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load announcements.</div>`;
        }
    }

    async function showFacultyAnnouncements() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        
        try {
            const response = await fetch(`${API_BASE_URL}/announcements/feed?role=${user.role}&department=${encodeURIComponent(user.department)}`);
            const { announcements } = await response.json();

            const announcementsHtml = announcements.length > 0 ? announcements.map(a => `
                <div class="border p-4 rounded-md bg-gray-50">
                    <p>${a.text}</p>
                    <p class="text-xs text-gray-500 mt-2">
                        Posted by ${a.authorName} (${a.authorRole}) on ${new Date(a.date).toLocaleString()}
                    </p>
                </div>
            `).join('') : '<p>No announcements in your feed.</p>';

            mainContent.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Announcements</h2>
                    <div class="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h3 class="text-lg font-semibold mb-2">Create a New Announcement for Students</h3>
                        <form id="announcement-form">
                            <textarea id="announcement-text" class="w-full p-2 border rounded" placeholder="Type new announcement here..."></textarea>
                            <button type="submit" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg">Post to Students</button>
                        </form>
                    </div>
                    <h3 class="text-xl font-bold mb-4">Your Feed</h3>
                    <div class="space-y-4">
                        ${announcementsHtml}
                    </div>
                </div>`;

            document.getElementById('announcement-form').addEventListener('submit', async e => {
                e.preventDefault();
                const text = document.getElementById('announcement-text').value;
                if (!text) return;
                const payload = {
                    text,
                    authorName: user.name,
                    authorRole: user.role,
                    scope: 'students'
                };
                try {
                    const res = await fetch(`${API_BASE_URL}/announcements`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                    });
                    if (res.ok) { showNotification('Announcement posted!'); showFacultyAnnouncements(); }
                    else { showNotification('Failed to post.', true); }
                } catch(err) { showNotification('Server error.', true); }
            });

        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load announcement page.</div>`;
        }
    }

    async function showHODAnnouncements() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        
        try {
            const response = await fetch(`${API_BASE_URL}/announcements/feed?role=${user.role}&department=${encodeURIComponent(user.department)}`);
            const { announcements } = await response.json();

            const announcementsHtml = announcements.length > 0 ? announcements.map(a => `
                <div class="border p-4 rounded-md bg-gray-50">
                    <p>${a.text}</p>
                    <p class="text-xs text-gray-500 mt-2">
                        Posted by ${a.authorName} (${a.authorRole}) on ${new Date(a.date).toLocaleString()}
                    </p>
                </div>
            `).join('') : '<p>No announcements in your feed.</p>';

            mainContent.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Department Announcements</h2>
                    <div class="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h3 class="text-lg font-semibold mb-2">Create a New Announcement</h3>
                        <form id="announcement-form">
                            <textarea id="announcement-text" class="w-full p-2 border rounded mb-2" placeholder="Type new announcement here..."></textarea>
                            <label for="announcement-scope" class="block text-sm font-medium text-gray-700">Audience:</label>
                            <select id="announcement-scope" class="w-full md:w-1/2 p-2 border rounded-md shadow-sm mb-2">
                               <option value="department_students">Department Students Only</option>
                               <option value="department_all">Department Faculty & Students</option>
                            </select>
                            <button type="submit" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg">Post Announcement</button>
                        </form>
                    </div>
                    <h3 class="text-xl font-bold mb-4">Your Feed</h3>
                    <div class="space-y-4">
                        ${announcementsHtml}
                    </div>
                </div>`;

            document.getElementById('announcement-form').addEventListener('submit', async e => {
                e.preventDefault();
                const text = document.getElementById('announcement-text').value;
                const scope = document.getElementById('announcement-scope').value;
                if (!text) return;
                const payload = {
                    text,
                    authorName: user.name,
                    authorRole: user.role,
                    scope: scope,
                    department: user.department
                };
                try {
                    const res = await fetch(`${API_BASE_URL}/announcements`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                    });
                    if (res.ok) { showNotification('Announcement posted!'); showHODAnnouncements(); }
                    else { showNotification('Failed to post.', true); }
                } catch(err) { showNotification('Server error.', true); }
            });

        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load announcement page.</div>`;
        }
    }
    
    async function showAdminAnnouncements() {
        mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg">Loading announcements...</div>`;
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const response = await fetch(`${API_BASE_URL}/announcements`);
            const announcements = await response.json();
            mainContent.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Manage All Announcements</h2>
                    <form id="announcement-form" class="mb-6 p-4 border rounded-lg bg-gray-50">
                        <textarea id="announcement-text" class="w-full p-2 border rounded" placeholder="Type new announcement here..."></textarea>
                        <button type="submit" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg">Post to Everyone</button>
                    </form>
                    <div class="space-y-4">
                        ${announcements.map((a) => `
                            <div class="border p-4 rounded-md flex justify-between items-start">
                                <div>
                                    <p>${a.text}</p>
                                    <p class="text-xs text-gray-500 mt-1">
                                        By: ${a.authorName} (${a.authorRole}) | Scope: ${a.scope} ${a.department ? `(${a.department})` : ''} | On: ${new Date(a.date).toLocaleString()}
                                    </p>
                                </div>
                                <button class="delete-announcement-btn text-red-500 hover:text-red-700" data-id="${a.id}">Delete</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
    
            document.getElementById('announcement-form').addEventListener('submit', async e => {
                e.preventDefault();
                const text = document.getElementById('announcement-text').value;
                if (!text) return;
                const payload = {
                    text,
                    authorName: user.name,
                    authorRole: user.role,
                    scope: 'all'
                };
                try {
                    const res = await fetch(`${API_BASE_URL}/announcements`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                    });
                    if (res.ok) { showNotification('Announcement posted!'); showAdminAnnouncements(); }
                    else { showNotification('Failed to post.', true); }
                } catch(err) { showNotification('Server error.', true); }
            });
    
            document.querySelectorAll('.delete-announcement-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    if (!confirm('Are you sure you want to delete this announcement?')) return;
                    const id = e.target.dataset.id;
                    try {
                        const res = await fetch(`${API_BASE_URL}/announcements/${id}`, {method: 'DELETE'});
                        if (res.ok) { showNotification('Announcement deleted.'); showAdminAnnouncements(); }
                        else { showNotification('Failed to delete.', true); }
                    } catch(err) { showNotification('Server error.', true); }
                });
            });
    
        } catch (error) {
            mainContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg text-red-500">Could not load announcements.</div>`;
        }
    }

    // Check for logged-in user on page load
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        showDashboard(JSON.parse(loggedInUser));
    }
});

