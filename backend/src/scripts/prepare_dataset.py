"""Build deterministic, leakage-conscious train/validation/test image folders."""

import argparse
import hashlib
import json
import math
import random
import shutil
import tempfile
from collections import defaultdict
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"
OUTPUT_DIR = DATA_DIR / "images"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
CLASS_NAMES = {
    "alternaria leaf spot": "alternaria_leaf_spot",
    "bacterial blight": "bacterial_blight",
    "curl virus": "curl_virus",
    "fussarium wilt": "fusarium_wilt",
    "fusarium wilt": "fusarium_wilt",
    "healthy": "healthy",
    "healthy leaf": "healthy",
    "verticillium wilt": "verticillium_wilt",
}
SPLIT_RATIOS = {"train": 0.70, "validation": 0.15, "test": 0.15}


def normalized_parts(name):
    return PurePosixPath(name.replace("\\", "/")).parts


def class_for_member(name):
    parts = normalized_parts(name)
    if len(parts) < 3 or any("augment_result" in part.lower() for part in parts):
        return None
    return CLASS_NAMES.get(parts[1].strip().lower())


def original_archives():
    for archive_path in sorted(DATA_DIR.glob("*.zip")):
        with ZipFile(archive_path) as outer:
            nested_names = [
                name for name in outer.namelist()
                if name.lower().endswith(".zip")
                and "augmented_dataset" not in name.lower()
            ]
            if not nested_names:
                raise ValueError(f"No original dataset archive found inside {archive_path.name}")
            for nested_name in nested_names:
                yield archive_path, nested_name


def rounded_split_counts(count):
    exact = {name: count * ratio for name, ratio in SPLIT_RATIOS.items()}
    result = {name: math.floor(value) for name, value in exact.items()}
    remainder = count - sum(result.values())
    order = sorted(SPLIT_RATIOS, key=lambda name: exact[name] - result[name], reverse=True)
    for name in order[:remainder]:
        result[name] += 1
    for name in SPLIT_RATIOS:
        if result[name] == 0:
            donor = max(result, key=result.get)
            result[donor] -= 1
            result[name] = 1
    if min(result.values()) < 1:
        raise ValueError(
            f"A class has only {count} images; at least 3 are required "
            "to place examples in train, validation, and test."
        )
    return result


def copy_member_and_hash(source, destination):
    digest = hashlib.sha256()
    with source, destination.open("wb") as output:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
            output.write(chunk)
    return digest.hexdigest()


