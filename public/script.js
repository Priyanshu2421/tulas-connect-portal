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
    // START: ADDED ELEMENTS
    const engineeringDeptSelectContainer = document.getElementById('engineering-dept-select-container');
    const engineeringDeptSelect = document.getElementById('engineering-dept');
    // END: ADDED ELEMENTS
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

    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');


    // --- EVENT LISTENERS ---

    // START: MODIFIED EVENT LISTENER
    roleSelect.addEventListener('change', (e) => {
        const isDeptLogin = e.target.value === 'Department Login';
        departmentSelectContainer.classList.toggle('hidden', !isDeptLogin);
        // Ensure the engineering dropdown is also hidden when role is not Department Login
        if (!isDeptLogin) {
            engineeringDeptSelectContainer.classList.add('hidden');
        } else {
            // Trigger change on department dropdown to show engineering dropdown if needed
            departmentSelect.dispatchEvent(new Event('change'));
        }

        const isAdminSelected = e.target.value === 'Admin';
        forgotPasswordLinkWrapper.classList.toggle('hidden', isAdminSelected);
        signupLinkWrapper.classList.toggle('hidden', isAdminSelected);
    });
    // END: MODIFIED EVENT LISTENER

    // START: NEW EVENT LISTENER
    departmentSelect.addEventListener('change', (e) => {
        const isEngineering = e.target.value === 'Department of Engineering';
        engineeringDeptSelectContainer.classList.toggle('hidden', !isEngineering);
    });
    // END: NEW EVENT LISTENER

    // START: MODIFIED EVENT LISTENER
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = userIdInput.value.trim();
        const password = passwordInput.value.trim();
        const selectedRole = roleSelect.value;
        const errorMessage = document.getElementById('error-message');
        
        // Logic to determine the correct department value
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
    // END: MODIFIED EVENT LISTENER

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
            if (response.ok) {
                signupForm.reset();
                // Also reset and hide the dynamic dropdowns
                document.getElementById('signup-department-container').classList.add('hidden');
                document.getElementById('signup-course-container').classList.add('hidden');
            }
        } catch (error) {
            signupMessage.className = 'text-red-500 text-center';
            signupMessage.textContent = 'Could not connect to the server.';
        }
    });

    // ... (rest of your JavaScript is unchanged) ...
});