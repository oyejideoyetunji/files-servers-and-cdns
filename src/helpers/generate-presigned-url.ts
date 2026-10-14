import { type ApiConfig } from "../config";

export function generatePresignedUrl(cfg: ApiConfig, key: string, expiresIn: number) {
    return cfg.s3Client.presign(key, { expiresIn })
}
