import type { R2Bucket } from "@cloudflare/workers-types";

export async function uploadImage(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType = "image/png"
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: { contentType },
  });
}

export async function getSignedUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;

  // For public R2 bucket, return direct URL
  // For private, you'd need a signed URL implementation
  // Cloudflare R2 supports public access via custom domain
  return `/r2/${key}`;
}
