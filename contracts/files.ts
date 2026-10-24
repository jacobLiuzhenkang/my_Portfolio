export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const;
export type UploadPurpose = "resume" | "project" | "file";
