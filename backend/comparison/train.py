"""Train one (or all) of the four study models with identical settings.

    python -m comparison.train --model mobilenetv2
    python -m comparison.train --model efficientnet_b0
    python -m comparison.train --model resnet50
    python -m comparison.train --model efficientnet_b3
    python -m comparison.train --model all

Every run: loads the shared dataset -> builds the model through the factory -> trains with
early stopping -> keeps the best-validation-accuracy checkpoint -> evaluates it on the
test set -> measures inference speed -> writes metrics and refreshes the comparison.
Nothing here modifies the deployed model in backend/artifacts/crop-disease/.
"""

import argparse
import json
import time
from datetime import datetime, timezone

import tensorflow as tf

from .config import StudyConfig, add_config_arguments, config_from_args
from .evaluate import evaluate_model, save_result
from .models import DISPLAY_NAMES, MODEL_NAMES, get_model
from .utils.dataset import class_weights_from_counts, load_datasets
from .utils.model_utils import count_parameters, file_size_mb, hardware_info


def train_one(model_name: str, config: StudyConfig) -> dict:
    tf.keras.backend.clear_session()
    tf.keras.utils.set_random_seed(config.seed)

    train_ds, val_ds, test_ds, class_names, counts = load_datasets(config)
    print(f"[{model_name}] {len(class_names)} classes: {class_names}")
    class_weights = (
        class_weights_from_counts(counts["train"], class_names) if config.use_class_weights else None
    )

    model = get_model(model_name, len(class_names), config)
    model_dir = config.model_dir(model_name)
    model_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = model_dir / "model.keras"

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(checkpoint_path), monitor="val_accuracy", save_best_only=True, verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=config.early_stopping_patience,
            restore_best_weights=True,
        ),
    ]

    start = time.perf_counter()
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=config.epochs,
        callbacks=callbacks,
        class_weight=class_weights,
    )
    training_seconds = time.perf_counter() - start

    history_data = {key: [float(v) for v in values] for key, values in history.history.items()}
    epochs_run = len(history_data.get("loss", []))
    best_epoch = 1 + max(range(epochs_run), key=lambda i: history_data["val_accuracy"][i])

    # Evaluate the saved best checkpoint (exactly what the application would load).
    best_model = tf.keras.models.load_model(checkpoint_path, compile=False)
    evaluation = evaluate_model(best_model, test_ds, class_names, config)

    (model_dir / "labels.txt").write_text("\n".join(class_names) + "\n", encoding="utf-8")
    (model_dir / "classes.json").write_text(json.dumps(class_names), encoding="utf-8")

    history_path = config.results_path / "training_history" / f"{model_name}.json"
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(history_data, indent=2), encoding="utf-8")

    result = {
        "model": model_name,
        "display_name": DISPLAY_NAMES[model_name],
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "config": config.to_dict(),
        "hardware": hardware_info(),
        "class_names": class_names,
        "dataset_counts": counts,
        "complexity": {
            **count_parameters(best_model),
            "model_size_mb": file_size_mb(checkpoint_path),
        },
        "training": {
            "training_time_seconds": training_seconds,
            "epochs_run": epochs_run,
            "best_epoch": best_epoch,
            "seconds_per_epoch": training_seconds / max(epochs_run, 1),
            "class_weights_used": bool(class_weights),
            "history_file": f"training_history/{model_name}.json",
        },
        **evaluation,
    }
    save_result(config, model_name, result)

    test = result["test"]
    print(f"[{model_name}] test accuracy={test['accuracy']:.4f} macro_f1={test['macro_f1']:.4f} "
          f"train_time={training_seconds:.0f}s")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True, choices=MODEL_NAMES + ["all"])
    add_config_arguments(parser)
    args = parser.parse_args()
    config = config_from_args(args)

    from .compare import build_comparison

    for name in (MODEL_NAMES if args.model == "all" else [args.model]):
        train_one(name, config)
        build_comparison(config)  # update the table/plots after every model
    print(f"Results written to {config.results_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
