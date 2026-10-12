"""Experiment configuration shared by every model in the comparative study.

Defaults live in ``study_config.json`` so the experiments can be reproduced later.
Command-line flags (see ``add_config_arguments``) override single values for a run.
Relative paths are resolved against the ``backend/`` directory.
"""

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = Path(__file__).resolve().parent / "study_config.json"


@dataclass
class StudyConfig:
    seed: int = 42
    data_dir: str = "data/images"
    img_size: int = 224
    batch_size: int = 32
    epochs: int = 30
    optimizer: str = "adam"
    learning_rate: float = 0.001
    loss: str = "categorical_crossentropy"
    early_stopping_patience: int = 5
    dropout: float = 0.2
    dense_units: int = 256
    use_class_weights: bool = True
    weights: str = "imagenet"  # "imagenet" or "none"
    results_dir: str = "results"
    artifacts_dir: str = "artifacts/comparison"

    def resolve(self, value: str) -> Path:
        path = Path(value)
        return path if path.is_absolute() else BACKEND_DIR / path

    @property
    def data_path(self) -> Path:
        return self.resolve(self.data_dir)

    @property
    def results_path(self) -> Path:
        return self.resolve(self.results_dir)

    @property
    def artifacts_path(self) -> Path:
        return self.resolve(self.artifacts_dir)

    def model_dir(self, model_name: str) -> Path:
        return self.artifacts_path / model_name

    def to_dict(self) -> dict:
        return asdict(self)


def load_config(path: Path = CONFIG_PATH) -> StudyConfig:
    values = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    return StudyConfig(**values)


def add_config_arguments(parser: argparse.ArgumentParser) -> None:
    """Optional per-run overrides of study_config.json."""
    parser.add_argument("--data-dir", help="Folder containing train/validation/test class folders.")
    parser.add_argument("--img-size", type=int, help="Square input size in pixels.")
    parser.add_argument("--batch-size", type=int)
    parser.add_argument("--epochs", type=int)
    parser.add_argument("--learning-rate", type=float)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--weights", choices=["imagenet", "none"])
    parser.add_argument("--results-dir", help="Where metrics, plots and the comparison table go.")
    parser.add_argument("--artifacts-dir", help="Where trained models are stored.")


def config_from_args(args: argparse.Namespace) -> StudyConfig:
    config = load_config()
    for name in (
        "data_dir", "img_size", "batch_size", "epochs",
        "learning_rate", "seed", "weights", "results_dir", "artifacts_dir",
    ):
        value = getattr(args, name, None)
        if value is not None:
            setattr(config, name, value)
    return config
