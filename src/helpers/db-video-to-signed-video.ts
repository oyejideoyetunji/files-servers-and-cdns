import type { ApiConfig } from "../config";
import type { Video } from "../db/videos";
import { generatePresignedUrl } from "./generate-presigned-url";

export function dbVideoToSignedVideo(cfg: ApiConfig, video: Video) {
    if (video?.videoURL) {
        const presignedUrl = generatePresignedUrl(cfg, video.videoURL, 3600*24 );
        video.videoURL = presignedUrl;   
    }

    return video;
}
