import {
  del,
  getDownloadUrl,
  head,
  issueSignedToken,
  presignUrl,
  put,
} from "@vercel/blob";

type ErrorCode =
  | "STORAGE_NOT_PROVISIONED"
  | "STORAGE_INVALID_INPUT"
  | "STORAGE_FORBIDDEN"
  | "STORAGE_UPSTREAM_ERROR";
export class StorageError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  constructor(code: ErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.retryable = retryable;
  }
}

function configured() {
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new StorageError(
      "STORAGE_NOT_PROVISIONED",
      "文件存储尚未连接到当前环境。"
    );
  }
}

export function validateStorageKey(key: string) {
  if (
    !key ||
    key.length > 512 ||
    key.startsWith("/") ||
    key.includes("//") ||
    key.includes("\\") ||
    key.split("/").includes("..") ||
    Array.from(key).some(char => char.charCodeAt(0) < 32) ||
    /^[a-z]+:/i.test(key)
  ) {
    throw new StorageError("STORAGE_INVALID_INPUT", "文件引用无效。");
  }
  return key;
}

const readUrls = new Map<string, { url: string; expiresAt: number }>();
export const storage = {
  async uploadFile(input: {
    fileContent: Uint8Array | string;
    fileName: string;
    contentType?: string;
  }) {
    configured();
    validateStorageKey(input.fileName);
    const bytes =
      typeof input.fileContent === "string"
        ? new TextEncoder().encode(input.fileContent)
        : new Uint8Array(input.fileContent);
    const blob = await put(input.fileName, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: true,
      allowOverwrite: false,
      contentType: input.contentType,
    });
    return {
      key: blob.pathname,
      size: bytes.byteLength,
      contentType: blob.contentType,
      etag: blob.etag,
    };
  },

  async getPresignedUrl(input: { key: string; download?: boolean }) {
    configured();
    validateStorageKey(input.key);
    const now = Date.now();
    let cached = readUrls.get(input.key);
    if (!cached || cached.expiresAt < now + 60000) {
      const expiresAt = now + 10 * 60 * 1000;
      const token = await issueSignedToken({
        pathname: input.key,
        operations: ["get"],
        validUntil: expiresAt,
      });
      const result = await presignUrl(token, {
        access: "private",
        operation: "get",
        pathname: input.key,
        validUntil: expiresAt,
      });
      cached = { url: result.presignedUrl, expiresAt };
      if (readUrls.size >= 100) readUrls.clear();
      readUrls.set(input.key, cached);
    }
    return { url: input.download ? getDownloadUrl(cached.url) : cached.url };
  },

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    maximumSizeInBytes: number;
  }) {
    configured();
    validateStorageKey(input.key);
    const token = await issueSignedToken({
      pathname: input.key,
      operations: ["put"],
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: input.maximumSizeInBytes,
      validUntil: Date.now() + 5 * 60 * 1000,
    });
    const result = await presignUrl(token, {
      access: "private",
      operation: "put",
      pathname: input.key,
      addRandomSuffix: false,
      allowOverwrite: false,
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: input.maximumSizeInBytes,
    });
    // Only the constrained operation URL leaves the server, never signing material.
    return { url: result.presignedUrl };
  },

  async headFile(key: string) {
    configured();
    validateStorageKey(key);
    return head(key);
  },
  async deleteFile(input: { fileKey: string }) {
    configured();
    validateStorageKey(input.fileKey);
    await del(input.fileKey);
    readUrls.delete(input.fileKey);
  },
};
