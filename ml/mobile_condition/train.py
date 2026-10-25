import os
import sys
import json
import hashlib
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any

import numpy as np
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

# Set reproducible random seeds
np.random.seed(42)

CANONICAL_CLASSES = ["excellent", "good", "bad", "defective"]
CLASS_TO_INDEX = {
    "excellent": 0,
    "good": 1,
    "bad": 2,
    "defective": 3,
    "defeactive": 3,  # Map common spelling variation to canonical defective
}
INDEX_TO_CLASS = {
    0: "excellent",
    1: "good",
    2: "bad",
    3: "defective",
}


def load_and_preprocess_image(path: str) -> np.ndarray:
    """Loads an image with PIL, converts to RGB (handling transparency), resizes to 224x224, and normalizes to [-1, 1]."""
    with Image.open(path) as img:
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img_rgb = bg
        else:
            img_rgb = img.convert("RGB")
        img_resized = img_rgb.resize((224, 224), Image.Resampling.BILINEAR)
        arr = np.array(img_resized, dtype=np.float32)
        arr = (arr / 127.5) - 1.0
        return arr


def scan_and_clean_dataset(data_dir: str) -> Tuple[List[str], List[int], Dict[str, Any]]:
    """
    Scans dataset directories, maps folder names to canonical classes,
    deduplicates identical files (SHA256), and removes cross-class duplicate contamination.
    """
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Dataset directory '{data_dir}' not found.")

    subdirs = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
    print(f"Scanning dataset folders at: {data_dir}")
    print(f"Found subdirectories: {subdirs}")

    raw_file_count = 0
    scanned_per_class: Dict[str, int] = {}
    seen_hashes: Dict[str, Tuple[int, str]] = {}
    internal_duplicates: List[Dict[str, str]] = []
    cross_class_conflicts: List[Dict[str, Any]] = []
    conflict_hashes = set()

    for d in sorted(subdirs):
        d_lower = d.lower()
        if d_lower not in CLASS_TO_INDEX:
            print(f"Skipping directory '{d}' (not in target class mapping).")
            continue

        class_idx = CLASS_TO_INDEX[d_lower]
        canonical_name = INDEX_TO_CLASS[class_idx]
        cdir = os.path.join(data_dir, d)
        files = [f for f in os.listdir(cdir) if os.path.isfile(os.path.join(cdir, f))]
        scanned_per_class[canonical_name] = len(files)
        raw_file_count += len(files)

        for f in files:
            fpath = os.path.join(cdir, f)
            try:
                with open(fpath, "rb") as fp:
                    h = hashlib.sha256(fp.read()).hexdigest()
            except Exception as e:
                print(f"Warning: could not read {fpath}: {e}")
                continue

            if h in seen_hashes:
                prev_class_idx, prev_path = seen_hashes[h]
                if prev_class_idx != class_idx:
                    conflict_hashes.add(h)
                    cross_class_conflicts.append({
                        "hash": h,
                        "file_a": prev_path,
                        "class_a": INDEX_TO_CLASS[prev_class_idx],
                        "file_b": fpath,
                        "class_b": canonical_name,
                    })
                else:
                    internal_duplicates.append({
                        "hash": h,
                        "original": prev_path,
                        "duplicate": fpath,
                        "class": canonical_name,
                    })
            else:
                seen_hashes[h] = (class_idx, fpath)

    # Filter out duplicate and cross-class conflicting samples
    clean_filepaths: List[str] = []
    clean_labels: List[int] = []

    for h, (class_idx, fpath) in seen_hashes.items():
        if h in conflict_hashes:
            continue
        clean_filepaths.append(fpath)
        clean_labels.append(class_idx)

    clean_per_class: Dict[str, int] = {
        name: sum(1 for l in clean_labels if l == idx)
        for idx, name in INDEX_TO_CLASS.items()
    }

    audit_summary = {
        "raw_total_files": raw_file_count,
        "scanned_per_class": scanned_per_class,
        "internal_duplicates_dropped": len(internal_duplicates),
        "cross_class_conflicts_dropped": len(conflict_hashes),
        "clean_total_files": len(clean_filepaths),
        "clean_per_class": clean_per_class,
        "internal_duplicates_detail": internal_duplicates,
        "cross_class_conflicts_detail": cross_class_conflicts,
    }

    print(f"Dataset audit complete:")
    print(f"  Raw files: {raw_file_count}")
    print(f"  Internal duplicates dropped: {len(internal_duplicates)}")
    print(f"  Cross-class conflicts dropped: {len(conflict_hashes)}")
    print(f"  Clean unique files for training/evaluation: {len(clean_filepaths)}")
    print(f"  Clean per-class distribution: {clean_per_class}")

    return clean_filepaths, clean_labels, audit_summary


