import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config, r2Enabled } from '../config.js';

export const LOCAL_UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const s3 = r2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
    })
  : null;

/**
 * Stores a file in Cloudflare R2 (production) or on local disk (development fallback).
 * Returns the public URL.
 */
export async function putObject(key, body, contentType) {
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${config.r2.publicUrl}/${key}`;
  }
  const target = path.join(LOCAL_UPLOAD_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  return `/uploads/${key}`;
}

export async function deleteObject(key) {
  if (!key) return;
  try {
    if (s3) await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    else await unlink(path.join(LOCAL_UPLOAD_DIR, key));
  } catch (err) {
    console.warn(`Could not delete object ${key}: ${err.message}`);
  }
}

export const storageDriver = s3 ? 'r2' : 'local';
