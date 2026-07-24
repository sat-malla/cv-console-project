def evaluate_hard_rules(telemetry: dict) -> list[str]:
    """
    Pure, deterministic, no model calls. Takes structured telemetry from
    all hot-path views and returns a list of triggered rule names, or [] if none.
    """
    triggered = []

    motion = telemetry.get("motion", {})
    if motion.get("motion_pixel_ratio", 0) > 0.35:
        triggered.append("large_motion_spike")

    yolo = telemetry.get("yolo", {})
    classes_seen = {obj["class"] for obj in yolo.get("detected_objects", [])}
    if "person" in classes_seen:
        triggered.append("person_detected")

    canny = telemetry.get("canny", {})
    if canny.get("edge_density", 0) > 0.5:
        triggered.append("high_edge_density")

    sfm = telemetry.get("sfm", {})
    if sfm.get("avg_motion_magnitude", 0) > 15:
        triggered.append("fast_movement")

    return triggered