"""Shared model construction and model-level measurements (size, parameters, speed)."""

import platform
import time
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models


def build_classifier(model_module, num_classes: int, config):
    """Frozen ImageNet backbone + the same head the baseline train_model.py uses.

    Input -> augmentation -> (model-specific preprocessing) -> backbone ->
    GlobalAveragePooling -> Dropout -> Dense(256) -> Dropout -> Dense(num_classes, softmax)
    """
    size = config.img_size
    weights = None if config.weights == "none" else config.weights
    base = model_module.build_backbone(size, weights)
    base.trainable = False

    stack = [
        layers.Input(shape=(size, size, 3)),
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.08),
        layers.RandomZoom(0.1),
    ]
    preprocessing = model_module.build_preprocessing()
    if preprocessing is not None:
        stack.append(preprocessing)
    stack += [
        base,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(config.dropout),
        layers.Dense(config.dense_units, activation="relu"),
        layers.Dropout(config.dropout),
        layers.Dense(num_classes, activation="softmax"),
    ]
    model = models.Sequential(stack, name=model_module.DISPLAY_NAME.replace("-", "_"))
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=config.learning_rate),
        loss=config.loss,
        metrics=["accuracy"],
    )
    return model


def count_parameters(model) -> dict:
    trainable = int(sum(int(np.prod(w.shape)) for w in model.trainable_weights))
    total = int(model.count_params())
    return {
        "total_parameters": total,
        "trainable_parameters": trainable,
        "non_trainable_parameters": total - trainable,
    }


def file_size_mb(path: Path) -> float:
    return round(Path(path).stat().st_size / (1024 * 1024), 3)


def hardware_info() -> dict:
    gpus = tf.config.list_physical_devices("GPU")
    return {
        "platform": platform.platform(),
        "processor": platform.processor() or platform.machine(),
        "tensorflow": tf.__version__,
        "gpu_devices": [gpu.name for gpu in gpus],
        "device_used": "GPU" if gpus else "CPU",
    }


def measure_inference(model, image_batches, config, warmup: int = 3, max_single_images: int = 100) -> dict:
    """Latency (batch size 1) and throughput (configured batch size) on real test images.

    ``image_batches`` is an iterable of (images, labels) batches from the test set.
    """
    singles = []
    for images, _ in image_batches:
        for image in images:
            singles.append(np.asarray(image)[None, ...])
            if len(singles) >= max_single_images + warmup:
                break
        if len(singles) >= max_single_images + warmup:
            break

    for image in singles[:warmup]:
        model(image, training=False)
    latencies = []
    for image in singles[warmup:]:
        start = time.perf_counter()
        model(image, training=False)
        latencies.append((time.perf_counter() - start) * 1000.0)

    batch = next(iter(image_batches))[0]
    model(batch, training=False)  # warm-up for this batch shape
    runs, images_seen, start = 0, 0, time.perf_counter()
    while runs < 5:
        model(batch, training=False)
        images_seen += int(batch.shape[0])
        runs += 1
    elapsed = time.perf_counter() - start

    return {
        "avg_inference_ms_per_image": float(np.mean(latencies)),
        "median_inference_ms_per_image": float(np.median(latencies)),
        "p95_inference_ms_per_image": float(np.percentile(latencies, 95)),
        "latency_images_measured": len(latencies),
        "throughput_images_per_second": images_seen / elapsed,
        "throughput_batch_size": int(batch.shape[0]),
    }
