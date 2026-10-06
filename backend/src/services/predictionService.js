import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(serviceDirectory, "../..");
const artifactsDirectory = path.resolve(
    process.env.MODEL_ARTIFACT_DIR || path.join(backendDirectory, "artifacts", "crop-disease")
);
const predictorPath = path.join(backendDirectory, "src", "ml", "predict.py");
const modelPath = path.join(artifactsDirectory, "model.tflite");
const labelsPath = path.join(artifactsDirectory, "labels.txt");
const metricsPath = path.join(artifactsDirectory, "test_metrics.json");
const classReportPath = path.join(artifactsDirectory, "classification_report.json");
const configuredPython = process.env.PYTHON_EXECUTABLE;
const virtualEnvironmentPython = path.join(
    backendDirectory,
    ".venv",
    "Scripts",
    "python.exe"
);
const displayNameOverrides = {
    Pepper__bell___Bacterial_spot: "Bell Pepper Bacterial Spot",
    Pepper__bell___healthy: "Bell Pepper Healthy",
    Tomato_Spider_mites_Two_spotted_spider_mite: "Tomato Spider Mites (Two-Spotted Spider Mite)",
    Tomato__Tomato_YellowLeaf__Curl_Virus: "Tomato Yellow Leaf Curl Virus",
    Tomato__Tomato_mosaic_virus: "Tomato Mosaic Virus"
};

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

function cropName(label) {
    const crop = label.split("_", 1)[0].replace(/\b\w/g, character => character.toUpperCase());
    return crop === "Pepper" ? "Bell Pepper" : crop;
}

function classType(label) {
    return label.toLowerCase().split("_").includes("healthy") ? "Healthy leaf" : "Disease class";
}

function modelServiceError(message, status = 503) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function getPythonExecutable() {
    if (configuredPython) return configuredPython;
    return fs.access(virtualEnvironmentPython).then(() => virtualEnvironmentPython, () => "python");
}

async function readLabels() {
    const contents = await fs.readFile(labelsPath, "utf8");
    const labels = contents.split(/\r?\n/).map(label => label.trim()).filter(Boolean);
    if (labels.length === 0) throw new Error(`Model labels file is empty: ${labelsPath}`);
    return labels;
}

export async function getModelInfo() {
    const [labels, metricsContents, classReportContents] = await Promise.all([
        readLabels(),
        fs.readFile(metricsPath, "utf8"),
        fs.readFile(classReportPath, "utf8")
    ]);
    let metrics;
    let classReport;
    try {
        metrics = JSON.parse(metricsContents);
        classReport = JSON.parse(classReportContents);
    } catch (error) {
        throw new Error(`Model evaluation reports are not valid JSON: ${error.message}`);
    }
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
        throw new Error("Model evaluation report must contain a JSON object.");
    }
    if (!classReport || typeof classReport !== "object" || Array.isArray(classReport)) {
        throw new Error("Per-class evaluation report must contain a JSON object.");
    }
    if (metrics.num_classes !== labels.length) {
        throw new Error("Model evaluation report class count does not match its labels file.");
    }

    return {
        name: "MobileNetV2 TensorFlow Lite",
        input: { width: 224, height: 224, channels: 3 },
        lowConfidenceThreshold: 50,
        classes: labels.map(label => ({
            label,
            name: readableName(label),
            crop: cropName(label),
            type: classType(label),
            recall: typeof classReport[label]?.recall === "number"
                ? classReport[label].recall
                : null
        })),
        crops: [...new Set(labels.map(cropName))].sort(),
        evaluation: {
            accuracy: metrics.test_accuracy,
            weightedF1: metrics.weighted_f1,
            testImages: metrics.num_test_samples
        }
    };
}

export async function predict(file) {
    if (!file?.buffer?.length) {
        throw new Error("No leaf image buffer provided for analysis.");
    }
    try {
        await Promise.all([fs.access(modelPath), fs.access(labelsPath), fs.access(predictorPath)]);
    } catch {
        throw modelServiceError(
            `The trained model is not installed completely. Check ${artifactsDirectory} and backend/src/ml/predict.py.`
        );
    }

    const pythonExecutable = await getPythonExecutable();
    const prediction = await new Promise((resolve, reject) => {
        const child = spawn(
            pythonExecutable,
            [predictorPath, modelPath, labelsPath],
            { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
        );
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error("Model inference exceeded the 45-second time limit."));
        }, 45000);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });
        child.once("error", error => {
            clearTimeout(timeout);
            if (error.code === "ENOENT") {
                reject(modelServiceError(
                    "Python was not found. Install the backend Python requirements or set PYTHON_EXECUTABLE."
                ));
            } else {
                reject(error);
            }
        });
        child.once("close", code => {
            clearTimeout(timeout);
            let result;
            try {
                result = JSON.parse(stdout);
            } catch {
                reject(new Error(
                    `Model inference returned invalid output${stderr ? `: ${stderr.trim()}` : "."}`
                ));
                return;
            }
            if (code !== 0 || result.error) {
                reject(modelServiceError(
                    result.error || `Model inference failed${stderr ? `: ${stderr.trim()}` : "."}`,
                    code === 2 ? 422 : 503
                ));
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

    const labels = await readLabels();
    if (!labels.includes(prediction.predictedClass) ||
        !Array.isArray(prediction.topPredictions) ||
        prediction.topPredictions.some(item => !labels.includes(item.className))) {
        throw new Error("Model returned a class that is missing from the configured label file.");
    }

    const className = readableName(prediction.predictedClass);
    const crop = cropName(prediction.predictedClass);
    const type = classType(prediction.predictedClass);
    return {
        disease: {
            slug: prediction.predictedClass,
            name: className,
            pathogen: null,
            crop,
            type
        },
        predictedClass: prediction.predictedClass,
        crop,
        type,
        confidence: prediction.confidence,
        topPredictions: prediction.topPredictions.map(item => ({
            label: item.className,
            name: readableName(item.className),
            confidence: item.confidence
        })),
        provider: "mobilenetv2-tflite"
    };
}
