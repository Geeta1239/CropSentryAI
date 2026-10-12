"""EfficientNet-B0 - compound-scaled lightweight network (MBConv + squeeze-excitation)."""

import tensorflow as tf

DISPLAY_NAME = "EfficientNet-B0"


def build_backbone(img_size: int, weights):
    return tf.keras.applications.EfficientNetB0(
        input_shape=(img_size, img_size, 3), include_top=False, weights=weights
    )


def build_preprocessing():
    # Keras EfficientNet normalises its own input; it expects raw [0, 255] pixels.
    return None
