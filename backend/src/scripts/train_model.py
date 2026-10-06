# file:///c:/VS%20Code/project/backend/src/scripts/train_model.py
"""
TRAIN_MODEL.PY
==============
End‑to‑end pipeline for a cotton‑leaf‑disease classifier.
- Downloads / extracts the dataset (if not already present).
- Builds a MobileNetV2‑based CNN.
- Trains with early‑stopping & data‑augmentation.
- Saves:
   • Keras model   → backend/artifacts/model.keras
"""

import json
import pathlib
import tensorflow as tf
from tensorflow.keras import layers, models, applications, callbacks

# ------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------
DATA_ROOT = pathlib.Path(__file__).resolve().parents[2] / "data"
IMG_DIR = DATA_ROOT / "images"
MODEL_DIR = pathlib.Path(__file__).resolve().parents[2] / "artifacts"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 30
SEED = 42

# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------
def build_dataset(split: str, class_names=None):
    dataset = tf.keras.utils.image_dataset_from_directory(
        directory=IMG_DIR / split,
        labels="inferred",
        label_mode="categorical",
        batch_size=BATCH_SIZE,
        image_size=IMG_SIZE,
        shuffle=split == "train",
        seed=SEED,
    )
    detected_classes = dataset.class_names
    if class_names is not None and detected_classes != class_names:
        raise ValueError(
            f"Class folders in {split} do not match the training classes: "
            f"{detected_classes} != {class_names}"
        )
    dataset = dataset.prefetch(tf.data.AUTOTUNE)
    return dataset, detected_classes

# ------------------------------------------------------------
# MAIN
# ------------------------------------------------------------
def evaluate_by_class(model, dataset, class_names):
    true_labels = []
    predicted_labels = []
    for images, labels in dataset:
        predictions = model(images, training=False)
        true_labels.extend(tf.argmax(labels, axis=1).numpy().tolist())
        predicted_labels.extend(tf.argmax(predictions, axis=1).numpy().tolist())

    confusion = tf.math.confusion_matrix(
        true_labels, predicted_labels, num_classes=len(class_names)
    ).numpy()
    per_class = {}
    f1_scores = []
    for index, class_name in enumerate(class_names):
        true_positives = int(confusion[index, index])
        predicted_count = int(confusion[:, index].sum())
        support = int(confusion[index, :].sum())
        precision = true_positives / predicted_count if predicted_count else 0.0
        recall = true_positives / support if support else 0.0
        f1_score = (
            2 * precision * recall / (precision + recall)
            if precision + recall else 0.0
        )
        f1_scores.append(f1_score)
        per_class[class_name] = {
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "support": support,
        }

    return {
        "per_class": per_class,
        "macro_f1_score": sum(f1_scores) / len(f1_scores),
        "confusion_matrix": confusion.tolist(),
    }


def main():
    manifest_path = IMG_DIR / "manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(
            f"Prepared dataset manifest not found: {manifest_path}\n"
            "Run `python src/scripts/prepare_dataset.py` from the backend directory first."
        )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    train_ds, class_names = build_dataset("train")
    val_ds, _ = build_dataset("validation", class_names)
    test_ds, _ = build_dataset("test", class_names)
    print(f"Detected {len(class_names)} classes: {class_names}")

    train_counts = [manifest["classes"][name]["train"] for name in class_names]
    total_train = sum(train_counts)
    class_weights = {
        index: total_train / (len(class_names) * count)
        for index, count in enumerate(train_counts)
    }

    # Model – MobileNetV2 base (pre-trained) + custom head
    base = applications.MobileNetV2(
        input_shape=IMG_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False

    model = models.Sequential([
        layers.Input(shape=IMG_SIZE + (3,)),
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.08),
        layers.RandomZoom(0.1),
        layers.Rescaling(scale=2.0, offset=-1.0),
        base,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.2),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(len(class_names), activation="softmax"),
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    ckpt = callbacks.ModelCheckpoint(
        filepath=str(MODEL_DIR / "model.keras"),
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1,
    )
    es = callbacks.EarlyStopping(patience=5, restore_best_weights=True)

    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=[ckpt, es],
        class_weight=class_weights,
    )

    print("\nHeld-out test set evaluation:")
    test_metrics = model.evaluate(test_ds, return_dict=True)
    test_metrics.update(evaluate_by_class(model, test_ds, class_names))
    print(json.dumps(test_metrics, indent=2))
    (MODEL_DIR / "classes.json").write_text(json.dumps(class_names), encoding="utf-8")

    (MODEL_DIR / "test_metrics.json").write_text(
        json.dumps(test_metrics, indent=2), encoding="utf-8"
    )

    print("\nTraining finished")
    print(f"Keras model: {MODEL_DIR / 'model.keras'}")
    print(f"Test metrics: {MODEL_DIR / 'test_metrics.json'}")

if __name__ == "__main__":
    main()
