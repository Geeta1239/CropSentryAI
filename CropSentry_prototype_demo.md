# CropSentry prototype demonstration

## What is ready

Open `predict.html` through the existing static frontend. The page now contains:

- a four-model comparative-study dashboard;
- MobileNetV2, EfficientNet-B0, ResNet50, and EfficientNet-B3 cards/table rows;
- accuracy, macro precision, macro recall, macro F1, parameter count, model size, training time, and inference-time visualizations;
- three PlantVillage sample leaf images;
- responsive styling for a classroom/project review presentation.

## Important wording for the review

This is a **frontend prototype**. The comparison values are illustrative fixture values used only to demonstrate the UI. They are not the results of the four models trained in this project.

The dashboard explicitly displays:

> Prototype demonstration only. The values below are illustrative UI sample data. They are not trained-model results and must be replaced after the four models are trained.

After the real comparison endpoint returns four complete model results, the UI automatically changes the badge to **Trained results** and hides the prototype notice.

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/predict.html
```

The backend is not required to view the comparison prototype. If the backend API is unavailable, the page automatically falls back to the clearly labeled prototype data.

## Files added or updated

- `predict.html` — prototype comparison section and sample gallery
- `model-comparison.js` — demo fallback and real-result switching
- `prototype-comparison.css` — prototype dashboard styling
- `assets/prototype/` — three small sample leaf images

## Replacement after training

Once all four models are trained, the demo rows must disappear automatically when `GET /api/models/comparison` returns complete results. Before presenting final research claims, replace the fixture fallback or disable it and verify the generated metrics, per-class reports, and confusion matrices.
