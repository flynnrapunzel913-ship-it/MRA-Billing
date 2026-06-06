import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function readR2Config(): R2Config {
  if (cachedConfig) return cachedConfig;

  const missing = R2_ENV_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
  }

  cachedConfig = {
    accountId: process.env.R2_ACCOUNT_ID!.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    bucket: process.env.R2_BUCKET!.trim(),
  };

  return cachedConfig;
}

/** Cloudflare R2 bucket name from `R2_BUCKET`. */
export function getR2Bucket(): string {
  return readR2Config().bucket;
}

/**
 * Configured S3-compatible client for Cloudflare R2.
 * Lazily initialized on first access so builds without R2 env still compile.
 */
export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const config = readR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

/** @deprecated Prefer getR2Client() — lazy singleton alias. */
export const r2Client = new Proxy({} as S3Client, {
  get(_target, prop, receiver) {
    const client = getR2Client();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

function normalizeObjectKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid R2 object key");
  }
  return normalized;
}

export async function uploadObject(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const objectKey = normalizeObjectKey(key);
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const objectKey = normalizeObjectKey(key);
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: objectKey,
    })
  );

  if (!response.Body) {
    throw new Error(`R2 object not found or empty: ${objectKey}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteObject(key: string): Promise<void> {
  const objectKey = normalizeObjectKey(key);
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: objectKey,
    })
  );
}

export async function objectExists(key: string): Promise<boolean> {
  const objectKey = normalizeObjectKey(key);
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getR2Bucket(),
        Key: objectKey,
      })
    );
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number }; name?: string }).$metadata
      ?.httpStatusCode;
    const name = (error as { name?: string }).name;
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

export async function copyObject(sourceKey: string, targetKey: string): Promise<void> {
  const source = normalizeObjectKey(sourceKey);
  const target = normalizeObjectKey(targetKey);
  const bucket = getR2Bucket();

  await getR2Client().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${source}`,
      Key: target,
    })
  );
}
