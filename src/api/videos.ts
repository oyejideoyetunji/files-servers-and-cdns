import { respondWithJSON } from "./json";
import { type ApiConfig } from "../config";
import { type BunRequest } from "bun";
import { BadRequestError, UserForbiddenError } from "./errors";
import { getBearerToken, validateJWT } from "../auth";
import { getVideo, updateVideo } from "../db/videos";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { dbVideoToSignedVideo, getVideoOrientation, processVideoForFastStart } from "../helpers";

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  const videoMeta = getVideo(cfg.db, videoId);
  if (videoMeta?.userID !== userID) {
    throw new UserForbiddenError("Forbidden Action");
  }

  console.log("uploading video", videoId, "by user", userID);

  const formData = await req.formData();
  const video = formData.get("video");

  if (!(video instanceof File)) {
    throw new BadRequestError("Invalid or currupted file");
  }

  if (video.size > 10 * 1024 * 1024 * 1024) {
    throw new BadRequestError("File is too large");
  }

  if (video.type !== "video/mp4") {
    throw new BadRequestError("Invalid file type");
  }

  const rawFile = await video.arrayBuffer();
  const id = randomBytes(32).toString("base64url");

  const localFilePath = path.join(cfg.assetsRoot, `${id}.mp4`);
  await Bun.write(localFilePath, rawFile);
  const orientation = await getVideoOrientation(localFilePath);

  const processedFilePath = await processVideoForFastStart(localFilePath);

  const videoS3Key = `${orientation}/${videoId}.mp4`;
  const s3File = cfg.s3Client.file(videoS3Key, { type: video.type });
  const tempFile = Bun.file(processedFilePath);
  await Bun.write(s3File, tempFile)

  // const videoURL = `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${videoS3Key}`

  updateVideo(cfg.db, { ...videoMeta, videoURL: videoS3Key });

  const updatedVideo = getVideo(cfg.db, videoId);

  await Bun.file(localFilePath).delete();
  await Bun.file(processedFilePath).delete();

  if (!updatedVideo) {
    throw new Error("an unexpected error occurred");
  }

  return respondWithJSON(200, dbVideoToSignedVideo(cfg, dbVideoToSignedVideo(cfg, updatedVideo)));
}
