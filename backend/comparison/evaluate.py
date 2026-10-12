"""Evaluate trained models on the shared held-out test set.

    python -m comparison.evaluate --model resnet50
    python -m comparison.evaluate --model all

Reloads each saved ``model.keras`` and re-measures accuracy, precision/recall/F1,
confusion matrix and inference speed on the same test split, then refreshes the
comparison table and plots. Training metadata recorded by ``train.py`` is preserved.
"""

import argparse
import json
import sys
from datetime import datetime, timezone

import numpy as np
import tensorflow as tf

from .config import StudyConfig, add_config_arguments, config_from_args
from .models import DISPLAY_NAMES, MODEL_NAMES
from .utils.dataset import build_split
from .utils.metrics import classification_metrics
from .utils.model_utils import count_parameters, file_size_mb, hardware_info, measure_inference


def per_model_path(config: StudyConfig, model_name: str):
    return config.results_path / "per_model" / f"{model_name}.json"


def read_per_model(config: StudyConfig, model_name: str) -> dict:
    path = per_model_path(config, model_name)
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}


def predict_labels(model, dataset):
    y_true, y_pred = [], []
    for images, labels in dataset:
        probabilities = model(images, training=False).numpy()
        y_true.extend(np.argmax(labels.numpy(), axis=1).tolist())
        y_pred.extend(np.argmax(probabilities, axis=1).tolist())
    return y_true, y_pred


def evaluate_model(model, test_ds, class_names, config: StudyConfig) -> dict:
    """Classification metrics + inference timing on the test set."""
    y_true, y_pred = predict_labels(model, test_ds)
    return {
        "test": classification_metrics(y_true, y_pred, class_names),
        "inference": measure_inference(model, test_ds, config),
    }


def save_result(config: StudyConfig, model_name: str, result: dict) -> None:
    path = per_model_path(config, model_name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2), encoding="utf-8")


def evaluate_saved_model(model_name: str, config: StudyConfig) -> dict:
    model_path = config.model_dir(model_name) / "model.keras"
    if not model_path.is_file():
        raise FileNotFoundError(
            f"No trained model for '{model_name}' at {model_path}. "
            f"Train it first: python -m comparison.train --model {model_name}"
        )
    previous = read_per_model(config, model_name)
    test_ds, class_names = build_split(config, "test")
    model = tf.keras.models.load_model(model_path, compile=False)

    result = dict(previous)
    result.update({
        "model": model_name,
        "display_name": DISPLAY_NAMES[model_name],
        "evaluated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "hardware": hardware_info(),
        "class_names": class_names,
        "complexity": {**count_parameters(model), "model_size_mb": file_size_mb(model_path)},
    })
    result.setdefault("config", config.to_dict())
    result.update(evaluate_model(model, test_ds, class_names, config))
    save_result(config, model_name, result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True, choices=MODEL_NAMES + ["all"])
    add_config_arguments(parser)
    args = parser.parse_args()
    config = config_from_args(args)

    from .compare import build_comparison

    selected = MODEL_NAMES if args.model == "all" else [args.model]
    for name in selected:
        try:
            result = evaluate_saved_model(name, config)
        except FileNotFoundError as error:
            if args.model != "all":
                print(error, file=sys.stderr)
                return 1
            print(f"Skipping {name}: not trained yet.")
            continue
        test = result["test"]
        print(f"{name}: accuracy={test['accuracy']:.4f} macro_f1={test['macro_f1']:.4f} "
              f"inference={result['inference']['avg_inference_ms_per_image']:.1f} ms/image")
    build_comparison(config)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
