import { Router } from "express";
import { getComparisonResults, getResultFile, listModels } from "../services/comparisonModelService.js";

const router = Router();

// Models the prediction page can offer (the deployed model plus the comparative-study models).
router.get("/", async (req, res, next) => {
    try {
        res.json({ models: await listModels() });
    } catch (error) {
        next(error);
    }
});

// Experimentally generated comparison table (backend/results/model_comparison.json).
router.get("/comparison", async (req, res, next) => {
    try {
        res.json({ comparison: await getComparisonResults() });
    } catch (error) {
        next(error);
    }
});

// Plots and confusion matrices, e.g. /api/models/results/plots/accuracy_comparison.png
router.get("/results/*", async (req, res, next) => {
    try {
        const file = await getResultFile(req.params[0]);
        if (!file) return res.status(404).json({ error: "Result file not found" });
        // The site is served from another origin (e.g. :8000), and helmet defaults to same-origin.
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        res.sendFile(file);
    } catch (error) {
        next(error);
    }
});

export default router;
