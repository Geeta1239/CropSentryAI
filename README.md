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

There is no root-level package installation or frontend compilation step. External page libraries are loaded from CDNs and therefore need network access in the browser.

## Project structure

```text
.
|-- index.html, predict.html, dashboard.html, ...  # Website pages
|-- style.css                                      # Shared styles
|-- disease.css, login.css                        # Page-specific styles
|-- main.js, api.js, auth.js                       # Shared UI/API/auth helpers
|-- login.js, chatbot.js, motion-effects.js, ...   # Focused browser features
|-- imgs/                                          # Site imagery
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
- Python 3.10 (recommended for the pinned TensorFlow 2.15.1 dependency)
- A modern browser
- Git is optional if you already have the project files

Check the installed runtimes:

```powershell
node --version
npm --version
py -3.10 --version
```

## Run locally on Windows

Run the static website and API in **two separate PowerShell terminals**.

### 1. Start the website

In Terminal 1, serve the repository root (do not open the HTML files directly):

```powershell
cd "C:\VS Code\project"
py -3.10 -m http.server 8000
```

### 2. Install and start the API

In Terminal 2:

```powershell
cd "C:\VS Code\project\backend"
npm ci
Copy-Item .env.example .env
py -3.10 -m venv .venv
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

For a manual end-to-end check, keep both servers running, open `predict.html`, and submit a JPG, PNG, or WEBP photo of a supported crop leaf. Confirm the browser console and API terminal do not report new errors.

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

## Docker note

The repository includes a Docker Compose setup for PostgreSQL and the Node API. The current backend Docker image installs Node dependencies only; it does **not** install Python, TensorFlow, or the Python requirements needed by the model inference process. Therefore, Docker Compose alone is not currently a complete model-prediction deployment. Use the local workflow above for full end-to-end inference, or extend the API image to include the compatible Python runtime, requirements, and model artifacts before relying on containerized predictions.

## Security and responsible use

- Use a strong, unique `JWT_SECRET`; never expose `.env` or place production credentials in source control.
- The current database startup code seeds development data in SQLite. Remove development users and rotate credentials before deployment.
- JWT logout is stateless: the client discards its token, but the server does not maintain a token revocation list.
- Review and restrict CORS, HTTPS, upload retention, database access, and admin provisioning before making the API public.
- The classifier is limited to its documented crops/classes, can make mistakes, and should not be the sole basis for crop treatment decisions.
