/* Shared API boundary for the static CropSentry site. Configure before deployment if the API has another origin. */
window.CropSentryApi = (() => {
    const baseUrl = window.CROPSENTRY_API_URL || "http://localhost:3000/api";
    const tokenKey = "cropsentry_access_token";
    const getToken = () => localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
    const setToken = (token) => {
        localStorage.setItem(tokenKey, token);
        sessionStorage.setItem(tokenKey, token);
    };
    const clearToken = () => {
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(tokenKey);
    };

    async function request(path, options = {}) {
        const headers = new Headers(options.headers || {});
        const token = getToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        if (options.body && !(options.body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }

        let response;
        try {
            response = await fetch(`${baseUrl}${path}`, { ...options, headers });
        } catch (netErr) {
            throw new Error(`Unable to connect to CropSentry backend API at ${baseUrl}. Make sure the backend server is running.`);
        }

        if (response.status === 204) return null;
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || "The request could not be completed");
        }
        return payload;
    }

    return {
        getToken,
        clearToken,
        baseUrl,
        async login(email, password) {
            const data = await request("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            setToken(data.token);
            return data.user;
        },
        async register(name, email, password) {
            const data = await request("/auth/register", {
                method: "POST",
                body: JSON.stringify({ name, email, password })
            });
            setToken(data.token);
            return data.user;
        },
        me: () => request("/auth/me"),
        modelInfo: () => request("/model"),
        logout: async () => {
            try {
                await request("/auth/logout", { method: "POST" });
            } finally {
                clearToken();
            }
        },
        predict: (image) => {
            const form = new FormData();
            form.append("image", image);
            return request("/predictions", { method: "POST", body: form });
        },
        predictions: () => request("/predictions"),
        adminMetrics: () => request("/admin/metrics"),
        adminPredictions: () => request("/admin/predictions")
    };
})();
