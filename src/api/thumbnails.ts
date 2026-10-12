import type { BunRequest } from "bun";
import path from "node:path";
import { getBearerToken, validateJWT } from "../auth";
import type { ApiConfig } from "../config";
import { getVideo, updateVideo } from "../db/videos";
import { BadRequestError, UserForbiddenError } from "./errors";
import { respondWithJSON } from "./json";
import { randomBytes } from "node:crypto";

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  const video = getVideo(cfg.db, videoId);
  if (video?.userID !== userID) {
    throw new UserForbiddenError("Forbidden Action");
  }

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  // TODO: implement the upload here
  const formData = await req.formData();
  const thumbnail = formData.get("thumbnail");

  if (!(thumbnail instanceof File)) {
    throw new BadRequestError("Invalid or currupted file");
  }

  if (thumbnail.type !== "image/jpeg" && thumbnail.type !== "image/png") {
    throw new BadRequestError("Invalid file type");
  }

  const fileExtension = getFileextensionFromMediaType(thumbnail.type);

  if (!fileExtension) {
    throw new BadRequestError("Invalid file type");
  }

  if (thumbnail.size > 10 * 1024 * 1024) {
    throw new BadRequestError("File is too large");
  }

  const rawFile = await thumbnail.arrayBuffer();

  const id = randomBytes(32).toString("base64url");

  const localFilePath = path.join(cfg.assetsRoot, `${id}.${fileExtension}`);
  const thumbnailURL = `http://localhost:8091/${localFilePath}`;
  await Bun.write(localFilePath, rawFile);

  updateVideo(cfg.db, { ...video, thumbnailURL });

  const updatedVideo = getVideo(cfg.db, videoId);

  return respondWithJSON(200, updatedVideo);
}

function getFileextensionFromMediaType(mediaType: string) {
  const typeParts = mediaType.split("/");

  if (typeParts.length !== 2) return;

  return typeParts[1];
}
