# CHANGELOG

## [1.0.0] - 2026-09-29T10:18:30Z

### Added
- Created `download_images.py` to extract product images from WooCommerce export CSV (`wc-product-export-29-9-2026-1790676029313.csv`) and save them locally into structured folders `downloaded_images/{product_id}/`.
- Added image retrieval logic with custom browser `User-Agent` headers, binary writing, retry logic (3 attempts), and zero-loss original resolution preservation.
- Created `seed_products.json` generator containing normalized e-commerce database payloads per product (ID, Name, SKU, Regular Price, Promo Price, Categories, Tags, Descriptions, Main Image Path, Gallery Image Paths).
- Created `wc-products-local.csv` generator updating WooCommerce CSV format to point to local relative image paths.
- Added download summary report generator `download_report.json` and error tracker `download_errors.json`.
- Added test suite `testing/test_download.py` and test runner shell script `testing/run_all_test_scripts.sh`.
- Added architecture documentation `ARCHITECTURE_DOCUMENTATION.md` and Mermaid diagram `ARCHITECTURE_DIAGRAM.mmd`.
- Added test log tracking in `cursor_log.md`.

### Architectural Decisions & Rationale
- **Product ID Directory Isolation (`downloaded_images/{product_id}/`)**: Chosen to isolate media assets by product. This simplifies database seeding (Prisma/ORM or S3 object upload) and prevents filename collisions across different products.
- **Dual Output Data Persistence (JSON + CSV)**: Chosen to support both automated modern DB seeding (via `seed_products.json`) and legacy CSV importing (via `wc-products-local.csv`).
- **Sequential Streaming Downloads with Fallback Logging**: Chosen to prevent rate limiting or HTTP 429 connection drops from `sopureskin.com` while maintaining 100% binary source quality.
