"""Build the comparison table and graphs from the per-model result files.

    python -m comparison.compare

Reads ``results/per_model/<model>.json`` (written by train.py / evaluate.py) and writes:
    results/model_comparison.csv, results/model_comparison.json
    results/plots/*.png                 (bar charts + training curves)
    results/confusion_matrices/*.png|csv|json
Only models that have actually been trained appear. Nothing is hard-coded or estimated.
"""

import argparse
import csv
import json
import sys

from .config import StudyConfig, add_config_arguments, config_from_args
from .models import DISPLAY_NAMES, MODEL_NAMES

COLUMNS = [
    ("model", "Model"),
    ("total_parameters", "Parameters"),
    ("trainable_parameters", "Trainable Parameters"),
    ("model_size_mb", "Model Size (MB)"),
    ("accuracy", "Accuracy"),
    ("macro_precision", "Precision (macro)"),
    ("macro_recall", "Recall (macro)"),
    ("macro_f1", "F1 (macro)"),
    ("weighted_f1", "F1 (weighted)"),
    ("training_time_seconds", "Training Time (s)"),
    ("epochs_run", "Epochs Run"),
    ("avg_inference_ms_per_image", "Inference (ms/image)"),
    ("throughput_images_per_second", "Throughput (img/s)"),
    ("img_size", "Input Size"),
    ("batch_size", "Batch Size"),
    ("epochs_configured", "Epochs (max)"),
    ("optimizer", "Optimizer"),
    ("learning_rate", "Learning Rate"),
    ("loss", "Loss"),
    ("device_used", "Device"),
]


def _row(result: dict) -> dict:
    config = result.get("config", {})
    test = result.get("test", {})
    inference = result.get("inference", {})
    complexity = result.get("complexity", {})
    training = result.get("training", {})
    return {
        "model": result.get("display_name", result["model"]),
        "key": result["model"],
        "total_parameters": complexity.get("total_parameters"),
        "trainable_parameters": complexity.get("trainable_parameters"),
        "model_size_mb": complexity.get("model_size_mb"),
        "accuracy": test.get("accuracy"),
        "macro_precision": test.get("macro_precision"),
        "macro_recall": test.get("macro_recall"),
        "macro_f1": test.get("macro_f1"),
        "weighted_f1": test.get("weighted_f1"),
        "training_time_seconds": training.get("training_time_seconds"),
        "epochs_run": training.get("epochs_run"),
        "avg_inference_ms_per_image": inference.get("avg_inference_ms_per_image"),
        "throughput_images_per_second": inference.get("throughput_images_per_second"),
        "img_size": config.get("img_size"),
        "batch_size": config.get("batch_size"),
        "epochs_configured": config.get("epochs"),
        "optimizer": config.get("optimizer"),
        "learning_rate": config.get("learning_rate"),
        "loss": config.get("loss"),
        "device_used": result.get("hardware", {}).get("device_used"),
    }


def load_results(config: StudyConfig) -> list:
    results = []
    for name in MODEL_NAMES:  # lightweight -> heavy order
        path = config.results_path / "per_model" / f"{name}.json"
        if path.is_file():
            results.append(json.loads(path.read_text(encoding="utf-8")))
    return results


def _format(value, digits=4):
    if value is None:
        return ""
    return f"{value:.{digits}f}" if isinstance(value, float) else value


