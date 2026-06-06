import argparse
import json
from pathlib import Path

import cv2
import numpy as np


WIDE_LABELS = {"(sealed pack)", "(stack fan)"}


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def sample_times(shot):
    start = float(shot["start"])
    end = float(shot["end"])
    duration = end - start
    margin = min(0.28, duration * 0.18)
    return [
        start + margin,
        (start + end) / 2,
        end - margin,
    ]


def frame_at(capture, time_seconds, width=1280):
    capture.set(cv2.CAP_PROP_POS_MSEC, time_seconds * 1000)
    ok, frame = capture.read()
    if not ok:
        return None
    height = round(frame.shape[0] * width / frame.shape[1])
    return cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)


def card_candidate(frame, expected_center):
    height, width = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 50, 50)
    edges = cv2.Canny(gray, 35, 115)
    edges = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=2)
    edges = cv2.erode(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    expected_x, expected_y = expected_center
    best = None
    best_score = -1
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < width * height * 0.025 or area > width * height * 0.38:
            continue

        rect = cv2.minAreaRect(contour)
        rect_w, rect_h = rect[1]
        short = min(rect_w, rect_h)
        long = max(rect_w, rect_h)
        if long <= 0:
            continue
        aspect = short / long
        if not 0.52 <= aspect <= 0.86:
            continue

        rect_area = rect_w * rect_h
        rectangularity = area / max(rect_area, 1)
        if rectangularity < 0.48:
            continue

        center_x, center_y = rect[0]
        distance = np.hypot(
            (center_x - expected_x) / width,
            (center_y - expected_y) / height,
        )
        proximity = max(0.12, 1 - distance * 1.9)
        score = rect_area * rectangularity * proximity
        if score > best_score:
            best_score = score
            best = {
                "polygon": cv2.boxPoints(rect).astype(np.float32),
                "center": [float(center_x), float(center_y)],
                "area": float(rect_area),
            }
    return best


def overlap_ratio(polygon, target):
    x1, y1, x2, y2 = target
    target_polygon = np.array(
        [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
        dtype=np.float32,
    )
    intersection, _ = cv2.intersectConvexConvex(polygon, target_polygon)
    card_area = cv2.contourArea(polygon)
    return float(intersection / card_area) if card_area else 0.0


def best_center(samples, cut, source_scale):
    guides = cut["referenceGuides"]
    crop_width = cut["cropWidth"] / source_scale
    crop_height = cut["cropHeight"] / source_scale
    half_target_width = (
        (guides["right"] - guides["left"]) * crop_width / 2
    )
    target_y1 = guides["top"] * crop_height
    target_y2 = guides["bottom"] * crop_height

    source_width = 3840 / source_scale
    crop_half = crop_width / 2
    minimum_center = crop_half
    maximum_center = source_width - crop_half
    candidates = np.arange(minimum_center, maximum_center + 0.01, 2.0)

    best = None
    for center in candidates:
        target = (
            center - half_target_width,
            target_y1,
            center + half_target_width,
            target_y2,
        )
        ratios = [overlap_ratio(sample["polygon"], target) for sample in samples]
        minimum = min(ratios)
        average = sum(ratios) / len(ratios)
        score = (minimum, average, -abs(center - cut["defaultCenterX"] / source_scale))
        if best is None or score > best["score"]:
            best = {
                "centerX": center,
                "ratios": ratios,
                "minimum": minimum,
                "average": average,
                "score": score,
            }
    return best


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True)
    parser.add_argument("--cut", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    catalog = load_json(args.catalog)
    cut = load_json(args.cut)
    capture = cv2.VideoCapture(args.source)
    if not capture.isOpened():
        raise RuntimeError(f"Could not open {args.source}")

    source_width = capture.get(cv2.CAP_PROP_FRAME_WIDTH)
    source_scale = 3840 / source_width
    results = []
    for index, shot in enumerate(catalog["shots"], start=1):
        if shot["label"] in WIDE_LABELS:
            results.append(
                {
                    "shot": index,
                    "label": shot["label"],
                    "status": "wide-exempt",
                }
            )
            continue

        expected_center = (
            shot.get("cx", 1920) / source_scale,
            shot.get("cyTrack", shot.get("cy", 1080)) / source_scale,
        )
        samples = []
        for time_seconds in sample_times(shot):
            frame = frame_at(capture, time_seconds)
            candidate = card_candidate(frame, expected_center) if frame is not None else None
            if candidate is not None:
                candidate["time"] = round(time_seconds, 3)
                samples.append(candidate)

        if len(samples) < 2:
            results.append(
                {
                    "shot": index,
                    "label": shot["label"],
                    "status": "needs-visual-review",
                    "detectedSamples": len(samples),
                }
            )
            continue

        optimized = best_center(samples, cut, source_scale)
        results.append(
            {
                "shot": index,
                "label": shot["label"],
                "status": "pass" if optimized["minimum"] >= 0.85 else "below-85",
                "centerX": round(optimized["centerX"] * source_scale),
                "minimumContainment": round(optimized["minimum"], 4),
                "averageContainment": round(optimized["average"], 4),
                "samples": [
                    {
                        "time": sample["time"],
                        "containment": round(ratio, 4),
                    }
                    for sample, ratio in zip(samples, optimized["ratios"])
                ],
            }
        )

    capture.release()
    output = {
        "comment": "Three-sample clean-hold containment audit against the red master-reference target box.",
        "minimumRequired": 0.85,
        "catalog": args.catalog,
        "cut": args.cut,
        "source": args.source,
        "results": results,
    }
    passes = sum(result["status"] == "pass" for result in results)
    misses = [result for result in results if result["status"] == "below-85"]
    reviews = [result for result in results if result["status"] == "needs-visual-review"]
    print(f"Passes: {passes}; below 85%: {len(misses)}; visual review: {len(reviews)}")
    for result in misses:
        print(
            f"MISS {result['shot']:02d} {result['label']}: "
            f"{result['minimumContainment']:.1%} at center {result['centerX']}"
        )
    for result in reviews:
        print(
            f"REVIEW {result['shot']:02d} {result['label']}: "
            f"{result['detectedSamples']} detected samples"
        )
    try:
        Path(args.out).write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        print(f"Report -> {args.out}")
    except PermissionError:
        print(f"Report write blocked -> {args.out}")


if __name__ == "__main__":
    main()
