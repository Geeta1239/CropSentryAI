import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "sqlite://cropsentry.db";
}
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "cropsentry-secret-key-at-least-32-characters-2026";
}

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || "test-secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8000",
    uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads"),
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 10485760)
};