def prepare(seed):
    if not DATA_DIR.is_dir():
        raise FileNotFoundError(f"Dataset directory does not exist: {DATA_DIR}")
    if OUTPUT_DIR.exists() and any(OUTPUT_DIR.iterdir()):
        raise FileExistsError(
            f"Refusing to overwrite non-empty dataset output: {OUTPUT_DIR}. "
            "Move or rename that output before preparing a new split."
        )

    stage_dir = Path(tempfile.mkdtemp(prefix=".images-build-", dir=DATA_DIR))
    staging_sources = stage_dir / "_source"
    staging_sources.mkdir()
    samples = defaultdict(list)
    seen_digests = {}
    conflicting_digests = set()
    conflicting_duplicates = []
    same_label_duplicates = 0

    try:
        for outer_path, nested_name in original_archives():
            nested_path = None
            try:
                with ZipFile(outer_path) as outer:
                    with outer.open(nested_name) as source_zip:
                        with tempfile.NamedTemporaryFile(
                            prefix=".nested-dataset-", suffix=".zip", dir=DATA_DIR, delete=False
                        ) as nested_file:
                            nested_path = Path(nested_file.name)
                            shutil.copyfileobj(source_zip, nested_file, length=8 * 1024 * 1024)

                with ZipFile(nested_path) as images_zip:
                    for item in images_zip.infolist():
                        if item.is_dir() or Path(item.filename).suffix.lower() not in IMAGE_EXTENSIONS:
                            continue
                        label = class_for_member(item.filename)
                        if label is None:
                            continue

                        incoming = stage_dir / f"incoming-{len(seen_digests):08d}"
                        with images_zip.open(item) as image_file:
                            digest = copy_member_and_hash(image_file, incoming)
                            if digest in conflicting_digests:
                                incoming.unlink()
                                continue

                            existing_sample = seen_digests.get(digest)
                            if existing_sample:
                                incoming.unlink()
                                if existing_sample["class"] != label:
                                    existing_sample["source_file"].unlink()
                                    samples[existing_sample["class"]].remove(existing_sample)
                                    seen_digests.pop(digest)
                                    conflicting_digests.add(digest)
                                    conflicting_duplicates.append({
                                        "sha256": digest,
                                        "first_label": existing_sample["class"],
                                        "first_source": f"{existing_sample['archive']}:{existing_sample['source_path']}",
                                        "conflicting_label": label,
                                        "conflicting_source": f"{outer_path.name}:{item.filename}",
                                    })
                                else:
                                    same_label_duplicates += 1
                                continue

                            extension = Path(item.filename).suffix.lower()
                            source_path = staging_sources / f"{digest}{extension}"
                            incoming.replace(source_path)
                            sample = {
                                "class": label,
                                "archive": outer_path.name,
                                "source_path": item.filename,
                                "sha256": digest,
                                "source_file": source_path,
                            }
                            seen_digests[digest] = sample
                            samples[label].append(sample)
            finally:
                if nested_path and nested_path.exists():
                    nested_path.unlink()

        if not samples:
            raise ValueError("No supported, labeled original images were found in the dataset archives.")

        rng = random.Random(seed)
        manifest_samples = []
        class_counts = {}
        for label in sorted(samples):
            class_samples = samples[label]
            if len(class_samples) < 3:
                raise ValueError(f"Class '{label}' has only {len(class_samples)} usable images.")
            rng.shuffle(class_samples)
            split_counts = rounded_split_counts(len(class_samples))
            class_counts[label] = {"total": len(class_samples), **split_counts}
            offset = 0
            for split, count in split_counts.items():
                split_dir = stage_dir / split / label
                split_dir.mkdir(parents=True, exist_ok=True)
                for sample in class_samples[offset:offset + count]:
                    source_file = sample["source_file"]
                    filename = f"{sample['sha256'][:16]}{source_file.suffix}"
                    target = split_dir / filename
                    source_file.replace(target)
                    manifest_samples.append({
                        "split": split,
                        "class": label,
                        "file": target.relative_to(stage_dir).as_posix(),
                        "sha256": sample["sha256"],
                        "source_archive": sample["archive"],
                        "source_path": sample["source_path"],
                    })
                offset += count

        shutil.rmtree(staging_sources)
        manifest = {
            "seed": seed,
            "ratios": SPLIT_RATIOS,
            "classes": class_counts,
            "excluded_same_label_duplicate_count": same_label_duplicates,
            "excluded_conflicting_duplicate_count": len(conflicting_duplicates),
            "excluded_conflicting_duplicates": conflicting_duplicates,
            "totals": {
                split: sum(counts[split] for counts in class_counts.values())
                for split in SPLIT_RATIOS
            },
            "images": sorted(manifest_samples, key=lambda item: (item["split"], item["class"], item["file"])),
        }
        (stage_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )

        if OUTPUT_DIR.exists():
            OUTPUT_DIR.rmdir()
        stage_dir.replace(OUTPUT_DIR)
        print(f"Prepared {sum(class_counts[label]['total'] for label in class_counts)} unique original images in {OUTPUT_DIR}")
        print(f"Removed exact same-label duplicates: {same_label_duplicates}")
        print(f"Excluded ambiguous cross-label duplicate images: {len(conflicting_duplicates)}")
        print(f"Split totals: {manifest['totals']}")
        for label, counts in class_counts.items():
            print(f"  {label}: train={counts['train']}, validation={counts['validation']}, test={counts['test']}")
        print(f"Manifest: {OUTPUT_DIR / 'manifest.json'}")
    except Exception:
        if stage_dir.exists():
            shutil.rmtree(stage_dir)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42, help="Deterministic split seed (default: 42)")
    args = parser.parse_args()
    prepare(args.seed)


if __name__ == "__main__":
    main()
