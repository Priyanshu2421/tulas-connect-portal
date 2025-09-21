// --- UTILITY FUNCTIONS ---
const API_BASE_URL = '';
// ... (departmentCourses object is unchanged) ...
function showNotification(message, isError = false) { /* ... existing code ... */ }


// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS (with new ones) ---
    // ... (most existing selectors are unchanged) ...
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const newPasswordContainer = document.getElementById('new-password-container'); // NEW
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const newPasswordForm = document.getElementById('newPasswordForm'); // NEW

    
    // --- NEW: URL PARAMETER HANDLING ---
    // This runs on page load to handle redirects from email links
    const handleUrlParams = () => {
        const params = new URLSearchParams(window.location.search);
        const resetToken = params.get('resetToken');
        const verificationStatus = params.get('status');

        if (resetToken) {
            // Show the 'set new password' form
            showAuthPage(newPasswordContainer);
            newPasswordContainer.querySelector('input[name="token"]').value = resetToken;
            // Clean the URL
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
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };
    
    handleUrlParams(); // Run on initial load

    // --- LOGIN FORM VISIBILITY LOGIC (Unchanged) ---
    function updateDepartmentVisibility() { /* ... existing code ... */ }


    // --- EVENT LISTENERS ---
    roleSelect.addEventListener('change', updateDepartmentVisibility);
    departmentSelect.addEventListener('change', updateDepartmentVisibility);
    loginForm.addEventListener('submit', async (e) => { /* ... existing code ... */ });

    // MODIFIED: Signup form now sends a verification email
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const signupMessage = document.getElementById('signup-message');

        // NEW: Client-side email validation
        const emailRegex = /^[a-zA-Z]+\.\d+@tulas\.edu\.in$/;
        if (!emailRegex.test(data.email)) {
            signupMessage.className = 'text-red-500 text-center';
            signupMessage.textContent = 'Invalid email. Use format: name.userid@tulas.edu.in';
            return;
        }

        try {
            // NEW: Pointing to the new verification endpoint
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
            // NEW: Pointing to the new reset endpoint
            const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data) // Only sends userId
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
        newPasswordContainer.classList.add('hidden'); // Also hide the new container
        pageToShow.classList.remove('hidden');
    }

    // ... (show/hide links and other event listeners are unchanged) ...

    function showDashboard(user) { /* ... existing code ... */ }
    function populateNav(links) { /* ... existing code ... */ }
    function loadMainContent(target) { /* ... existing code ... */ }
    function setDefaultPage(links) { /* ... existing code ... */ }
    function populateStudentDashboard() { /* ... existing code ... */ }
    function populateFacultyDashboard() { /* ... existing code ... */ }

    // MODIFIED: Admin dashboard no longer shows requests
    function populateAdminDashboard() {
        const links = [ 
            { name: 'Announcements', target: 'admin-announce' }, 
            { name: 'Manage Users', target: 'admin-manage-users' }, 
            // { name: 'Sign-up Requests', target: 'admin-signup-requests' },  // REMOVED
            // { name: 'Password Requests', target: 'admin-password-requests' }, // REMOVED
            { name: 'ID Card Requests', target: 'admin-id-requests' }, 
            { name: 'Timetables', target: 'admin-timetables'}, 
        ];
        populateNav(links);
        setDefaultPage(links);
    }
    
    // MODIFIED: HOD dashboard no longer shows signup requests for their dept
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


    // --- CONTENT RENDERING FUNCTIONS ---
    // All rendering functions (showUserProfile, showStudentAnalytics, etc.) are unchanged.
    // The functions showAdminSignupRequests and showAdminPasswordRequests will
    // no longer be called but are left in the code as requested.
    // ... all existing rendering functions from here down ...
    
    // Initial call to set the correct dropdown visibility on page load
    updateDepartmentVisibility();
});