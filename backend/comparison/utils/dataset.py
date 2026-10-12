"""Dataset loading shared by every model so all of them see identical data.

Expects the layout produced by ``src/scripts/prepare_dataset.py``:
``<data_dir>/{train,validation,test}/<class_name>/*.jpg`` (an optional ``manifest.json`` is ignored).
The same fixed split, class order and test set are used for all four models.
"""

import tensorflow as tf

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _count_images(folder) -> int:
    return sum(1 for item in folder.iterdir() if item.suffix.lower() in IMAGE_EXTENSIONS)


def build_split(config, split: str, class_names=None):
    directory = config.data_path / split
    if not directory.is_dir():
        raise FileNotFoundError(
            f"Split folder not found: {directory}\n"
            "Run `python src/scripts/prepare_dataset.py` first or pass --data-dir."
        )
    dataset = tf.keras.utils.image_dataset_from_directory(
        directory=directory,
        labels="inferred",
        label_mode="categorical",
        batch_size=config.batch_size,
        image_size=(config.img_size, config.img_size),
        shuffle=split == "train",
        seed=config.seed,
    )
    detected = list(dataset.class_names)
    if class_names is not None and detected != class_names:
        raise ValueError(
            f"Class folders in '{split}' do not match the training classes: {detected} != {class_names}"
        )
    return dataset.prefetch(tf.data.AUTOTUNE), detected


def load_datasets(config):
    """Return (train, validation, test, class_names, split_counts)."""
    train_ds, class_names = build_split(config, "train")
    val_ds, _ = build_split(config, "validation", class_names)
    test_ds, _ = build_split(config, "test", class_names)
    counts = {
        split: {name: _count_images(config.data_path / split / name) for name in class_names}
        for split in ("train", "validation", "test")
    }
    return train_ds, val_ds, test_ds, class_names, counts


def class_weights_from_counts(train_counts: dict, class_names: list) -> dict:
    """Balanced class weights, computed exactly like backend/src/scripts/train_model.py."""
    total = sum(train_counts[name] for name in class_names)
    return {
        index: total / (len(class_names) * train_counts[name])
        for index, name in enumerate(class_names)
    }
