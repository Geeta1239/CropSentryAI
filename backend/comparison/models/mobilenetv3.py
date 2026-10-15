"""MobileNetV3-Large - modern lightweight convolutional baseline."""

import tensorflow as tf

DISPLAY_NAME = "MobileNetV3-Large"


def build_backbone(img_size: int, weights):
    return tf.keras.applications.MobileNetV3Large(
        input_shape=(img_size, img_size, 3),
        include_top=False,
        weights=weights,
        include_preprocessing=True,
    )


def build_preprocessing():
    # MobileNetV3's Keras backbone includes preprocessing and expects raw [0, 255] pixels.
    return None
