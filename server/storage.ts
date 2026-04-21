// Storage helpers using AWS S3 SDK directly
// Supports S3-compatible storage (AWS, Cloudflare R2, MinIO, etc.)

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 credentials missing: set S3_ACCESS_KEY and S3_SECRET_KEY"
    );
  }

  const config: any = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

function getS3Bucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3 bucket missing: set S3_BUCKET");
  }
  return bucket;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = normalizeKey(relKey);

  const body = typeof data === "string" ? Buffer.from(data) : data;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body as any,
        ContentType: contentType,
      })
    );
  } catch (error: any) {
    console.error("S3 Upload Error:", error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }

  const endpoint = process.env.S3_ENDPOINT;
  let url: string;

  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) {
    url = publicUrl.replace(/\/+$/, "") + "/" + key;
  } else if (endpoint) {
    const base = endpoint.replace(/\/+$/, "");
    // Handle different endpoint formats
    if (base.includes("storageapi.dev")) {
      url = `${base}/${bucket}/${key}`;
    } else {
      url = `${base}/${bucket}/${key}`;
    }
  } else {
    const region = process.env.S3_REGION || "us-east-1";
    url = "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
  }

  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = normalizeKey(relKey);

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return { key, url };
  } catch (error: any) {
    console.error("S3 Get Error:", error);
    return { key, url: "" };
  }
}
