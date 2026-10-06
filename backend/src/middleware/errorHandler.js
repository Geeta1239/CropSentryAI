import multer from "multer";
export function notFound(req, res) { res.status(404).json({ error: "Route not found" }); }
export function errorHandler(err, req, res, next) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Image exceeds the configured size limit" });
    if (err instanceof multer.MulterError || err.message === "Only JPG, PNG, and WEBP image files are allowed") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Internal server error" });
}
