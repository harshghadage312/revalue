# AI Module 3: MobileNetV2 Phone Visual-Condition Classification

## Overview
This service provides an image classification pipeline using MobileNetV2 transfer learning to categorize smartphone physical condition into 4 standard marketplace classes:
1. `excellent` (Mint, no visible scratches or dings)
2. `good` (Minor signs of wear, light hairline marks)
3. `bad` (Noticeable dents, heavy scratches, scuffs)
4. `defective` (Cracked screen, broken glass, visual structural damage)

## Preprocessing Specification
- **Input Dimensions**: 224 x 224 x 3 (RGB)
- **Normalization**: Pixel values mapped to `[-1.0, 1.0]` via `(x / 127.5) - 1.0`
- **Supported Formats**: JPEG, PNG, WebP (strictly validated)
- **Size Limit**: 5 MB

## Operational Status & Non-Fabrication Policy
- **Model Checkpoint**: Missing initial dataset weights.
- **Inference Status**: Returns explicit status `is_model_available: false` when weights file `mobilenet_condition.keras` is not in `artifacts/`.
- **Disclaimer**: Output is strictly visual and conveys that external imagery cannot confirm internal battery health, IMEI legitimacy, motherboard health, or authentic components.
