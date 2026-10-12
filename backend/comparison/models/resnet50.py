"""ResNet50 - 50-layer residual network, the heavier classic baseline."""

import tensorflow as tf
from tensorflow.keras import layers

DISPLAY_NAME = "ResNet50"

# Keras ResNet50 ImageNet weights expect BGR channel order with per-channel mean subtraction.
_BGR_MEAN = (103.939, 116.779, 123.68)


@tf.keras.utils.register_keras_serializable(package="cropsentry")
class ResNetCaffePreprocess(layers.Layer):
    """RGB [0, 255] -> BGR mean-centred, identical to resnet50.preprocess_input.

    A registered layer (instead of a Lambda) so a saved model can be reloaded safely.
    """

    def call(self, inputs):
        inputs = tf.cast(inputs, self.compute_dtype)
        bgr = inputs[..., ::-1]
        return bgr - tf.constant(_BGR_MEAN, dtype=bgr.dtype)

    def compute_output_shape(self, input_shape):
        return input_shape


def build_backbone(img_size: int, weights):
    return tf.keras.applications.ResNet50(
        input_shape=(img_size, img_size, 3), include_top=False, weights=weights
    )


def build_preprocessing():
    return ResNetCaffePreprocess(name="resnet50_preprocess")
