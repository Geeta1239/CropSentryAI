import multer from "multer";
import { env } from "../config/env.js";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxFileSize, files: 1 },
    fileFilter: (req, file, cb) =>
        allowed.has(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Only JPG, PNG, and WEBP image files are allowed"))
}).single("image");

export function verifyImageMagicBytes(req, res, next) {
    if (!req.file) return res.status(400).json({ error: "An image file is required" });
    const b = req.file.buffer;
    const jpeg = b[0] === 0xff && b[1] === 0xd8;
    const png = b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
    if (!jpeg && !png && !webp) return res.status(400).json({ error: "File content is not a supported image" });
    next();
}
