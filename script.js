// --- UTILITY FUNCTIONS ---
const API_BASE_URL = '';

// Data for dynamic course selection in the signup form
const departmentCourses = {
    "Department of Engineering": ["B.Tech - CSE", "B.Tech - ECE", "B.Tech - ME", "M.Tech"],
    "Department of Computer Applications": ["BCA", "MCA"]
    // Add other departments and courses as needed
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

// Helper for nicely styled placeholder content
function renderPlaceholder(title, message) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">${title}</h2>
            <p class="text-gray-600">${message}</p>
        </div>
    `;
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
    const forgotPasswordLinkWrapper = showForgotPasswordLink.parentElement;
    const signupLinkWrapper = showSignupLink.parentElement;
    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const resetPasswordContainer = document.getElementById('reset-password-container');
    const signupForm = document.getElementById('signupForm');
    
    // --- LOGIN FORM LOGIC (Unchanged) ---
    function updateDepartmentVisibility() {
        const isDeptLogin = roleSelect.value === 'Department Login';
        const isEngineeringSelected = departmentSelect.value === 'Department of Engineering';
        departmentSelectContainer.classList.toggle('hidden', !isDeptLogin);
        engineeringDeptSelectContainer.classList.toggle('hidden', !isDeptLogin || !isEngineeringSelected);
    }
    roleSelect.addEventListener('change', updateDepartmentVisibility);
    departmentSelect.addEventListener('change', updateDepartmentVisibility);
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Login logic remains the same...
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

    // --- DASHBOARD AND NAVIGATION LOGIC (Unchanged) ---
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
                if (window.innerWidth < 768) {
                    document.getElementById('sidebar-nav').classList.add('hidden');
                }
            });
        });
    }

    // --- UPDATED: Navigation Mapping to Functional Modules ---
    function loadMainContent(target) {
        const functions = {
            'user-profile': showUserProfile,
            'student-analytics': () => renderPlaceholder("My Analytics", "This section will display charts and graphs visualizing your academic performance, attendance trends, and assignment scores."),
            'student-assignments': showStudentAssignments,
            'student-attendance': () => renderPlaceholder("My Attendance", "A detailed view of your attendance records for each subject will be available here."),
            'student-fees': () => renderPlaceholder("Fee Details", "This section will show your complete fee payment history, outstanding dues, and provide options for online payment."),
            'student-timetable': () => renderPlaceholder("My Timetable", "Your weekly class schedule, including subjects, timings, and faculty names, will be displayed here."),
            'student-id-card': () => renderPlaceholder("My ID Card", "Your digital ID card will be displayed here, along with an option to request a new physical card."),
            'student-announcements': displayAnnouncements,
            'student-leave': showStudentLeave, 
            'faculty-assignments': showFacultyAssignments,
            'faculty-timetable': () => renderPlaceholder("My Timetable", "Your complete teaching schedule for the semester will be available here."),
            'faculty-attendance': () => renderPlaceholder("Mark Attendance", "This module will allow you to take and manage daily student attendance for your classes."),
            'faculty-marks': () => renderPlaceholder("Enter Marks", "A portal for entering, editing, and viewing student marks for various assessments and examinations."),
            'faculty-search': () => renderPlaceholder("Search Student", "A powerful search tool to find student profiles, academic records, and contact information."),
            'faculty-ml-insights': () => renderPlaceholder("ML Insights", "This advanced section will provide AI-powered analytics on student performance, identifying at-risk students and predicting academic outcomes."),
            'faculty-announcements': displayAnnouncements,
            'faculty-leave': showFacultyLeave, 
            'hod-dashboard': () => renderPlaceholder("Department Dashboard", "An overview of department statistics, including student enrollment, faculty workload, and overall academic performance."),
            'hod-faculty': () => renderPlaceholder("Manage Faculty", "A comprehensive tool to view faculty profiles, assign subjects, and manage workload within your department."),
            'hod-announcements': displayAnnouncements,
            'admin-announce': displayAnnouncements,
            'admin-manage-users': showAdminManageUsers,
            'admin-timetables': () => renderPlaceholder("Manage Timetables", "A central hub for creating, editing, and publishing academic timetables for all departments and courses."),
            'admin-id-requests': () => renderPlaceholder("ID Card Requests", "Review and process student requests for new or replacement ID cards."),
            'admin-signup-requests': showAdminSignupRequests,
        };
        const func = functions[target];
        if (func) func();
        else renderPlaceholder("Not Implemented", `The page for target '${target}' is under construction.`);
    }

    function setDefaultPage(links) {
        if (links.length > 0) {
            const defaultTarget = links[0].target;
            document.querySelectorAll(`.nav-link[data-target="${defaultTarget}"]`).forEach(l => l.classList.add('active', 'bg-green-700'));
            loadMainContent(defaultTarget);
        }
    }

    // --- DASHBOARD POPULATION FUNCTIONS (Unchanged) ---
    const populateStudentDashboard = () => {
        const links = [
            { name: 'My Profile', target: 'user-profile'}, { name: 'Announcements', target: 'student-announcements'},
            { name: 'My Analytics', target: 'student-analytics'}, { name: 'Assignments', target: 'student-assignments'},
            { name: 'Attendance', target: 'student-attendance'}, { name: 'Apply for Leave', target: 'student-leave'},
            { name: 'Fee Details', target: 'student-fees'}, { name: 'Timetable', target: 'student-timetable'},
            { name: 'ID Card', target: 'student-id-card'},
        ];
        populateNav(links);
        setDefaultPage(links);
    };
    const populateFacultyDashboard = () => {
        const links = [
            { name: 'My Profile', target: 'user-profile' }, { name: 'Announcements', target: 'faculty-announcements' },
            { name: 'Assignments', target: 'faculty-assignments' }, { name: 'Leave Requests', target: 'faculty-leave' },
            { name: 'ML Insights', target: 'faculty-ml-insights' }, { name: 'Attendance', target: 'faculty-attendance' },
            { name: 'Marks', target: 'faculty-marks' }, { name: 'Search Student', target: 'faculty-search' },
        ];
        populateNav(links);
        setDefaultPage(links);
    };
    const populateAdminDashboard = () => {
        const links = [ 
            { name: 'Announcements', target: 'admin-announce' }, { name: 'Manage Users', target: 'admin-manage-users' }, 
            { name: 'Sign-up Requests', target: 'admin-signup-requests'}, { name: 'ID Card Requests', target: 'admin-id-requests' }, 
            { name: 'Timetables', target: 'admin-timetables'}, 
        ];
        populateNav(links);
        setDefaultPage(links);
    };
    const populateHODDashboard = () => {
        const links = [
            { name: 'Department', target: 'hod-dashboard' }, { name: 'Manage Faculty', target: 'hod-faculty' },
            { name: 'Announcements', target: 'hod-announcements' }, { name: 'Sign-up Requests', target: 'admin-signup-requests' },
            { name: 'Search Student', target: 'faculty-search' }, { name: 'My Profile', target: 'user-profile' }
        ];
        populateNav(links);
        setDefaultPage(links);
    };

    // --- FULLY FUNCTIONAL MODULES ---
    
    // --- User Profile (Unchanged) ---
    async function showUserProfile() { /* This function is already complete and correct */ 
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
    
    // --- Announcements (Unchanged) ---
    async function displayAnnouncements() { /* This function is already complete and correct */ 
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
            } else {
                announcementsHTML += '<div class="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">No announcements yet.</div>';
            }
            mainContent.innerHTML = formHTML + announcementsHTML;
            if (canPostAnnouncements) {
                document.getElementById('announcement-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const postData = { title: document.getElementById('announcement-title').value, content: document.getElementById('announcement-content').value, authorName: user.name, authorRole: user.role, department: user.department || null };
                    const postResponse = await fetch('/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
                    if (postResponse.ok) {
                        showNotification('Announcement posted!');
                        displayAnnouncements();
                    } else {
                        showNotification('Failed to post announcement.', true);
                    }
                });
            }
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load announcements.</div>';
        }
    }

    // --- NEW: Admin - Manage Users ---
    async function showAdminManageUsers() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/users');
            const data = await response.json();
            if (!data.success) throw new Error('Failed to fetch users');
            
            const usersHTML = data.users.map(user => `
                <tr class="border-b">
                    <td class="p-2">${user.name}</td>
                    <td class="p-2">${user.id}</td>
                    <td class="p-2">${user.role}</td>
                    <td class="p-2">${user.department || 'N/A'}</td>
                    <td class="p-2"><button data-userid="${user.id}" class="delete-user-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button></td>
                </tr>
            `).join('');

            mainContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-4">Manage Users</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead><tr class="bg-gray-100">
                                <th class="p-2">Name</th><th class="p-2">User ID</th><th class="p-2">Role</th><th class="p-2">Department</th><th class="p-2">Actions</th>
                            </tr></thead>
                            <tbody>${usersHTML}</tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.querySelectorAll('.delete-user-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const userId = e.target.dataset.userid;
                    if (confirm(`Are you sure you want to delete user ${userId}?`)) {
                        const deleteResponse = await fetch(`/users/${userId}`, { method: 'DELETE' });
                        if(deleteResponse.ok) {
                            showNotification('User deleted!');
                            showAdminManageUsers(); // Refresh list
                        } else {
                            showNotification('Failed to delete user.', true);
                        }
                    }
                });
            });
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load users.</div>';
        }
    }

    // --- NEW: Admin - Signup Requests ---
    async function showAdminSignupRequests() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/signup-requests');
            const requests = await response.json();
            
            let requestsHTML = '';
            if (requests.length > 0) {
                requestsHTML = requests.map(req => `
                    <tr class="border-b">
                        <td class="p-2">${req.name}</td>
                        <td class="p-2">${req.userId}</td>
                        <td class="p-2">${req.role}</td>
                        <td class="p-2">${req.email}</td>
                        <td class="p-2">
                            <button data-userid="${req.userId}" data-action="approve" class="resolve-signup-btn bg-green-500 text-white px-2 py-1 rounded text-sm mr-2">Approve</button>
                            <button data-userid="${req.userId}" data-action="reject" class="resolve-signup-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Reject</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                requestsHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">No pending signup requests.</td></tr>';
            }

            mainContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-4">Sign-up Requests</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead><tr class="bg-gray-100">
                                <th class="p-2">Name</th><th class="p-2">User ID</th><th class="p-2">Role</th><th class="p-2">Email</th><th class="p-2">Actions</th>
                            </tr></thead>
                            <tbody>${requestsHTML}</tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.querySelectorAll('.resolve-signup-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const { userid, action } = e.target.dataset;
                    const response = await fetch('/resolve-signup', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ userId: userid, action })
                    });
                    if (response.ok) {
                        showNotification(`Request has been ${action}ed.`);
                        showAdminSignupRequests(); // Refresh list
                    } else {
                        showNotification('Action failed.', true);
                    }
                });
            });
        } catch(error) {
             mainContent.innerHTML = '<div class="text-red-500">Could not load signup requests.</div>';
        }
    }
    
    // --- NEW: Faculty - Manage Assignments ---
    async function showFacultyAssignments() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/assignments');
            const data = await response.json();
            const assignmentsHTML = (data.assignments || []).map(assign => `
                <div class="bg-gray-50 p-4 rounded-md border mb-3">
                    <h4 class="font-bold">${assign.title}</h4>
                    <p class="text-sm text-gray-600">Due: ${new Date(assign.dueDate).toLocaleDateString()}</p>
                    ${assign.filePath ? `<a href="${assign.filePath}" target="_blank" class="text-sm text-green-600">View Attachment</a>` : ''}
                </div>
            `).join('');

            mainContent.innerHTML = `
                <div class="grid md:grid-cols-2 gap-8">
                    <div>
                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <h2 class="text-2xl font-bold mb-4">Create Assignment</h2>
                            <form id="assignment-form" enctype="multipart/form-data">
                                <div class="mb-4"><label class="block text-sm">Title</label><input type="text" name="title" required class="w-full p-2 border rounded"></div>
                                <div class="mb-4"><label class="block text-sm">Description</label><textarea name="description" rows="3" class="w-full p-2 border rounded"></textarea></div>
                                <div class="mb-4"><label class="block text-sm">Due Date</label><input type="date" name="dueDate" required class="w-full p-2 border rounded"></div>
                                <div class="mb-4"><label class="block text-sm">Attachment (Optional)</label><input type="file" name="assignmentFile" class="w-full"></div>
                                <button type="submit" class="w-full bg-green-600 text-white py-2 rounded">Create</button>
                            </form>
                        </div>
                    </div>
                    <div>
                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <h2 class="text-2xl font-bold mb-4">Posted Assignments</h2>
                            ${assignmentsHTML || '<p class="text-gray-500">No assignments posted yet.</p>'}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('assignment-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
                const formData = new FormData(e.target);
                formData.append('authorName', user.name);
                formData.append('authorId', user.id);
                
                const response = await fetch('/assignments', { method: 'POST', body: formData });
                if (response.ok) {
                    showNotification('Assignment created!');
                    showFacultyAssignments(); // Refresh
                } else {
                    showNotification('Failed to create assignment.', true);
                }
            });
        } catch (error) {
             mainContent.innerHTML = '<div class="text-red-500">Could not load assignments.</div>';
        }
    }

    // --- NEW: Student - View Assignments ---
    async function showStudentAssignments() {
        renderLoader(mainContent);
        try {
             const response = await fetch('/assignments');
             const data = await response.json();
             const assignmentsHTML = (data.assignments || []).map(assign => `
                <div class="bg-white p-6 rounded-lg shadow-md mb-4">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold text-xl">${assign.title}</h3>
                        <span class="text-sm text-gray-500">Due: ${new Date(assign.dueDate).toLocaleDateString()}</span>
                    </div>
                    <p class="text-gray-600 my-2">${assign.description || ''}</p>
                    <div class="text-sm text-gray-500 border-t pt-2 mt-2">
                        <span>Posted by: <strong>${assign.authorName}</strong></span>
                        ${assign.filePath ? `| <a href="${assign.filePath}" target="_blank" class="text-green-600 hover:underline">Download Attachment</a>` : ''}
                    </div>
                </div>
             `).join('');

             mainContent.innerHTML = `
                <h2 class="text-2xl font-bold mb-4">Your Assignments</h2>
                ${assignmentsHTML || '<div class="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">No assignments have been posted.</div>'}
             `;
        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load assignments.</div>';
        }
    }

    // --- NEW: Student - Apply for Leave ---
    async function showStudentLeave() {
        renderLoader(mainContent);
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        try {
            const response = await fetch('/leave-requests');
            const data = await response.json();
            const myRequests = (data.leaveRequests || []).filter(r => r.studentId === user.id);
            
            const requestsHTML = myRequests.map(req => `
                <tr class="border-b">
                    <td class="p-2">${new Date(req.startDate).toLocaleDateString()}</td>
                    <td class="p-2">${new Date(req.endDate).toLocaleDateString()}</td>
                    <td class="p-2">${req.reason}</td>
                    <td class="p-2"><span class="px-2 py-1 text-xs rounded-full ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }">${req.status}</span></td>
                </tr>
            `).join('');

            mainContent.innerHTML = `
                <div class="grid md:grid-cols-2 gap-8">
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h2 class="text-2xl font-bold mb-4">Apply for Leave</h2>
                        <form id="leave-form">
                            <div class="mb-4"><label class="block text-sm">Start Date</label><input type="date" id="start-date" required class="w-full p-2 border rounded"></div>
                            <div class="mb-4"><label class="block text-sm">End Date</label><input type="date" id="end-date" required class="w-full p-2 border rounded"></div>
                            <div class="mb-4"><label class="block text-sm">Reason</label><textarea id="reason" rows="4" required class="w-full p-2 border rounded"></textarea></div>
                            <button type="submit" class="w-full bg-green-600 text-white py-2 rounded">Submit Request</button>
                        </form>
                    </div>
                     <div class="bg-white p-6 rounded-lg shadow-md">
                        <h2 class="text-2xl font-bold mb-4">My Leave Requests</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm">
                                <thead><tr class="bg-gray-100">
                                    <th class="p-2">Start</th><th class="p-2">End</th><th class="p-2">Reason</th><th class="p-2">Status</th>
                                </tr></thead>
                                <tbody>${requestsHTML || '<tr><td colspan="4" class="p-4 text-center text-gray-500">No requests submitted.</td></tr>'}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('leave-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const requestData = {
                    studentId: user.id, studentName: user.name,
                    startDate: document.getElementById('start-date').value,
                    endDate: document.getElementById('end-date').value,
                    reason: document.getElementById('reason').value,
                };
                const response = await fetch('/leave-requests', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(requestData)
                });
                if (response.ok) {
                    showNotification('Leave request submitted!');
                    showStudentLeave(); // Refresh
                } else {
                    showNotification('Failed to submit request.', true);
                }
            });

        } catch (error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load leave information.</div>';
        }
    }
    
    // --- NEW: Faculty - View Leave Requests ---
    async function showFacultyLeave() {
        renderLoader(mainContent);
        try {
            const response = await fetch('/leave-requests');
            const data = await response.json();
            const requestsHTML = (data.leaveRequests || []).map(req => `
                 <tr class="border-b">
                    <td class="p-2">${req.studentName} (${req.studentId})</td>
                    <td class="p-2">${new Date(req.startDate).toLocaleDateString()} to ${new Date(req.endDate).toLocaleDateString()}</td>
                    <td class="p-2">${req.reason}</td>
                    <td class="p-2">${req.status === 'Pending' ? `
                        <button data-id="${req.id}" data-status="Approved" class="resolve-leave-btn bg-green-500 text-white text-xs px-2 py-1 rounded">Approve</button>
                        <button data-id="${req.id}" data-status="Rejected" class="resolve-leave-btn bg-red-500 text-white text-xs px-2 py-1 rounded ml-1">Reject</button>
                    ` : req.status}</td>
                </tr>
            `).join('');

            mainContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-4">Student Leave Requests</h2>
                    <table class="w-full text-left text-sm">
                        <thead><tr class="bg-gray-100"><th class="p-2">Student</th><th class="p-2">Dates</th><th class="p-2">Reason</th><th class="p-2">Status / Action</th></tr></thead>
                        <tbody>${requestsHTML || '<tr><td colspan="4" class="p-4 text-center text-gray-500">No leave requests.</td></tr>'}</tbody>
                    </table>
                </div>
            `;

            document.querySelectorAll('.resolve-leave-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const { id, status } = e.target.dataset;
                    const response = await fetch('/resolve-leave-request', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({id, status})
                    });
                     if (response.ok) {
                        showNotification(`Request has been ${status}.`);
                        showFacultyLeave(); // Refresh
                    } else {
                        showNotification('Action failed.', true);
                    }
                });
            });
        } catch(error) {
            mainContent.innerHTML = '<div class="text-red-500">Could not load leave requests.</div>';
        }
    }

    // --- INITIAL PAGE LOAD LOGIC ---
    function checkInitialState() {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('reset_token');
        const verificationMessage = urlParams.get('message');
        if (verificationMessage) {
            showNotification(decodeURIComponent(verificationMessage));
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (resetToken) {
            document.getElementById('reset-token-input').value = resetToken;
            showAuthPage(loginContainer); // You might want a specific reset container
        } else {
            const loggedInUser = sessionStorage.getItem('loggedInUser');
            if (loggedInUser) {
                showDashboard(JSON.parse(loggedInUser));
            } else {
                document.getElementById('login-signup-wrapper').classList.remove('hidden');
                updateDepartmentVisibility();
            }
        }
    }
    checkInitialState();
});
```

---

### ## Final Step: Deploy Your Functional Application

1.  **Replace your `server.js` and `script.js`** files with the new code provided above.
2.  **Save the changes** in your code editor.
3.  **Push the updates to GitHub**. Run these commands in your VS Code terminal:

    ```bash
    git add .
    git commit -m "Implement core functional modules for all roles"
    git push origin main
    
