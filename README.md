# CropSentry AI

CropSentry AI is a browser-based crop leaf classifier for bell pepper, potato, and tomato. A user uploads a leaf photo, the local API passes it to a TensorFlow Lite model, and the interface displays the top three predicted classes and their scores.

The project combines a static, responsive website with a Node.js API and local Python model inference. It does not require a frontend build step or a hosted AI service.

> **Model note:** CropSentry is a decision-support prototype, not a substitute for expert diagnosis. The classifier is limited to the 15 classes listed below and can be wrong, especially on unfamiliar crops, poor-quality images, or field conditions that differ from its training data.

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Run locally on Windows](#run-locally-on-windows)
- [Configuration](#configuration)
- [Prediction model](#prediction-model)
- [API overview](#api-overview)
- [Tests and code quality](#tests-and-code-quality)
- [Dataset and training scripts](#dataset-and-training-scripts)
- [Comparative Study](#comparative-study)
- [Docker note](#docker-note)
- [Security and responsible use](#security-and-responsible-use)

## Features

- **Leaf image classification:** Upload JPG, PNG, or WEBP leaf images and see up to three class predictions.
- **Supported crops:** Bell pepper, potato, and tomato.
- **Responsive website:** Home, prediction, dashboard, disease information, login, admin, about, and contact pages.
- **Accounts and roles:** Farmer registration/login and JWT-protected account and admin API routes.
- **Model details:** The API provides supported classes and held-out evaluation results to the website.
- **Localization and appearance:** English, Hindi, and Marathi language options, plus a dark/light theme.
- **Optional map and visualizations:** Leaflet/OpenStreetMap, Chart.js, and Three.js are loaded from CDNs on pages that use them.

## How it works

```text
Browser (static HTML/CSS/JavaScript)
        |
        | HTTP requests to http://localhost:3000/api
        v
Express API
  |-- validates requests and image uploads
  |-- handles optional JWT authentication
  |-- starts the local Python inference process
  |       |-- decodes and resizes the image to 224 x 224
  |       |-- runs the TensorFlow Lite model
  |       '-- returns the top class scores
  |-- serves model metadata and disease/admin endpoints
  '-- stores account/catalog data in SQLite or PostgreSQL
```

For a prediction, the frontend sends the selected file as multipart form data to `POST /api/predictions`. The API accepts one JPG, PNG, or WEBP image (10 MiB maximum by default), checks its file signature, and sends its bytes to `backend/src/ml/predict.py`. The Python script preprocesses the image for MobileNetV2 and runs `backend/artifacts/crop-disease/model.tflite`. The API returns the top three class names and scores.

Prediction works without signing in. The current 15-class model output is not mapped to the database disease catalog, so these predictions are **not saved to account history**. The prediction-history endpoints are available for records supported by the data layer, but the current model prediction response reports `savedToHistory: false`.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, browser-native JavaScript (ES modules are not required) |
| Backend | Node.js, Express |
| Authentication | JWT, bcrypt |
| Data storage | Embedded SQLite by default; PostgreSQL can be configured |
| Image inference | Python, TensorFlow Lite, TensorFlow 2.15.1, Pillow, NumPy |
| Validation and security middleware | express-validator, Multer, Helmet, express-rate-limit |
| Optional page libraries | Three.js, Leaflet with OpenStreetMap tiles, Chart.js |
| Tests and linting | Jest, Supertest, ESLint |
| Optional container orchestration | Docker Compose |

There is no root-level package installation or frontend compilation step. The `frontend/` directory is the single canonical frontend for this project. Use `frontend/predict.html`, `frontend/assets/js/api.js`, `frontend/assets/js/main.js`, `frontend/assets/js/model-comparison.js`, and `frontend/assets/js/side-by-side-comparison.js`. The old root-level duplicate frontend files have been removed. External page libraries are loaded from CDNs and therefore need network access in the browser.

## Project structure

```text
.
|-- frontend/                                     # Canonical static website
|   |-- index.html, predict.html, dashboard.html, ...
|   |-- assets/css/                               # Shared and page-specific styles
|   |-- assets/js/                                # UI, API, auth, comparison scripts
|   `-- assets/imgs/                               # Site imagery
`-- backend/
    |-- src/
    |   |-- app.js, server.js                      # Express app and server
    |   |-- routes/, controllers/, models/         # API layers
    |   |-- middleware/                            # Auth, uploads, errors
    |   |-- config/                                # Environment and database
    |   |-- ml/predict.py                          # TensorFlow Lite runner
    |   `-- scripts/                               # Migrations and ML utilities
    |-- artifacts/crop-disease/                    # Active model, labels, reports
    |-- tests/                                     # API and model metadata tests
    |-- package.json
    `-- requirements.txt
```

## Requirements

- Windows 10/11 with PowerShell
- Node.js 22 or newer and npm (the backend uses Node's built-in `node:sqlite` API)
- Python 3.11 (required for the pinned TensorFlow 2.15.1 dependency; Python 3.10 also works)
- A modern browser
- Git is optional if you already have the project files

Check the installed runtimes:

```powershell
node --version
npm --version
py -3.11 --version
```

## Run locally on Windows

Run the static website and API in **two separate PowerShell terminals**.

### 1. Start the website

In Terminal 1, serve the `frontend/` directory (do not open the HTML files directly):

```powershell
cd "C:\VS Code\project\frontend"
py -3.11 -m http.server 8000
```

### 2. Install and start the API

In Terminal 2:

```powershell
cd "C:\VS Code\project\backend"
npm ci
Copy-Item .env.example .env
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Open `backend\.env` in a text editor before startup. For a local SQLite run, leave `DATABASE_URL` blank. Replace the example `JWT_SECRET` with a unique random value of at least 32 characters; keep `.env` private and out of source control.

Start the API:

```powershell
npm run dev
```

Open the website at **http://localhost:8000**. The prediction page is **http://localhost:8000/predict.html**. The API listens at **http://localhost:3000** by default; test its health endpoint at **http://localhost:3000/health**.

The API automatically creates its local SQLite schema and seeds the disease catalog and development accounts when SQLite is used. Do not use seeded development accounts or the default development secret in a public deployment.

### Useful development commands

Run these from `C:\VS Code\project\backend`:

```powershell
npm run dev      # Start API with automatic restart
npm start        # Start API without nodemon
npm test         # Run backend tests
npm run lint     # Lint backend source and tests
npm run migrate  # Apply SQL migrations to the configured database
```

If using another Python installation, set `PYTHON_EXECUTABLE` in `backend\.env` to the full path of its executable. The model artifacts must remain available under `backend\artifacts\crop-disease`, unless `MODEL_ARTIFACT_DIR` is set to a different directory.

## Configuration

Backend settings are loaded from `backend/.env`. See [`backend/.env.example`](backend/.env.example) for the available variables.

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `3000` |
| `DATABASE_URL` | PostgreSQL connection URL. Leave blank to use embedded SQLite locally. |
| `JWT_SECRET` | Secret used to sign access tokens; set a unique secret before running outside local development. |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `8h` |
| `CORS_ORIGIN` | Intended frontend origin setting; review the API CORS middleware before exposing the service publicly. |
| `UPLOAD_DIR` | Directory for saved uploaded files; defaults to `uploads` |
| `MAX_FILE_SIZE` | Maximum upload size in bytes; defaults to `10485760` (10 MiB) |
| `PYTHON_EXECUTABLE` | Optional explicit Python executable for model inference |
| `MODEL_ARTIFACT_DIR` | Optional directory containing model, labels, and evaluation reports |

To use PostgreSQL instead of SQLite, start a PostgreSQL instance, set `DATABASE_URL` to its connection URL, and run the SQL migrations before starting the API:

```powershell
npm run migrate
npm run dev
```

The configured PostgreSQL database must be reachable when the API starts. The backend falls back to SQLite if its PostgreSQL connection attempt fails, so check the startup log to confirm which database it selected.

The browser API helper defaults to `http://localhost:3000/api`. For another API host, set `window.CROPSENTRY_API_URL` before loading `api.js` in the page.

## Prediction model

The active classifier is **MobileNetV2 in TensorFlow Lite format**. It expects a 224 x 224 RGB image and returns a score for each of 15 classes:

- Bell pepper: bacterial spot, healthy
- Potato: early blight, late blight, healthy
- Tomato: bacterial spot, early blight, late blight, leaf mold, septoria leaf spot, spider mites, target spot, yellow leaf curl virus, mosaic virus, healthy

The model, ordered labels, and evaluation reports are stored in `backend/artifacts/crop-disease/`. `GET /api/model` exposes the crop/class list and the committed evaluation metrics. On the held-out test set of 3,101 images, the report records **86.3% accuracy** and **85.9% weighted F1**. Performance varies by class: the report records **39.3% recall for Tomato Early Blight**, so treat that class's predictions with particular caution. Scores are model outputs, not calibrated probabilities or a guarantee of diagnosis.

## API overview

All routes below are relative to `http://localhost:3000`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Health check |
| `GET` | `/api/model` | Public | Model classes and evaluation metadata |
| `POST` | `/api/predictions` | Public; optional bearer token | Classify an uploaded `image` |
| `GET` | `/api/predictions` | Authenticated | List the signed-in user's saved predictions |
| `GET` | `/api/predictions/:id` | Authenticated | Read a prediction record |
| `POST` | `/api/auth/register` | Public | Register a farmer account |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT |
| `GET` | `/api/auth/me` | Authenticated | Read the current account |
| `POST` | `/api/auth/logout` | Authenticated | Client-side JWT logout response |
| `GET` | `/api/diseases` | Public | List catalog disease entries |
| `GET` | `/api/diseases/:slug` | Public | Read a catalog disease entry |
| `GET` | `/api/admin/users` | Admin | List user accounts |
| `GET` | `/api/admin/predictions` | Admin | List prediction records |
| `GET` | `/api/admin/metrics` | Admin | Read dashboard metrics |

The API uses bearer tokens in the `Authorization` header for protected routes. New registrations receive the farmer role; admin endpoints require an account that already has the admin role.

## Tests and code quality

From the backend directory:

```powershell
npm test
npm run lint
```

The Jest/Supertest suite covers authentication, prediction endpoint behavior, upload validation, and model metadata. The model metadata test reads the checked-in labels and evaluation reports; endpoint prediction tests mock model inference.

For a manual end-to-end check, keep both servers running, open `frontend/predict.html`, and submit a JPG, PNG, or WEBP photo of a supported crop leaf. Confirm the browser console and API terminal do not report new errors.

You can also check the API and submit an image from a third PowerShell terminal:

```powershell
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/api/model
curl.exe -X POST http://localhost:3000/api/predictions -F "image=@C:\path\to\leaf.jpg"
```

Replace `C:\path\to\leaf.jpg` with the path to an image on your computer.

## Dataset and training scripts

The backend contains optional dataset-preparation and model-training scripts under `backend/src/scripts/`. Dataset preparation expects source archives under `backend/data/`; those archives are not required to run the pre-trained classifier.

```powershell
cd "C:\VS Code\project\backend"
.\.venv\Scripts\python.exe src/scripts/prepare_dataset.py
.\.venv\Scripts\python.exe src/scripts/train_model.py
```

The training utility is a separate workflow from the deployed 15-class TensorFlow Lite artifact. Running it does not automatically replace or convert `artifacts/crop-disease/model.tflite`; the active inference artifacts and their matching labels must be deployed together.

## Comparative Study

This section extends CropSentry with a **comparative study of four deep-learning models**. It is purely additive: the deployed MobileNetV2 TensorFlow Lite model, `backend/src/ml/predict.py`, `backend/src/scripts/train_model.py` and `POST /api/predictions` (without a `model` field) behave exactly as before.

### Models used

Ordered from lightweight to heavy. All four use ImageNet-pretrained backbones through `tf.keras.applications`.

| # | Model | Architecture type | Approx. backbone size* | Why it was selected | Expected advantages / disadvantages |
| --- | --- | --- | --- | --- | --- |
| 1 | **MobileNetV2** | Depthwise-separable convolutions, inverted residuals, linear bottlenecks | ~2.3 M parameters | The project's existing baseline | Fastest and smallest, so it suits mobile and edge use; usually the lowest capacity |
| 2 | **EfficientNet-B0** | MBConv blocks with squeeze-and-excitation, compound-scaled | ~4.0 M parameters | Modern efficient network, still lightweight | Often better accuracy per parameter than MobileNetV2; slower on CPU because of the extra operations |
| 3 | **ResNet50** | 50-layer residual network with bottleneck blocks | ~23.6 M parameters | Classic, widely cited medium/heavy baseline | Robust features and a standard reference; large and slow with no accuracy-per-parameter advantage |
| 4 | **MobileNetV3-Large** | Modern lightweight MobileNet backbone | ~3.25 M backbone parameters | Updated mobile architecture | Compact model with Keras-native preprocessing and a strong efficiency/accuracy trade-off |

\* Backbone only (no ImageNet classifier). The exact counts for the full classifiers (backbone + the shared head) are measured and written to `backend/results/model_comparison.csv`.

### Dataset

The comparative study is configured for the downloaded PlantVillage 15-class dataset in `backend/data/images_15/{train,validation,test}/<class>/` (fixed seed 42, leaf-group-aware 70/15/15 split: 15,950 / 3,422 / 3,415 images). The downloaded archive and prepared images are intentionally Git-ignored. To download and prepare the dataset on a new machine, run `tools/download_plantvillage_15.py` and `tools/prepare_plantvillage_15_split.py` from the repository root. The class list is read from the folder names, never hard-coded. To run the study on another dataset with the same layout, use `--data-dir`.

> The deployed MobileNetV2 in `backend/artifacts/crop-disease/` remains available for production inference. The four comparative models, including a separately trained MobileNetV2 baseline, use the same PlantVillage 15-class split so their results are directly comparable.

### Experimental setup

All settings live in `backend/comparison/study_config.json` and are identical for every model (override a value for a run with flags such as `--epochs`):

| Setting | Value |
| --- | --- |
| Random seed | 42 |
| Input size | 224 x 224 (all models) |
| Batch size | 32 |
| Max epochs | 30, early stopping on validation accuracy (patience 5, best weights kept) |
| Optimizer / learning rate | Adam, 0.001 |
| Loss | Categorical cross-entropy |
| Transfer learning | ImageNet weights, **frozen backbone**, same as the existing `train_model.py` |
| Classifier head | GlobalAveragePooling -> Dropout 0.2 -> Dense 256 (ReLU) -> Dropout 0.2 -> Dense softmax |
| Augmentation | Random horizontal flip, rotation 0.08, zoom 0.1 (training only) |
| Class imbalance | Balanced class weights computed from the training split |

Each model applies the preprocessing its ImageNet weights expect inside the model: MobileNetV2 scales to [-1, 1] (same as `predict.py`), ResNet50 uses BGR mean-centring, and Keras EfficientNet/MobileNetV3 backbones normalise internally. The data pipeline is shared.

### Metrics

For every model, on the same held-out test set: accuracy; macro precision, recall and F1 (plus weighted F1); per-class precision/recall/F1/support; confusion matrix; total, trainable and non-trainable parameters; saved model size (MB); training time; average, median and 95th-percentile inference time per image (batch size 1); throughput (images/s); and the input size, batch size, epochs, optimizer, learning rate, loss and device used.

### Training and evaluation procedure

`python -m comparison.train` loads the shared dataset, builds the model through the factory (`comparison/models/__init__.py: get_model`), trains it, keeps the best-validation-accuracy checkpoint, evaluates that checkpoint on the test set, measures inference speed, and then refreshes the comparison table and graphs. `python -m comparison.evaluate` re-evaluates saved models without retraining. Nothing is hard-coded: if a model has not been trained, it does not appear in the results.

### Commands

Run from the `backend` directory (the Python environment from [Run locally on Windows](#run-locally-on-windows)). `matplotlib` is only needed for the graphs.

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-comparison.txt

# Train each model (any order; each run updates the comparison)
.\.venv\Scripts\python.exe -m comparison.train --model mobilenetv2 --data-dir data/images_15
.\.venv\Scripts\python.exe -m comparison.train --model efficientnet_b0 --data-dir data/images_15
.\.venv\Scripts\python.exe -m comparison.train --model resnet50 --data-dir data/images_15
.\.venv\Scripts\python.exe -m comparison.train --model mobilenetv3 --data-dir data/images_15
# or all four in sequence
.\.venv\Scripts\python.exe -m comparison.train --model all --data-dir data/images_15

# Re-evaluate saved models on the test set (one model, or all trained models)
.\.venv\Scripts\python.exe -m comparison.evaluate --model all

# Regenerate the comparison table and all graphs from saved results
.\.venv\Scripts\python.exe -m comparison.compare

# Run the application (two terminals, as described above)
python -m http.server 8000      # frontend directory
npm run dev                     # backend
```

Outputs:

```text
backend/results/
|-- model_comparison.csv / .json      # final comparison table
|-- per_model/<model>.json            # full metrics, per-class scores, config, hardware
|-- confusion_matrices/<model>.png|.csv
|-- training_history/<model>.json
`-- plots/                            # accuracy, F1, parameters, size, training time,
                                      # inference time, and accuracy/loss vs epoch
backend/artifacts/comparison/<model>/  # model.keras, labels.txt (weights are git-ignored)
```

### Using the models in the application

Open `frontend/predict.html`, choose a model in the **Model** dropdown, upload a leaf image and analyze it; the result shows the predicted class, confidence and the model used. Models appear in the dropdown when the API is running and the corresponding trained artifacts exist. The **Model Comparison / Performance Analysis** section displays all four statistical results together. The **Compare One Image Across All Four Models** section sends one uploaded image to all four APIs in parallel; before training, it shows a clearly labelled prototype fallback. API additions: `GET /api/models`, `GET /api/models/comparison`, and an optional `model` form field on `POST /api/predictions` (`default`, `mobilenetv2`, `efficientnet_b0`, `resnet50`, `mobilenetv3`).

### Fair-comparison methodology

Use one fixed split and test set, the same class order, seed, input size, batch size, optimizer, learning rate, loss, augmentation, class weights and early-stopping rule for all four models, and the same hardware for the timing measurements. Report macro-F1 alongside accuracy because the classes are imbalanced, and report training time together with the device it ran on. MobileNetV3-Large is evaluated at the common 224 x 224 input size.

### Limitations

- Results depend on the hardware: timings from a CPU and a GPU are not comparable.
- The backbone is frozen (matching the existing baseline), so the study measures feature quality for transfer learning, not full fine-tuning.
- The test set is small (314 images) and imbalanced (`curl_virus` has only 4 test images), so per-class scores and small accuracy gaps are statistically weak; one seed per model gives no variance estimate. Repeat with several `--seed` values if you need confidence intervals.
- MobileNetV3-Large is evaluated at 224 x 224 so that all four models see identical input.
- Training on CPU is slow, especially ResNet50; a GPU is strongly recommended.
- The legacy `train_model.py` uses `Rescaling(scale=2.0, offset=-1.0)` on 0-255 pixels; the study instead uses the correct [-1, 1] scaling that `predict.py` already applies. `train_model.py` itself was left unchanged.

## Docker note

The repository includes a Docker Compose setup for PostgreSQL and the Node API. The current backend Docker image installs Node dependencies only; it does **not** install Python, TensorFlow, or the Python requirements needed by the model inference process. Therefore, Docker Compose alone is not currently a complete model-prediction deployment. Use the local workflow above for full end-to-end inference, or extend the API image to include the compatible Python runtime, requirements, and model artifacts before relying on containerized predictions.

## Security and responsible use

- Use a strong, unique `JWT_SECRET`; never expose `.env` or place production credentials in source control.
- The current database startup code seeds development data in SQLite. Remove development users and rotate credentials before deployment.
- JWT logout is stateless: the client discards its token, but the server does not maintain a token revocation list.
- Review and restrict CORS, HTTPS, upload retention, database access, and admin provisioning before making the API public.
- The classifier is limited to its documented crops/classes, can make mistakes, and should not be the sole basis for crop treatment decisions.
