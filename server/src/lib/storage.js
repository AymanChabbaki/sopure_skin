import { copyFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { config, r2Enabled } from '../config.js';
import { cfEnv, onWorkers } from './runtime.js';

export const LOCAL_UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

// On Cloudflare Workers the bucket is a native binding (BUCKET); elsewhere R2 is reached through its S3 API
const bucket = () => cfEnv().BUCKET;
const CACHE = 'public, max-age=31536000, immutable';

const s3 = r2Enabled && !onWorkers
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
  if (bucket()) {
    await bucket().put(key, body, { httpMetadata: { contentType, cacheControl: CACHE } });
    return `${config.r2.publicUrl}/${key}`;
  }
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

/** Server-side copy (no download/upload) to a new key; returns the new public URL. */
export async function copyObject(fromKey, toKey) {
  if (bucket()) {
    const source = await bucket().get(fromKey);
    if (!source) throw new Error(`Object not found: ${fromKey}`);
    await bucket().put(toKey, source.body, { httpMetadata: { contentType: 'image/webp', cacheControl: CACHE } });
    return `${config.r2.publicUrl}/${toKey}`;
  }
  if (s3) {
    await s3.send(
      new CopyObjectCommand({
        Bucket: config.r2.bucket,
        CopySource: `${config.r2.bucket}/${encodeURIComponent(fromKey)}`,
        Key: toKey,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        MetadataDirective: 'REPLACE',
      }),
    );
    return `${config.r2.publicUrl}/${toKey}`;
  }
  const target = path.join(LOCAL_UPLOAD_DIR, toKey);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(LOCAL_UPLOAD_DIR, fromKey), target);
  return `/uploads/${toKey}`;
}

export async function deleteObject(key) {
  if (!key) return;
  try {
    if (bucket()) await bucket().delete(key);
    else if (s3) await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    else await unlink(path.join(LOCAL_UPLOAD_DIR, key));
  } catch (err) {
    console.warn(`Could not delete object ${key}: ${err.message}`);
  }
}

export const storageDriver = onWorkers || s3 ? 'r2' : 'local';
