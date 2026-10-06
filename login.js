/**
 * CropSentry AI - AUTHENTICATION & SESSION MANAGEMENT
 * Supports Farmer & Admin/Agronomist roles with demo login shortcuts and registration
 */

let selectedRole = "farmer";
let authMode = "login"; // "login" | "register"

document.addEventListener("DOMContentLoaded", () => {
    initAuthTabs();
    const reason = sessionStorage.getItem("cropsentry_redirect_reason");
    if (reason) {
        sessionStorage.removeItem("cropsentry_redirect_reason");
        setTimeout(() => {
            if (typeof showToast === "function") showToast(reason, "info");
        }, 250);
    }
});

function initAuthTabs() {
    const roleTabs = document.querySelectorAll("#roleSelectorWrap .role-tab");
    roleTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            roleTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            selectedRole = tab.getAttribute("data-role");
        });
    });
}

window.setAuthMode = function(mode) {
    authMode = mode;
    const tabSignIn = document.getElementById("tabSignIn");
    const tabRegister = document.getElementById("tabRegister");
    const nameGroup = document.getElementById("nameGroup");
    const submitBtn = document.getElementById("submitBtn");
    const heading = document.getElementById("authHeading");
    const subheading = document.getElementById("authSubheading");
    const demoBox = document.getElementById("demoBox");
    const roleSelector = document.getElementById("roleSelectorWrap");

    if (mode === "register") {
        tabSignIn?.classList.remove("active");
        tabRegister?.classList.add("active");
        if (nameGroup) nameGroup.style.display = "block";
        if (roleSelector) roleSelector.style.display = "none";
        if (demoBox) demoBox.style.display = "none";
        if (heading) heading.textContent = "Join CropSentry";
        if (subheading) subheading.textContent = "Register a new farmer account to monitor crop health.";
        if (submitBtn) submitBtn.textContent = "Create Farmer Account";
    } else {
        tabRegister?.classList.remove("active");
        tabSignIn?.classList.add("active");
        if (nameGroup) nameGroup.style.display = "none";
        if (roleSelector) roleSelector.style.display = "flex";
        if (demoBox) demoBox.style.display = "block";
        if (heading) heading.textContent = "Welcome to CropSentry";
        if (subheading) subheading.textContent = "Access your crop diagnostics and surveillance dashboard.";
        if (submitBtn) submitBtn.textContent = "Log In to Dashboard";
    }
};

window.handleAuthSubmit = async function(event) {
    if (event) event.preventDefault();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const fullNameInput = document.getElementById("fullName");
    const email = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    const name = fullNameInput ? fullNameInput.value.trim() : "";

    if (!email || !password) {
        showToast("Please enter both email and password.", "warning");
        return;
    }

    if (password.length < 8) {
        showToast("Password must be at least 8 characters long.", "warning");
        return;
    }

    const submitBtn = document.getElementById("submitBtn");
    const originalText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = authMode === "register" ? "Creating Account..." : "Signing In...";
    }

    try {
        if (authMode === "register") {
            if (!name) {
                showToast("Please enter your full name.", "warning");
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
                return;
            }
            const user = await CropSentryApi.register(name, email, password);
            showToast(`Account created! Welcome, ${user.name}!`, "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 600);
        } else {
            const user = await CropSentryApi.login(email, password);
            if (user.role !== selectedRole) {
                await CropSentryApi.logout();
                throw new Error(`This account has the '${user.role}' role. Please select the matching portal tab above.`);
            }
            showToast(`Welcome back, ${user.name}! Redirecting...`, "success");
            setTimeout(() => {
                window.location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
            }, 600);
        }
    } catch (error) {
        showToast(error.message, "error");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
};

// Backward-compatibility alias
window.handleLogin = window.handleAuthSubmit;

window.fillDemoFarmer = function() {
    setAuthMode("login");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    if (usernameInput) usernameInput.value = "farmer@example.com";
    if (passwordInput) passwordInput.value = "farmer123";

    const farmerTab = document.querySelector('#roleSelectorWrap [data-role="farmer"]');
    if (farmerTab) farmerTab.click();
    showToast("Filled demo farmer credentials. Click 'Log In' to enter.", "info");
};

window.fillDemoAdmin = function() {
    setAuthMode("login");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    if (usernameInput) usernameInput.value = "admin@example.com";
    if (passwordInput) passwordInput.value = "agri_admin2026";

    const adminTab = document.querySelector('#roleSelectorWrap [data-role="admin"]');
    if (adminTab) adminTab.click();
    showToast("Filled demo admin credentials. Click 'Log In' to enter.", "info");
};
