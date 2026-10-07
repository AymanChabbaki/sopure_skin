# Architecture Documentation

## Overview
This architecture processes WooCommerce export data (`wc-product-export-29-9-2026-1790676029313.csv`), extracts all high-quality product media assets hosted on `sopureskin.com`, downloads them into a structured local directory, and maps the products into clean database seed formats for future migration.

## Data Pipeline & System Components

### 1. Extractor & Downloader (`download_images.py`)
- **CSV Reader**: Uses Python's `csv.DictReader` with `utf-8-sig` encoding to handle multi-line strings, French accent marks, and HTML product descriptions cleanly.
- **HTTP Downloader**: Performs sequential HTTP GET requests with custom browser headers (`User-Agent`) to retrieve binary image streams from remote URLs without compression or byte loss.
- **Directory Structure**:
  ```text
  downloaded_images/
  ├── 305/
  │   ├── 01_main.jpg
  │   ├── 02_gallery_1.jpg
  │   └── 03_gallery_2.jpg
  ├── 307/
  │   ├── 01_main.jpg
  │   └── 02_gallery_1.jpg
  ...
  ```
- **Error Handling**: Implements a 3-attempt retry loop per image. Failed requests are recorded in `download_errors.json` without interrupting the processing of other products.

### 2. Output Data Stores
- **`seed_products.json`**: Standardized JSON array containing normalized product objects (ID, Name, SKU, Prices, Categories, Tags, Short/Long Descriptions, Main Image Local Path, Gallery Local Paths). Ready for direct ingestion into SQL (Prisma, TypeORM, Drizzle) or NoSQL (MongoDB) database seeders.
- **`wc-products-local.csv`**: Updated WooCommerce CSV format where remote `https://sopureskin.com/...` image URLs are replaced with local file system paths (`downloaded_images/{product_id}/...`).
- **`download_report.json`**: Metrics tracking total products processed, images attempted, images succeeded, download failures, and total megabytes downloaded.

### 3. Automated Test Suite (`testing/test_download.py` & `testing/run_all_test_scripts.sh`)
- Verifies that `seed_products.json` and `wc-products-local.csv` are generated correctly.
- Asserts that all downloaded image files referenced in product seed records exist on disk and possess non-zero file sizes.
- Validates row alignment between the original WooCommerce CSV and the local updated CSV.

## Security & Secrets Management
- No hardcoded API keys, database credentials, or secret tokens are present in scripts or data exports.
- Configuration settings (e.g., user-agent string, output paths) use standard environment-neutral variables.
