import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Serves the comparative-study models next to the deployed MobileNetV2 model.
 * predictionService.js (the deployed 15-class TFLite model) is deliberately left untouched.
 */
const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(serviceDirectory, "../..");
const studyArtifactsDirectory = path.resolve(
    process.env.COMPARISON_ARTIFACT_DIR || path.join(backendDirectory, "artifacts", "comparison")
);
const resultsDirectory = path.resolve(
    process.env.COMPARISON_RESULTS_DIR || path.join(backendDirectory, "results")
);
const predictorPath = path.join(backendDirectory, "src", "ml", "predict_model.py");
const configuredPython = process.env.PYTHON_EXECUTABLE;

export const DEFAULT_MODEL_ID = "default";

// Ordered lightweight -> heavy, matching backend/comparison/models.
export const STUDY_MODELS = [
    { id: "mobilenetv2", name: "MobileNetV2" },
    { id: "efficientnet_b0", name: "EfficientNet-B0" },
    { id: "resnet50", name: "ResNet50" },
    { id: "mobilenetv3", name: "MobileNetV3-Large" }
];

const displayNameOverrides = {};

function readableName(label) {
    if (displayNameOverrides[label]) return displayNameOverrides[label];
    return label
        .replace(/___/g, " ")
        .replace(/__/g, " ")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, character => character.toUpperCase());
}

// PlantVillage-style labels start with the crop; otherwise use the study dataset's crop.
const studyCropName = process.env.COMPARISON_CROP_NAME || "Cotton";

function cropName(label) {
    const match = /^(pepper|potato|tomato)/i.exec(label);
    if (!match) return studyCropName;
    const crop = match[1].replace(/\b\w/g, character => character.toUpperCase());
    return crop === "Pepper" ? "Bell Pepper" : crop;
}

function classType(label) {
    return label.toLowerCase().split("_").includes("healthy") ? "Healthy leaf" : "Disease class";
}

function serviceError(message, status = 503) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function getPythonExecutable() {
    if (configuredPython) return configuredPython;
    const candidates = [
        path.join(backendDirectory, ".venv", "Scripts", "python.exe"),
        path.join(backendDirectory, ".venv", "bin", "python")
    ];
    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch { /* try the next interpreter */ }
    }
    return "python";
}

async function exists(file) {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}

async function readJson(file) {
    try {
        return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
        return null;
    }
}

export function findStudyModel(modelId) {
    return STUDY_MODELS.find(model => model.id === modelId) || null;
}

export async function listModels() {
    const comparison = await readJson(path.join(resultsDirectory, "model_comparison.json"));
    const rows = new Map((comparison?.models || []).map(row => [row.key, row]));
    const studyModels = await Promise.all(STUDY_MODELS.map(async model => {
        const directory = path.join(studyArtifactsDirectory, model.id);
        const available = await exists(path.join(directory, "model.keras"))
            && await exists(path.join(directory, "labels.txt"));
        const row = rows.get(model.id);
        return {
            ...model,
            available,
            metrics: row ? {
                accuracy: row.accuracy,
                macroF1: row.macro_f1,
                parameters: row.total_parameters,
                inferenceMs: row.avg_inference_ms_per_image
            } : null
        };
    }));
    return [
        {
            id: DEFAULT_MODEL_ID,
            name: "MobileNetV2 (deployed, 15 classes)",
            available: true,
            metrics: null
        },
        ...studyModels
    ];
}

export async function getComparisonResults() {
    const comparison = await readJson(path.join(resultsDirectory, "model_comparison.json"));
    if (!comparison || !Array.isArray(comparison.models) || comparison.models.length === 0) {
        throw serviceError(
            "No comparison results yet. Train the models first: python -m comparison.train --model all",
            404
        );
    }
    const plotsDirectory = path.join(resultsDirectory, "plots");
    let plots = [];
    try {
        plots = (await fs.readdir(plotsDirectory)).filter(file => file.endsWith(".png"));
    } catch { /* plots are optional */ }
    return { ...comparison, plots };
}

export async function getResultFile(relativePath) {
    // Serves only PNG/CSV/JSON files below results/ (plots, confusion matrices, tables).
    const resolved = path.resolve(resultsDirectory, relativePath);
    const inside = resolved.startsWith(resultsDirectory + path.sep);
    if (!inside || !/\.(png|csv|json)$/i.test(resolved) || !(await exists(resolved))) return null;
    return resolved;
}

export async function predictWithModel(file, modelId) {
    const model = findStudyModel(modelId);
    if (!model) {
        throw serviceError(`Unknown model '${modelId}'.`, 400);
    }
    if (!file?.buffer?.length) {
        throw new Error("No leaf image buffer provided for analysis.");
    }
    const directory = path.join(studyArtifactsDirectory, model.id);
    const modelPath = path.join(directory, "model.keras");
    const labelsPath = path.join(directory, "labels.txt");
    if (!(await exists(modelPath)) || !(await exists(labelsPath)) || !(await exists(predictorPath))) {
        throw serviceError(
            `${model.name} has not been trained yet. Run: python -m comparison.train --model ${model.id}`,
            409
        );
    }

    const pythonExecutable = await getPythonExecutable();
    const prediction = await new Promise((resolve, reject) => {
        const child = spawn(pythonExecutable, [predictorPath, modelPath, labelsPath], {
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error("Model inference exceeded the 120-second time limit."));
        }, 120000);
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });
        child.once("error", error => {
            clearTimeout(timeout);
            reject(error.code === "ENOENT"
                ? serviceError("Python was not found. Install the backend Python requirements or set PYTHON_EXECUTABLE.")
                : error);
        });
        child.once("close", code => {
            clearTimeout(timeout);
            const lines = stdout.trim().split(/\r?\n/);
            let result;
            try {
                result = JSON.parse(lines[lines.length - 1]);
            } catch {
                reject(new Error(`Model inference returned invalid output${stderr ? `: ${stderr.trim().slice(-300)}` : "."}`));
                return;
            }
            if (code !== 0 || result.error) {
                reject(serviceError(result.error || "Model inference failed.", code === 2 ? 422 : 503));
                return;
            }
            resolve(result);
        });
        child.stdin.on("error", error => {
            if (error.code !== "EPIPE") {
                clearTimeout(timeout);
                reject(error);
            }
        });
        child.stdin.end(file.buffer);
    });

    const className = readableName(prediction.predictedClass);
    const crop = cropName(prediction.predictedClass);
    const type = classType(prediction.predictedClass);
    return {
        disease: { slug: prediction.predictedClass, name: className, pathogen: null, crop, type },
        predictedClass: prediction.predictedClass,
        crop,
        type,
        confidence: prediction.confidence,
        topPredictions: prediction.topPredictions.map(item => ({
            label: item.className,
            name: readableName(item.className),
            confidence: item.confidence
        })),
        provider: `${model.id}-keras`,
        inferenceMs: prediction.inferenceMs,
        model: { id: model.id, name: model.name }
    };
}
