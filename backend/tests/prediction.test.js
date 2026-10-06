import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

jest.unstable_mockModule("../src/models/userModel.js", () => ({
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    createUser: jest.fn()
}));
jest.unstable_mockModule("../src/services/predictionService.js", () => ({
    getModelInfo: jest.fn(),
    predict: jest.fn()
}));

const { default: app } = await import("../src/app.js");
const { findUserById } = await import("../src/models/userModel.js");
const { getModelInfo, predict } = await import("../src/services/predictionService.js");
const token = jwt.sign(
    { role: "farmer" },
    env.jwtSecret,
    { subject: "00000000-0000-0000-0000-000000000001" }
);
const validPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=",
    "base64"
);

beforeEach(() => {
    jest.clearAllMocks();
    findUserById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        role: "farmer"
    });
    getModelInfo.mockResolvedValue({
        name: "MobileNetV2 TensorFlow Lite",
        input: { width: 224, height: 224, channels: 3 },
        classes: [],
        crops: ["Bell Pepper", "Potato", "Tomato"],
        evaluation: { accuracy: 0.86, weightedF1: 0.85, testImages: 3101 }
    });
    predict.mockResolvedValue({
        disease: {
            slug: "Tomato_healthy",
            name: "Tomato Healthy",
            crop: "Tomato",
            type: "Healthy leaf"
        },
        predictedClass: "Tomato_healthy",
        crop: "Tomato",
        type: "Healthy leaf",
        confidence: 91.2,
        topPredictions: [
            { label: "Tomato_healthy", name: "Tomato Healthy", confidence: 91.2 }
        ],
        provider: "mobilenetv2-tflite"
    });
});

test("prediction accepts a valid leaf image without authentication", async () => {
    const response = await request(app)
        .post("/api/predictions")
        .attach("image", validPng, { filename: "leaf.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.prediction.predictedClass).toBe("Tomato_healthy");
    expect(response.body.prediction.topPredictions).toHaveLength(1);
    expect(response.body.isGuest).toBe(true);
    expect(response.body.savedToHistory).toBe(false);
});

test("prediction rejects a missing image", async () => {
    expect((await request(app).post("/api/predictions")).status).toBe(400);
});

test("prediction rejects non-image uploads", async () => {
    const response = await request(app)
        .post("/api/predictions")
        .attach("image", Buffer.from("not image"), {
            filename: "bad.txt",
            contentType: "text/plain"
        });
    expect(response.status).toBe(400);
});

test("model metadata is publicly available", async () => {
    const response = await request(app).get("/api/model");
    expect(response.status).toBe(200);
    expect(response.body.model.crops).toEqual(["Bell Pepper", "Potato", "Tomato"]);
});

test("prediction accepts a valid leaf image for an authenticated farmer", async () => {
    const response = await request(app)
        .post("/api/predictions")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", validPng, { filename: "leaf.png", contentType: "image/png" });
    expect(response.status).toBe(201);
    expect(response.body.isGuest).toBe(false);
    expect(response.body.savedToHistory).toBe(false);
});