def build_mobilenet_classifier(num_classes: int = 4):
    """
    Constructs MobileNetV2 with ImageNet pretrained base and custom classification head.
    Assumes inputs are normalized to [-1, 1].
    """
    import tensorflow as tf
    from tensorflow.keras import layers, models

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(224, 224, 3), name="input_image")
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = layers.Dense(128, activation="relu", name="dense_features")(x)
    x = layers.Dropout(0.3, name="dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="condition_output")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name="ReValue_MobileNetV2_Condition")
    return model, base_model


def train_and_evaluate(
    data_dir: str,
    artifact_dir: str,
    report_dir: str,
    epochs_head: int = 10,
    epochs_fine: int = 8,
    batch_size: int = 16,
    lr_head: float = 1e-3,
    lr_fine: float = 1e-5,
):
    import tensorflow as tf
    tf.random.set_seed(42)

    os.makedirs(artifact_dir, exist_ok=True)
    os.makedirs(report_dir, exist_ok=True)

    # 1. Dataset Scan & Deduplication
    clean_paths, clean_labels, audit_info = scan_and_clean_dataset(data_dir)

    # 2. Stratified Train / Validation / Test Split (70% / 15% / 15%)
    # Total samples: ~277 -> test: 42, val: 42, train: 193
    n_samples = len(clean_labels)
    test_size = max(4, int(round(n_samples * 0.15)))
    val_size = max(4, int(round(n_samples * 0.15)))

    paths_temp, paths_test, y_temp, y_test = train_test_split(
        clean_paths,
        clean_labels,
        test_size=test_size,
        stratify=clean_labels,
        random_state=42,
    )

    paths_train, paths_val, y_train, y_val = train_test_split(
        paths_temp,
        y_temp,
        test_size=val_size,
        stratify=y_temp,
        random_state=42,
    )

    print(f"\nStratified split summary:")
    print(f"  Train:      {len(paths_train)} samples")
    print(f"  Validation: {len(paths_val)} samples")
    print(f"  Test:       {len(paths_test)} samples (held-out independent test set)")

    # 3. Load Images into Preprocessed Arrays
    print("\nLoading and preprocessing images into memory...")
    X_train = np.array([load_and_preprocess_image(p) for p in paths_train], dtype=np.float32)
    y_train = np.array(y_train, dtype=np.int32)

    X_val = np.array([load_and_preprocess_image(p) for p in paths_val], dtype=np.float32)
    y_val = np.array(y_val, dtype=np.int32)

    X_test = np.array([load_and_preprocess_image(p) for p in paths_test], dtype=np.float32)
    y_test = np.array(y_test, dtype=np.int32)

    print(f"  X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"  X_val shape:   {X_val.shape}, y_val shape:   {y_val.shape}")
    print(f"  X_test shape:  {X_test.shape}, y_test shape:  {y_test.shape}")

    # 4. TensorFlow Datasets with Augmentation for Training Only
    augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.06),
        tf.keras.layers.RandomZoom(0.06),
        tf.keras.layers.RandomContrast(0.08),
    ], name="data_augmentation")

    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train))
    train_ds = train_ds.shuffle(buffer_size=len(X_train), seed=42)
    train_ds = train_ds.batch(batch_size)
    train_ds = train_ds.map(lambda x, y: (augmentation(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)

    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val)).batch(batch_size).prefetch(tf.data.AUTOTUNE)

    # 5. Build Model
    print("\nBuilding MobileNetV2 architecture with pretrained ImageNet weights...")
    model, base_model = build_mobilenet_classifier(num_classes=4)

    # Phase 1: Train Head
    print(f"\n--- Phase 1: Training Classification Head ({epochs_head} epochs, base frozen, lr={lr_head}) ---")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr_head),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    history_head = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_head,
        verbose=1,
    )

    # Phase 2: Fine-Tuning Top Layers
    print(f"\n--- Phase 2: Fine-Tuning Top Layers ({epochs_fine} epochs, top 20 layers unfrozen, lr={lr_fine}) ---")
    base_model.trainable = True
    for layer in base_model.layers[:-20]:
        layer.trainable = False
    for layer in base_model.layers[-20:]:
        layer.trainable = True

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr_fine),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=4,
            restore_best_weights=True,
            verbose=1,
        )
    ]

    history_fine = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_fine,
        callbacks=callbacks,
        verbose=1,
    )

    # 6. Evaluation on Held-Out Test Set
    print("\n--- Evaluating Model on Held-Out Test Set (42 independent samples) ---")
    test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
    y_test_probs = model.predict(X_test, verbose=0)
    y_test_pred = np.argmax(y_test_probs, axis=1)

    cm = confusion_matrix(y_test, y_test_pred).tolist()
    clf_report = classification_report(
        y_test,
        y_test_pred,
        target_names=CANONICAL_CLASSES,
        output_dict=True,
        zero_division=0,
    )

    print(f"\nHeld-Out Test Results:")
    print(f"  Test Loss:     {test_loss:.4f}")
    print(f"  Test Accuracy: {test_accuracy * 100:.2f}%\n")
    print("Confusion Matrix (Rows=True, Cols=Predicted):")
    title_col = "True \\ Pred"
    header = f"{title_col:<12} | " + " | ".join([f"{c:<10}" for c in CANONICAL_CLASSES])
    print(header)
    print("-" * len(header))
    for i, row in enumerate(cm):
        row_str = " | ".join([f"{val:<10}" for val in row])
        print(f"{CANONICAL_CLASSES[i]:<12} | {row_str}")

    print("\nPer-Class Classification Metrics:")
    for c in CANONICAL_CLASSES:
        m = clf_report[c]
        print(f"  {c:<10}: Precision={m['precision']:.3f}, Recall={m['recall']:.3f}, F1={m['f1-score']:.3f}, Support={m['support']}")

    macro_f1 = clf_report["macro avg"]["f1-score"]
    weighted_f1 = clf_report["weighted avg"]["f1-score"]
    print(f"  Macro F1:    {macro_f1:.3f}")
    print(f"  Weighted F1: {weighted_f1:.3f}")

    # 7. Save Artifacts
    print("\n--- Saving Artifacts ---")
    keras_path = os.path.join(artifact_dir, "mobilenet_condition.keras")
    h5_path = os.path.join(artifact_dir, "mobilenet_condition.h5")
    labels_art_path = os.path.join(artifact_dir, "labels.json")
    labels_src_path = os.path.join(os.path.dirname(__file__), "labels.json")
    meta_path = os.path.join(artifact_dir, "condition_metadata.json")
    report_path = os.path.join(report_dir, "training_report.json")

    # Labels map: exactly canonical
    labels_map = {str(i): name for i, name in INDEX_TO_CLASS.items()}
    with open(labels_art_path, "w", encoding="utf-8") as f:
        json.dump(labels_map, f, indent=2)
    with open(labels_src_path, "w", encoding="utf-8") as f:
        json.dump(labels_map, f, indent=2)
    print(f"Saved canonical labels mapping: {labels_art_path} & {labels_src_path}")

    # Save models
    try:
        model.save(keras_path)
        print(f"Saved model to: {keras_path} ({os.path.getsize(keras_path) / (1024*1024):.2f} MB)")
    except Exception as e:
        print(f"Warning: Could not save .keras: {e}")

    try:
        model.save(h5_path)
        print(f"Saved model to: {h5_path} ({os.path.getsize(h5_path) / (1024*1024):.2f} MB)")
    except Exception as e:
        print(f"Warning: Could not save .h5: {e}")

    # Save condition metadata
    condition_meta = {
        "model_architecture": "MobileNetV2",
        "input_shape": [224, 224, 3],
        "input_normalization": "[-1.0, 1.0]",
        "num_classes": 4,
        "classes": CANONICAL_CLASSES,
        "labels_mapping": labels_map,
        "dataset_source": data_dir,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "total_images_scanned": audit_info["raw_total_files"],
        "clean_images_count": audit_info["clean_total_files"],
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "test_accuracy": float(test_accuracy),
        "test_loss": float(test_loss),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
        "classification_report": clf_report,
        "confusion_matrix": cm,
        "dataset_notes": (
            "200 of the 280 raw images are synthetic crops from an AI composite collage (50 per class), "
            "complemented by 20 real/web smartphone photos per class. Deduplication removed 1 internal "
            "duplicate in 'Bad' and 1 cross-class conflict between 'Bad' and 'Good'. "
            "Evaluation on the held-out test set reflects performance on this composite/synthetic dataset; "
            "real-world camera photos in unconstrained lighting may encounter distribution shift."
        ),
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(condition_meta, f, indent=2)
    print(f"Saved condition metadata: {meta_path}")

    # Save detailed training report
    training_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "audit": audit_info,
        "split_counts": {
            "train": len(X_train),
            "val": len(X_val),
            "test": len(X_test),
        },
        "phase1_head_history": {
            k: [float(v) for v in vals] for k, vals in history_head.history.items()
        },
        "phase2_fine_history": {
            k: [float(v) for v in vals] for k, vals in history_fine.history.items()
        },
        "test_evaluation": {
            "loss": float(test_loss),
            "accuracy": float(test_accuracy),
            "macro_f1": float(macro_f1),
            "weighted_f1": float(weighted_f1),
            "classification_report": clf_report,
            "confusion_matrix": cm,
        },
        "held_out_test_predictions": [
            {
                "path": paths_test[i],
                "true_label": INDEX_TO_CLASS[y_test[i]],
                "predicted_label": INDEX_TO_CLASS[y_test_pred[i]],
                "confidence": float(np.max(y_test_probs[i])),
                "probabilities": {
                    INDEX_TO_CLASS[c]: float(y_test_probs[i][c])
                    for c in range(4)
                },
            }
            for i in range(len(paths_test))
        ],
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(training_report, f, indent=2)
    print(f"Saved training report: {report_path}")

    print("\n=== Training & Evaluation Complete ===")
    return condition_meta


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ReValue MobileNetV2 Condition Model")
    parser.add_argument(
        "--data",
        default=r"C:\Users\Harshad\Downloads\ReValue_Images_200\ReValue_More_Synthetic_Images",
        help="Path to labeled dataset directory",
    )
    parser.add_argument(
        "--artifacts",
        default=os.path.join(os.path.dirname(__file__), "artifacts"),
        help="Path to save model artifacts",
    )
    parser.add_argument(
        "--reports",
        default=os.path.join(os.path.dirname(__file__), "reports"),
        help="Path to save evaluation reports",
    )
    parser.add_argument("--epochs_head", type=int, default=10, help="Epochs for training classification head")
    parser.add_argument("--epochs_fine", type=int, default=8, help="Epochs for fine-tuning upper layers")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr_head", type=float, default=1e-3, help="Learning rate for head")
    parser.add_argument("--lr_fine", type=float, default=1e-5, help="Learning rate for fine-tuning")

    args = parser.parse_args()

    train_and_evaluate(
        data_dir=args.data,
        artifact_dir=args.artifacts,
        report_dir=args.reports,
        epochs_head=args.epochs_head,
        epochs_fine=args.epochs_fine,
        batch_size=args.batch_size,
        lr_head=args.lr_head,
        lr_fine=args.lr_fine,
    )
