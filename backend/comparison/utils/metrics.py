"""Classification metrics implemented with NumPy only (no scikit-learn dependency)."""

import numpy as np


def confusion_matrix(y_true, y_pred, num_classes: int) -> np.ndarray:
    matrix = np.zeros((num_classes, num_classes), dtype=np.int64)
    for actual, predicted in zip(y_true, y_pred):
        matrix[int(actual), int(predicted)] += 1
    return matrix


def _safe_divide(numerator, denominator):
    return float(numerator) / float(denominator) if denominator else 0.0


def classification_metrics(y_true, y_pred, class_names) -> dict:
    """Accuracy, macro/weighted precision-recall-F1, per-class scores and confusion matrix."""
    matrix = confusion_matrix(y_true, y_pred, len(class_names))
    per_class = {}
    for index, name in enumerate(class_names):
        true_positive = int(matrix[index, index])
        predicted_count = int(matrix[:, index].sum())
        support = int(matrix[index, :].sum())
        precision = _safe_divide(true_positive, predicted_count)
        recall = _safe_divide(true_positive, support)
        f1_score = _safe_divide(2 * precision * recall, precision + recall)
        per_class[name] = {
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "support": support,
        }

    supports = np.array([per_class[name]["support"] for name in class_names], dtype=float)
    weights = supports / supports.sum() if supports.sum() else supports

    def average(key, weighted):
        values = np.array([per_class[name][key] for name in class_names])
        return float(np.sum(values * weights) if weighted else values.mean())

    return {
        "accuracy": _safe_divide(np.trace(matrix), matrix.sum()),
        "macro_precision": average("precision", False),
        "macro_recall": average("recall", False),
        "macro_f1": average("f1_score", False),
        "weighted_precision": average("precision", True),
        "weighted_recall": average("recall", True),
        "weighted_f1": average("f1_score", True),
        "num_test_samples": int(matrix.sum()),
        "per_class": per_class,
        "confusion_matrix": matrix.tolist(),
    }
