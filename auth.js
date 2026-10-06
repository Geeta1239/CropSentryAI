/**
 * CropSentry AI - ROUTE GUARD
 */
async function requireAuth(redirectUrl = "login.html", role) {
    if (!window.CropSentryApi || !CropSentryApi.getToken()) {
        sessionStorage.setItem("cropsentry_redirect_reason", "Please log in to access this page.");
        window.location.href = redirectUrl;
        return null;
    }
    try {
        const { user } = await CropSentryApi.me();
        if (role && user.role !== role) {
            window.location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
            return null;
        }
        return user;
    } catch {
        CropSentryApi.clearToken();
        sessionStorage.setItem("cropsentry_redirect_reason", "Your session has expired. Please log in again.");
        window.location.href = redirectUrl;
        return null;
    }
}
