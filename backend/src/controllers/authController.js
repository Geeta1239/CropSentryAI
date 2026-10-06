import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { env } from "../config/env.js";
import { createUser, findUserByEmail } from "../models/userModel.js";

const tokenFor = (user) => jwt.sign({ role: user.role }, env.jwtSecret, { subject: String(user.id), expiresIn: env.jwtExpiresIn });
const invalid = (req, res) => { const errors = validationResult(req); return errors.isEmpty() ? null : res.status(422).json({ error: "Validation failed", details: errors.array() }); };
export async function register(req, res, next) {
    try {
        if (invalid(req, res)) return;
        const { name, email, password } = req.body;
        if (await findUserByEmail(email)) return res.status(409).json({ error: "Email is already registered" });
        const user = await createUser({ name, email, passwordHash: await bcrypt.hash(password, 12), role: "farmer" });
        res.status(201).json({ user, token: tokenFor(user) });
    } catch (error) { next(error); }
}
export async function login(req, res, next) {
    try {
        if (invalid(req, res)) return;
        const user = await findUserByEmail(req.body.email);
        if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ error: "Invalid email or password" });
        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user) });
    } catch (error) { next(error); }
}
export const me = (req, res) => res.json({ user: req.user });
export const logout = (req, res) => res.status(204).end(); // JWT is stateless; client discards token.
