#!/usr/bin/env python3
"""Prepare a deterministic 70/15/15 split without placing one leaf in multiple splits."""
from __future__ import annotations

import hashlib
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "backend" / "data" / "plantvillage_15" / "raw"
OUTPUT = ROOT / "backend" / "data" / "images_15"
SEED = 42
RATIOS = {"train": 0.70, "validation": 0.15, "test": 0.15}


def leaf_group(path: Path) -> str:
    stem = path.stem
    # PlantVillage filenames use <image-id>___<leaf-id>. Images sharing leaf-id
    # belong to the same physical leaf and must stay in one split.
    return stem.split("___", 1)[1].lower() if "___" in stem else stem.lower()


def target_counts(total: int) -> dict[str, int]:
    exact = {name: total * ratio for name, ratio in RATIOS.items()}
    counts = {name: int(value) for name, value in exact.items()}
    remainder = total - sum(counts.values())
    order = sorted(RATIOS, key=lambda name: exact[name] - counts[name], reverse=True)
    for name in order[:remainder]:
        counts[name] += 1
    return counts


def assign_groups(groups: dict[str, list[Path]], total: int, rng: random.Random) -> dict[str, str]:
    targets = target_counts(total)
    assigned = {name: 0 for name in RATIOS}
    result = {}
    items = list(groups.items())
    rng.shuffle(items)
    # Place larger groups first so the final split sizes stay close to target.
    items.sort(key=lambda item: len(item[1]), reverse=True)
    for group, paths in items:
        choices = sorted(
            RATIOS,
            key=lambda split: (targets[split] - assigned[split], -assigned[split]),
            reverse=True,
        )
        split = choices[0]
        result[group] = split
        assigned[split] += len(paths)
    return result


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source dataset not found: {SOURCE}")
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)

    by_class: dict[str, list[Path]] = defaultdict(list)
    for path in sorted(SOURCE.glob("*/*/*")):
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
            by_class[path.parent.name].append(path)
    if len(by_class) != 15:
        raise RuntimeError(f"Expected 15 classes, found {len(by_class)}: {sorted(by_class)}")

    rng = random.Random(SEED)
    manifest = {
        "seed": SEED,
        "ratios": RATIOS,
        "source": str(SOURCE.relative_to(ROOT)),
        "leaf_group_rule": "filename suffix after the first ___, lowercased",
        "classes": {},
        "images": [],
    }
    for class_name in sorted(by_class):
        groups: dict[str, list[Path]] = defaultdict(list)
        for path in by_class[class_name]:
            groups[leaf_group(path)].append(path)
        assignment = assign_groups(groups, len(by_class[class_name]), rng)
        counts = {split: 0 for split in RATIOS}
        for group_name, paths in groups.items():
            split = assignment[group_name]
            counts[split] += len(paths)
            destination_dir = OUTPUT / split / class_name
            destination_dir.mkdir(parents=True, exist_ok=True)
            for source in sorted(paths):
                digest = hashlib.sha256(source.read_bytes()).hexdigest()
                destination = destination_dir / source.name
                # Hard links avoid duplicating the 2.5 GB source subset.
                destination.hardlink_to(source)
                manifest["images"].append({
                    "split": split,
                    "class": class_name,
                    "file": str(destination.relative_to(OUTPUT)),
                    "source": str(source.relative_to(ROOT)),
                    "leaf_group": group_name,
                    "sha256": digest,
                })
        manifest["classes"][class_name] = {
            "total": sum(counts.values()),
            **counts,
            "leaf_groups": len(groups),
        }

    manifest["totals"] = {
        split: sum(info[split] for info in manifest["classes"].values())
        for split in RATIOS
    }
    manifest["total_images"] = sum(manifest["totals"].values())
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"classes": len(by_class), "totals": manifest["totals"], "output": str(OUTPUT)}, indent=2))
    for class_name, info in manifest["classes"].items():
        print(f"{class_name}: train={info['train']} validation={info['validation']} test={info['test']} groups={info['leaf_groups']}")


if __name__ == "__main__":
    main()
