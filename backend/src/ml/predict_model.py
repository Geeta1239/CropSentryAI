"""Run one comparative-study model (a saved Keras model) on an image received through stdin.

Companion to predict.py, which stays the TensorFlow Lite runner for the deployed MobileNetV2.
Usage: predict_model.py <model.keras> <labels.txt>
Output JSON matches predict.py: predictedClass, confidence, topPredictions (+ inferenceMs).
Each study model carries its own preprocessing layers, so the image is fed as raw 0-255 RGB.
"""

import io
import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

BACKEND_DIR = Path(__file__).resolve().parents[2]


def predict(image_bytes: bytes, model_path: Path, labels_path: Path) -> dict:
    sys.path.insert(0, str(BACKEND_DIR))
    import tensorflow as tf

    import comparison.models  # noqa: F401  (registers the custom ResNet50 preprocessing layer)

    if not model_path.is_file():
        raise FileNotFoundError(f"Trained model not found: {model_path}")
    if not labels_path.is_file():
        raise FileNotFoundError(f"Model labels not found: {labels_path}")
    labels = [
        line.strip() for line in labels_path.read_text(encoding="utf-8").splitlines() if line.strip()
    ]
    if not labels:
        raise ValueError("The model labels file is empty.")

    model = tf.keras.models.load_model(model_path, compile=False)
    height, width = model.input_shape[1:3]
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            image = image.convert("RGB").resize((width, height), Image.Resampling.BILINEAR)
            batch = np.expand_dims(np.asarray(image, dtype=np.float32), axis=0)
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError("The uploaded file could not be decoded as an image.") from error

    start = time.perf_counter()
    scores = model(batch, training=False).numpy()[0]
    inference_ms = (time.perf_counter() - start) * 1000.0
    if scores.shape[0] != len(labels):
        raise ValueError(
            f"Model has {scores.shape[0]} outputs but labels file contains {len(labels)} classes."
        )

    top_indices = np.argsort(scores)[::-1][: min(3, len(labels))]
    top_predictions = [
        {"className": labels[index], "confidence": float(scores[index]) * 100.0}
        for index in top_indices
    ]
    return {
        "predictedClass": top_predictions[0]["className"],
        "confidence": top_predictions[0]["confidence"],
        "topPredictions": top_predictions,
        "inferenceMs": inference_ms,
    }


def main() -> int:
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Expected the model path and labels path."}))
        return 2
    try:
        print(json.dumps(predict(sys.stdin.buffer.read(), Path(sys.argv[1]), Path(sys.argv[2]))))
        return 0
    except (FileNotFoundError, ValueError, OSError) as error:
        print(json.dumps({"error": str(error)}))
        return 2
    except Exception as error:
        print(json.dumps({"error": f"Model inference failed: {error}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
