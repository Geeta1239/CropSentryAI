import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { createPrediction, findPredictionForUser, listPredictionsForUser } from "../models/predictionModel.js";
import { predict } from "../services/predictionService.js";

export async function create(req, res, next) {
    try {
        const result = await predict(req.file);
        let saved = null;

        if (req.user && result.disease.id) {
            await fs.mkdir(env.uploadDir, { recursive: true });
            const fileName = `${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
            await fs.writeFile(path.join(env.uploadDir, fileName), req.file.buffer, { flag: "wx" });
            saved = await createPrediction({
                userId: req.user.id,
                diseaseId: result.disease.id,
                imagePath: fileName,
                imageMimeType: req.file.mimetype,
                result
            });
        }

        res.status(201).json({
            prediction: {
                id: saved ? saved.id : crypto.randomUUID(),
                createdAt: saved ? saved.created_at : new Date().toISOString(),
                disease: result.disease,
                ...result
            },
            isGuest: !req.user,
            savedToHistory: Boolean(saved)
        });
    } catch (error) {
        next(error);
    }
}

export async function list(req, res, next) {
    try {
        res.json({ predictions: await listPredictionsForUser(req.user.id) });
    } catch (e) {
        next(e);
    }
}

export async function getOne(req, res, next) {
    try {
        const prediction = await findPredictionForUser(req.params.id, req.user.id, req.user.role === "admin");
        if (!prediction) return res.status(404).json({ error: "Prediction not found" });
        res.json({ prediction });
    } catch (e) {
        next(e);
    }
}
