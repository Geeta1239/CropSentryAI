# CropSentryAI: Comparative Study Audit

## Current status

- The repository contains a four-model comparison pipeline:
  - MobileNetV2
  - EfficientNet-B0
  - ResNet50
  - EfficientNet-B3
- The training, evaluation, metric, chart, API, and prediction-selection code is present.
- The comparison dataset is present: 1,472 train images, 318 validation images, and 314 test images across six classes.
- No `backend/results/` outputs currently exist.
- No trained comparison models currently exist under `backend/artifacts/comparison/`.
- Therefore, the website cannot display real comparative values until training/evaluation is run.
- No source files were modified during this audit.

## Important methodology issue

The deployed production model is a 15-class bell-pepper/potato/tomato model. The comparison pipeline currently uses a separate six-class dataset. Those results must not be presented as a direct numerical comparison with the deployed 15-class model.

Recommended UI wording:

- **Production inference:** MobileNetV2, 15 classes.
- **Comparative study:** four models trained and tested on the same six-class dataset.

If the academic requirement is to compare the models on the same 15 classes as the deployed system, the four models must be retrained on a common 15-class dataset and split before final results are shown.

## UI gaps found

1. **The active root API is wired, but the duplicate `frontend/` copy is stale.**
   - Root `api.js` includes `models()`, `modelComparison()`, `resultAssetUrl()`, and optional model selection.
   - `frontend/assets/js/api.js` does not include those methods.
   - The project should declare one canonical frontend root or update/remove the duplicate to avoid running an outdated page.

2. **The comparison table is too narrow for the requested statistical study.**
   It currently shows parameters, model size, accuracy, macro precision, macro recall, macro F1, training time, and inference time. It should also expose:
   - weighted precision, weighted recall, weighted F1;
   - median and p95 inference latency;
   - throughput;
   - number of test samples;
   - epochs run and best epoch;
   - device/hardware;
   - optimizer, learning rate, loss, input size, and batch size;
   - dataset/split summary.

3. **Per-class metrics are not visible in the UI.**
   The backend generates per-class precision, recall, F1, and support, but the current UI only shows aggregate metrics. Add a model selector or expandable rows for per-class results.

4. **The UI does not clearly identify the selected/best model.**
   Add a highlighted recommendation card based on a declared criterion, preferably macro F1 first, with accuracy and latency shown alongside it. Do not silently select a winner when metrics conflict.

5. **The generated comparison charts are only partially rendered.**
   `model-comparison.js` renders training curves and confusion matrices, but not the generated aggregate charts such as accuracy, F1, parameters, model size, training time, or inference time. Add those charts to the dashboard.

6. **Confusion matrices need better navigation.**
   Add model tabs/cards, readable labels, a larger view/download link, and an explanation that rows are true classes and columns are predicted classes.

7. **Loading, empty, and error states need to be explicit.**
   Show separate states for:
   - API unavailable;
   - results not generated yet;
   - only some models trained;
   - all four models available.
   The current message should not imply that missing results are a frontend failure.

8. **Prediction-page wording is still MobileNet-only in places.**
   Update the header, metadata, footer, and result area to say “selected model” where appropriate. Keep the production 15-class model and comparative six-class models visibly separate.

9. **Prediction outputs need a model/dataset compatibility warning.**
   When a user selects a comparison model, show its class set and a note that it predicts the comparative-study classes, not necessarily the production model’s 15 classes.

10. **Accessibility and responsive behavior need verification.**
    The comparison table should scroll horizontally on mobile, charts need descriptive captions/alt text, and color should not be the only way to distinguish models.

## UI-first execution plan

### Phase 1 — Confirm the product contract

1. Decide whether the final study uses the current six-class dataset or a new 15-class dataset.
2. Keep the deployed 15-class MobileNetV2 as a separate production baseline unless all four models are retrained on the same 15-class data.
3. Select the primary ranking metric. Recommended: macro F1, with accuracy and inference latency as secondary metrics.

### Phase 2 — Build the comparative-study UI

1. Create a dedicated “Model Comparison” section/page rather than mixing research metrics into the farmer prediction card.
2. Add a four-model overview card grid with status, availability, dataset, and headline metrics.
3. Add a complete aggregate metrics table with units and definitions.
4. Add a per-class metric view: precision, recall, F1, and support for each model/class.
5. Add chart panels for accuracy, macro F1, weighted F1, latency, throughput, model size, parameters, and training time.
6. Add one confusion-matrix panel with model tabs and a download/open-full-size action.
7. Add an experiment-information panel documenting seed, split, input size, batch size, optimizer, learning rate, loss, augmentation, class weights, device, and test-set size.
8. Add honest empty/loading/error states and the six-class versus 15-class warning.
9. Synchronize or remove the stale `frontend/` duplicate so only one UI is maintained.

### Phase 3 — Validate the UI with fixture data

1. Create a temporary sample `model_comparison.json` fixture containing four fake rows only for layout testing.
2. Confirm table rendering, chart rendering, responsive behavior, dark mode, and accessibility.
3. Remove the fixture before real results are committed.

### Phase 4 — Run the experiment

1. Install backend comparison requirements.
2. Train all four models with the same configuration and seed.
3. Re-evaluate all saved models on the same held-out test set.
4. Generate the CSV/JSON summary, per-model JSON files, plots, and confusion matrices.
5. Verify that all four model artifacts and labels exist.
6. Compare results only after confirming matching class order, split, input size, preprocessing, and hardware conditions.

### Phase 5 — Connect real results and test end-to-end

1. Start the backend and static frontend.
2. Test `GET /api/models`.
3. Test `GET /api/models/comparison`.
4. Test prediction using each available model.
5. Verify that the UI displays the selected model, correct class set, confidence, and inference time.
6. Run backend tests, JavaScript syntax checks, and a manual browser test.

## Relevant files inspected

- `predict.html`
- `api.js`
- `main.js`
- `model-comparison.js`
- `style.css`
- `backend/comparison/train.py`
- `backend/comparison/evaluate.py`
- `backend/comparison/compare.py`
- `backend/comparison/utils/metrics.py`
- `backend/src/services/comparisonModelService.js`
- `backend/src/controllers/predictionController.js`
- `backend/src/routes/modelRoutes.js`
- `frontend/assets/js/api.js` (stale duplicate)
