import { query } from "../config/db.js";

export const findUserByEmail = async (email) => (await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()])).rows[0];
export const findUserById = async (id) => (await query("SELECT id, name, email, role, created_at FROM users WHERE id = $1", [id])).rows[0];
export const createUser = async ({ name, email, passwordHash, role }) => (await query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
    [name, email.toLowerCase(), passwordHash, role]
)).rows[0];
