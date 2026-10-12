"""Model factory: ``get_model("resnet50", num_classes, config)`` returns a compiled Keras model.

Adding a model means adding one file here that exposes ``DISPLAY_NAME``,
``build_backbone`` and ``build_preprocessing`` and registering it below.
"""

from . import efficientnet_b0, efficientnet_b3, mobilenetv2, resnet50
from .resnet50 import ResNetCaffePreprocess  # noqa: F401  (registers the layer for model loading)

# Ordered lightweight -> heavy.
MODEL_MODULES = {
    "mobilenetv2": mobilenetv2,
    "efficientnet_b0": efficientnet_b0,
    "resnet50": resnet50,
    "efficientnet_b3": efficientnet_b3,
}
MODEL_NAMES = list(MODEL_MODULES)
DISPLAY_NAMES = {key: module.DISPLAY_NAME for key, module in MODEL_MODULES.items()}


def get_model(model_name: str, num_classes: int, config):
    from ..utils.model_utils import build_classifier

    key = model_name.lower().replace("-", "_")
    if key not in MODEL_MODULES:
        raise ValueError(f"Unknown model '{model_name}'. Choose one of: {', '.join(MODEL_NAMES)}")
    return build_classifier(MODEL_MODULES[key], num_classes, config)
