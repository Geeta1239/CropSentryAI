"""EfficientNet-B3 - larger compound-scaled EfficientNet (native resolution 300 x 300)."""

import tensorflow as tf

DISPLAY_NAME = "EfficientNet-B3"


def build_backbone(img_size: int, weights):
    return tf.keras.applications.EfficientNetB3(
        input_shape=(img_size, img_size, 3), include_top=False, weights=weights
    )


def build_preprocessing():
    # Keras EfficientNet normalises its own input; it expects raw [0, 255] pixels.
    return None
