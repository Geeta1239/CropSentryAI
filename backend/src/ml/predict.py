"""Run the trained TensorFlow Lite model on one image received through stdin."""

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError


def predict(image_bytes: bytes, model_path: Path, labels_path: Path) -> dict:
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

    if not model_path.is_file():
        raise FileNotFoundError(f"TensorFlow Lite model not found: {model_path}")
    if not labels_path.is_file():
        raise FileNotFoundError(f"Model labels not found: {labels_path}")

    labels = [
        label.strip()
        for label in labels_path.read_text(encoding="utf-8").splitlines()
        if label.strip()
    ]
    if not labels:
        raise ValueError("The model labels file is empty.")

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            image = image.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
            batch = np.asarray(image, dtype=np.float32)
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError("The uploaded file could not be decoded as an image.") from error

    batch = preprocess_input(batch)
    batch = np.expand_dims(batch, axis=0)

    interpreter = tf.lite.Interpreter(model_path=str(model_path))
    interpreter.allocate_tensors()
    input_detail = interpreter.get_input_details()[0]
    output_detail = interpreter.get_output_details()[0]
    expected_shape = tuple(input_detail["shape"])
    if tuple(batch.shape) != expected_shape:
        raise ValueError(
            f"Preprocessed image shape {batch.shape} does not match model input {expected_shape}."
        )

    interpreter.set_tensor(input_detail["index"], batch.astype(input_detail["dtype"]))
    interpreter.invoke()
    scores = interpreter.get_tensor(output_detail["index"])[0]
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
    }


def main() -> int:
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Expected the model path and labels path."}))
        return 2
    try:
        result = predict(sys.stdin.buffer.read(), Path(sys.argv[1]), Path(sys.argv[2]))
        print(json.dumps(result))
        return 0
    except (FileNotFoundError, ValueError, OSError) as error:
        print(json.dumps({"error": str(error)}))
        return 2
    except Exception as error:  # surface inference failures to the API caller
        print(json.dumps({"error": f"TensorFlow Lite inference failed: {error}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
