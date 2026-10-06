import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { findUserById } from "../models/userModel.js";

export async function authenticate(req, res, next) {
    try {
        const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
        if (!token) return res.status(401).json({ error: "Authentication required" });
        const payload = jwt.verify(token, env.jwtSecret);
        const user = await findUserById(payload.sub);
        if (!user) return res.status(401).json({ error: "Account no longer exists" });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired access token" });
    }
}

export async function optionalAuthenticate(req, res, next) {
    try {
        const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
        if (token) {
            const payload = jwt.verify(token, env.jwtSecret);
            req.user = await findUserById(payload.sub);
        }
    } catch {}
    next();
}

export const authorize = (...roles) => (req, res, next) => roles.includes(req.user?.role)
    ? next() : res.status(403).json({ error: "Insufficient permissions" });
