#!/usr/bin/env python3
"""Download and extract the 15 CropSentry classes from PlantVillage."""
from __future__ import annotations

import json
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "backend" / "data" / "plantvillage_15"
ARCHIVE = DATA_DIR / "PlantVillage-data.zip"
RAW_DIR = DATA_DIR / "raw"
METADATA_DIR = DATA_DIR / "metadata"

BASE = "https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/"
ARCHIVE_URL = BASE + "data.zip"
SPLIT_URLS = {
    "train": BASE + "splits/color_train.txt",
    "test": BASE + "splits/color_test.txt",
}

CLASS_MAP = {
    "Pepper,_bell___Bacterial_spot": "Pepper__bell___Bacterial_spot",
    "Pepper,_bell___healthy": "Pepper__bell___healthy",
    "Potato___Early_blight": "Potato___Early_blight",
    "Potato___Late_blight": "Potato___Late_blight",
    "Potato___healthy": "Potato___healthy",
    "Tomato___Bacterial_spot": "Tomato_Bacterial_spot",
    "Tomato___Early_blight": "Tomato_Early_blight",
    "Tomato___Late_blight": "Tomato_Late_blight",
    "Tomato___Leaf_Mold": "Tomato_Leaf_Mold",
    "Tomato___Septoria_leaf_spot": "Tomato_Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite": "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato___Target_Spot": "Tomato__Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato___Tomato_mosaic_virus": "Tomato__Tomato_mosaic_virus",
    "Tomato___healthy": "Tomato_healthy",
}


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix(destination.suffix + ".part")
    if destination.exists() and destination.stat().st_size > 0:
        print(f"Using existing {destination} ({destination.stat().st_size / 1e9:.2f} GB)", flush=True)
        return
    print(f"Downloading {url}", flush=True)
    request = urllib.request.Request(url, headers={"User-Agent": "CropSentry dataset preparation"})
    with urllib.request.urlopen(request, timeout=120) as response, temp.open("wb") as handle:
        total = int(response.headers.get("Content-Length") or 0)
        downloaded = 0
        last_report = time.monotonic()
        while True:
            chunk = response.read(8 * 1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
            downloaded += len(chunk)
            now = time.monotonic()
            if now - last_report >= 5:
                percent = f" ({downloaded / total * 100:.1f}%)" if total else ""
                print(f"  downloaded {downloaded / 1e9:.2f} GB{percent}", flush=True)
                last_report = now
    temp.replace(destination)
    print(f"Saved {destination} ({destination.stat().st_size / 1e9:.2f} GB)", flush=True)


def fetch_text(url: str, path: Path) -> list[str]:
    if not path.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "CropSentry dataset preparation"})
        with urllib.request.urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    split_lists = {
        split: fetch_text(url, METADATA_DIR / f"color_{split}.txt")
        for split, url in SPLIT_URLS.items()
    }
    selected = {}
    for split, paths in split_lists.items():
        for path in paths:
            parts = path.split("/")
            if len(parts) < 4 or parts[0] != "raw" or parts[1] != "color":
                continue
            source_class = parts[2]
            if source_class in CLASS_MAP:
                selected[path] = (split, CLASS_MAP[source_class])
    print(f"Selected {len(selected):,} images across {len(CLASS_MAP)} classes", flush=True)

    if not RAW_DIR.exists() or not any(RAW_DIR.iterdir()):
        download(ARCHIVE_URL, ARCHIVE)
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        counts = {split: {label: 0 for label in CLASS_MAP.values()} for split in SPLIT_URLS}
        with zipfile.ZipFile(ARCHIVE) as archive:
            names = set(archive.namelist())
            missing = [path for path in selected if path not in names]
            if missing:
                raise RuntimeError(f"{len(missing)} selected files are missing from the archive; first: {missing[:3]}")
            for index, (source_path, (split, label)) in enumerate(sorted(selected.items()), 1):
                output_dir = RAW_DIR / split / label
                output_dir.mkdir(parents=True, exist_ok=True)
                output_path = output_dir / Path(source_path).name
                with archive.open(source_path) as source, output_path.open("wb") as destination:
                    destination.write(source.read())
                counts[split][label] += 1
                if index % 500 == 0:
                    print(f"  extracted {index:,}/{len(selected):,}", flush=True)
        (METADATA_DIR / "counts.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
        (METADATA_DIR / "class_map.json").write_text(json.dumps(CLASS_MAP, indent=2), encoding="utf-8")
        print("Extraction complete", flush=True)
    else:
        print(f"Using existing extracted data at {RAW_DIR}", flush=True)

    counts = {}
    for split in SPLIT_URLS:
        counts[split] = {
            label: len(list((RAW_DIR / split / label).glob("*")))
            for label in CLASS_MAP.values()
        }
    print(json.dumps(counts, indent=2), flush=True)
    print(f"Metadata: {METADATA_DIR}", flush=True)
    print(f"Raw images: {RAW_DIR}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
