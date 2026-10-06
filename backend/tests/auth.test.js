import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";
jest.unstable_mockModule("../src/models/userModel.js", () => ({ findUserByEmail: jest.fn(), createUser: jest.fn(), findUserById: jest.fn() }));
const { default: app } = await import("../src/app.js");
const { findUserByEmail, findUserById } = await import("../src/models/userModel.js");
describe("authentication", () => {
    beforeEach(() => jest.clearAllMocks());
    test("rejects invalid registration", async () => { expect((await request(app).post("/api/auth/register").send({ name: "A", email: "bad", password: "short" })).status).toBe(422); });
    test("rejects invalid credentials", async () => { findUserByEmail.mockResolvedValue(undefined); expect((await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "password123" })).status).toBe(401); });
    test("requires token for profile", async () => { expect((await request(app).get("/api/auth/me")).status).toBe(401); });
    test("rejects farmer access to admin", async () => { const token = jwt.sign({ role: "farmer" }, env.jwtSecret, { subject: "00000000-0000-0000-0000-000000000001" }); findUserById.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001", role: "farmer" }); expect((await request(app).get("/api/admin/metrics").set("Authorization", `Bearer ${token}`)).status).toBe(403); });
});
