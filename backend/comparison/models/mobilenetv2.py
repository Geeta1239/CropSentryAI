"""MobileNetV2 - the lightweight baseline (inverted residuals + linear bottlenecks)."""

import tensorflow as tf
from tensorflow.keras import layers

DISPLAY_NAME = "MobileNetV2"


def build_backbone(img_size: int, weights):
    return tf.keras.applications.MobileNetV2(
        input_shape=(img_size, img_size, 3), include_top=False, weights=weights
    )


def build_preprocessing():
    # Same scaling as backend/src/ml/predict.py (mobilenet_v2.preprocess_input): [0, 255] -> [-1, 1]
    return layers.Rescaling(scale=1.0 / 127.5, offset=-1.0, name="mobilenetv2_preprocess")