def write_tables(config: StudyConfig, results: list) -> list:
    rows = [_row(result) for result in results]
    out = config.results_path
    out.mkdir(parents=True, exist_ok=True)
    with (out / "model_comparison.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([label for _, label in COLUMNS])
        for row in rows:
            writer.writerow([_format(row[key]) for key, _ in COLUMNS])
    summary = {
        "models": rows,
        "class_names": results[0].get("class_names", []) if results else [],
        "dataset_counts": results[0].get("dataset_counts") if results else None,
        "note": "Generated from results/per_model/*.json; precision/recall/F1 are macro-averaged unless labelled.",
    }
    (out / "model_comparison.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return rows


def _bar_chart(plt, rows, key, title, ylabel, path, scale=1.0, fmt="{:.3f}"):
    entries = [(row["model"], row[key]) for row in rows if row[key] is not None]
    if not entries:
        return
    labels, values = zip(*entries)
    values = [value * scale for value in values]
    figure, axis = plt.subplots(figsize=(7, 4.2))
    bars = axis.bar(labels, values, color=["#2e7d32", "#1565c0", "#ef6c00", "#6a1b9a"][: len(values)])
    axis.set_title(title)
    axis.set_ylabel(ylabel)
    axis.bar_label(bars, labels=[fmt.format(value) for value in values], padding=2)
    axis.margins(y=0.15)
    plt.setp(axis.get_xticklabels(), rotation=15, ha="right")
    figure.tight_layout()
    figure.savefig(path, dpi=150)
    plt.close(figure)


def _history_chart(plt, histories, train_key, val_key, title, ylabel, path):
    figure, axis = plt.subplots(figsize=(7.5, 4.5))
    for display, history in histories:
        epochs = range(1, len(history.get(train_key, [])) + 1)
        if history.get(train_key):
            axis.plot(epochs, history[train_key], label=f"{display} (train)")
        if history.get(val_key):
            axis.plot(epochs, history[val_key], linestyle="--", label=f"{display} (validation)")
    axis.set_title(title)
    axis.set_xlabel("Epoch")
    axis.set_ylabel(ylabel)
    axis.legend(fontsize=7)
    axis.grid(alpha=0.3)
    figure.tight_layout()
    figure.savefig(path, dpi=150)
    plt.close(figure)


def _confusion_chart(plt, result, path):
    import numpy as np

    matrix = np.array(result["test"]["confusion_matrix"])
    names = result["class_names"]
    size = max(5.5, 0.6 * len(names) + 3)
    figure, axis = plt.subplots(figsize=(size, size * 0.9))
    image = axis.imshow(matrix, cmap="Blues")
    axis.set_xticks(range(len(names)), labels=names, rotation=60, ha="right", fontsize=7)
    axis.set_yticks(range(len(names)), labels=names, fontsize=7)
    axis.set_xlabel("Predicted class")
    axis.set_ylabel("True class")
    axis.set_title(f"{result.get('display_name', result['model'])} - confusion matrix (test set)")
    threshold = matrix.max() / 2 if matrix.size else 0
    for (i, j), value in np.ndenumerate(matrix):
        axis.text(j, i, int(value), ha="center", va="center", fontsize=7,
                  color="white" if value > threshold else "black")
    figure.colorbar(image, ax=axis, fraction=0.046)
    figure.tight_layout()
    figure.savefig(path, dpi=150)
    plt.close(figure)


def write_plots(config: StudyConfig, results: list, rows: list) -> bool:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib is not installed; tables were written but graphs were skipped.\n"
              "Install it with: pip install -r requirements-comparison.txt", file=sys.stderr)
        return False

    plots = config.results_path / "plots"
    matrices = config.results_path / "confusion_matrices"
    plots.mkdir(parents=True, exist_ok=True)
    matrices.mkdir(parents=True, exist_ok=True)

    _bar_chart(plt, rows, "accuracy", "Test accuracy", "Accuracy (%)", plots / "accuracy_comparison.png", 100, "{:.2f}")
    _bar_chart(plt, rows, "macro_f1", "Test F1-score (macro)", "F1 (%)", plots / "f1_comparison.png", 100, "{:.2f}")
    _bar_chart(plt, rows, "total_parameters", "Total parameters", "Parameters (millions)", plots / "parameters_comparison.png", 1e-6, "{:.2f}M")
    _bar_chart(plt, rows, "model_size_mb", "Saved model size", "Size (MB)", plots / "model_size_comparison.png", 1, "{:.1f}")
    _bar_chart(plt, rows, "training_time_seconds", "Training time", "Minutes", plots / "training_time_comparison.png", 1 / 60, "{:.1f}")
    _bar_chart(plt, rows, "avg_inference_ms_per_image", "Average inference time per image (batch size 1)", "Milliseconds", plots / "inference_time_comparison.png", 1, "{:.1f}")

    histories = []
    for result in results:
        history_path = config.results_path / result.get("training", {}).get("history_file", "")
        if history_path.is_file():
            histories.append((result["display_name"], json.loads(history_path.read_text(encoding="utf-8"))))
    if histories:
        _history_chart(plt, histories, "accuracy", "val_accuracy", "Accuracy vs epoch", "Accuracy", plots / "accuracy_vs_epoch.png")
        _history_chart(plt, histories, "loss", "val_loss", "Loss vs epoch", "Loss", plots / "loss_vs_epoch.png")
        _history_chart(plt, histories, "accuracy", "accuracy", "Training accuracy vs epoch", "Accuracy", plots / "training_accuracy_vs_epoch.png")
        _history_chart(plt, histories, "val_accuracy", "val_accuracy", "Validation accuracy vs epoch", "Accuracy", plots / "validation_accuracy_vs_epoch.png")
        _history_chart(plt, histories, "loss", "loss", "Training loss vs epoch", "Loss", plots / "training_loss_vs_epoch.png")
        _history_chart(plt, histories, "val_loss", "val_loss", "Validation loss vs epoch", "Loss", plots / "validation_loss_vs_epoch.png")

    for result in results:
        key = result["model"]
        _confusion_chart(plt, result, matrices / f"{key}.png")
        with (matrices / f"{key}.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["true\\predicted"] + result["class_names"])
            for name, row in zip(result["class_names"], result["test"]["confusion_matrix"]):
                writer.writerow([name] + row)
    return True


def build_comparison(config: StudyConfig) -> list:
    results = load_results(config)
    if not results:
        print("No trained models found yet; nothing to compare.")
        return []
    rows = write_tables(config, results)
    write_plots(config, results, rows)
    print(f"Comparison for {', '.join(DISPLAY_NAMES[row['key']] for row in rows)} written to {config.results_path}")
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_config_arguments(parser)
    build_comparison(config_from_args(parser.parse_args()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
