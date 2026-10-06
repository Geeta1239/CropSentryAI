# CropSentry API

Express API for the static CropSentry frontend. It provides role-based JWT authentication, image diagnosis records, disease data, and admin metrics. Image classification runs locally through the supplied MobileNetV2 TensorFlow Lite model; inference is handled by Python and does not call a hosted model service.

## Setup

1. Copy `.env.example` to `.env`, set a unique 32+ character `JWT_SECRET`, and adjust `CORS_ORIGIN` for the static server.
2. Start PostgreSQL and the API with `docker compose up --build`, or run locally:

```powershell
cd backend
npm install
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm run dev
```

The API defaults to `http://localhost:3000`. A local embedded SQLite database is used when PostgreSQL is unavailable. Use `npm test` for endpoint tests and `npm run lint` for source checks.

Serve the website root separately, for example with `python -m http.server 8000` from the project root, then visit `http://localhost:8000/predict.html`. The browser calls the local API at `http://localhost:3000/api`.

The active model artifacts are `artifacts/crop-disease/model.tflite`, `labels.txt`, `test_metrics.json`, and `classification_report.json`. The API exposes `GET /api/model` for the supported class list and held-out evaluation metrics, including per-class recall. The report shows 39.3% recall for Tomato Early Blight, so interpret that class cautiously. Python inference uses the configured virtual environment (`.venv\Scripts\python.exe` on Windows); set `PYTHON_EXECUTABLE` if using another interpreter. Predictions are available without signing in; this model's 15-class results are not yet persisted to account history.

## Dataset preparation and model training

The original image archives belong in `backend/data/`. Prepare the dataset from the backend directory:

```powershell
python src/scripts/prepare_dataset.py
```

This creates `data/images/{train,validation,test}/<class>/` and a `data/images/manifest.json` with source paths, SHA-256 hashes, class counts, and the deterministic split seed. It uses only original images, excludes pre-augmented copies to prevent train/test leakage, removes exact duplicates, and excludes exact duplicate images carrying conflicting labels. The split is stratified per class at approximately 70/15/15. The script refuses to overwrite a non-empty prepared dataset.

Install the Python training dependencies in a virtual environment using a TensorFlow-supported Python version (Python 3.10 or 3.11 for the pinned TensorFlow 2.15.1 dependency), then train:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python src/scripts/train_model.py
```

Training uses the validation split for checkpoint selection and reports metrics on the held-out test split. The Keras model, class names, and test metrics are written under `backend/artifacts/`. Training downloads MobileNetV2 ImageNet weights if they are not cached. TensorFlow.js conversion is intentionally separate from training because its optional converter stack has platform-specific dependencies. The backend also includes a 15-class PlantVillage model supplied in the CropGuard project. It covers pepper, potato, and tomato leaves; it is separate from the cotton classifier produced by the training script above.

## Environment

`DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` are used when configured. `UPLOAD_DIR` defaults to `uploads`, `MAX_FILE_SIZE` defaults to 10 MiB, and `JWT_EXPIRES_IN` defaults to `8h`. Keep `.env` out of source control.

## API

`POST /api/auth/register` accepts `{ "name", "email", "password" }`; all new accounts are farmers. `POST /api/auth/login` accepts `{ "email", "password" }`; responses include `{ token, user }`. Send `Authorization: Bearer <token>` to `GET /api/auth/me`, `POST /api/auth/logout`, and prediction routes.

```powershell
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Ramesh Patel","email":"ramesh@example.com","password":"strong-passphrase"}'
curl -X POST http://localhost:3000/api/predictions -H "Authorization: Bearer TOKEN" -F "image=@leaf.jpg"
```

`GET /api/predictions` lists a caller’s history; `GET /api/predictions/:id` reads one. `GET /api/diseases` and `GET /api/diseases/:slug` are public. Admins may call `GET /api/admin/users`, `/predictions`, and `/metrics`.

## Security and ML handoff

Uploads are limited to one JPG/PNG/WEBP, checked by MIME type and file signature, size-limited, randomly named, and stored outside the public web root. JWT logout is client-side token invalidation; introduce a server-side denylist/refresh-token store if immediate revocation is required. To deploy an ML model, replace `predict()` with a time-limited, authenticated FastAPI request and preserve its normalized result contract.
