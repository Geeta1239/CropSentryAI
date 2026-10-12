import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { createPrediction, findPredictionForUser, listPredictionsForUser } from "../models/predictionModel.js";
import { predict } from "../services/predictionService.js";
import { DEFAULT_MODEL_ID, predictWithModel } from "../services/comparisonModelService.js";

export async function create(req, res, next) {
    try {
        // Optional "model" form field selects a comparative-study model; without it the
        // deployed MobileNetV2 runs exactly as before.
        const modelId = typeof req.body?.model === "string" ? req.body.model.trim() : "";
        const result = modelId && modelId !== DEFAULT_MODEL_ID
            ? await predictWithModel(req.file, modelId)
            : await predict(req.file);
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
                ...result,
                model: result.model || { id: DEFAULT_MODEL_ID, name: "MobileNetV2 (deployed, 15 classes)" }
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
