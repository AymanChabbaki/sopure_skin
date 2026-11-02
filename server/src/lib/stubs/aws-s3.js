// Cloudflare Workers build only (wrangler.jsonc "alias"): R2 is used through its native binding (BUCKET),
// so the S3 SDK is left out of the bundle.
class Unavailable {
  constructor() {
    throw new Error('S3 client not available on Workers: use the BUCKET binding');
  }
}
export const S3Client = Unavailable;
export const PutObjectCommand = Unavailable;
export const DeleteObjectCommand = Unavailable;
export const CopyObjectCommand = Unavailable;
