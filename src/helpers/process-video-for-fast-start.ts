export async function processVideoForFastStart(inputFilePath: string) {
  const outPutFilePath = `${inputFilePath}.processed`;
  const process = Bun.spawn([
    "ffmpeg",
    "-i", inputFilePath,
    "-movflags", "faststart",
    "-map_metadata", "0",
    "-codec", "copy",
    "-f", "mp4",
    outPutFilePath,
  ]);

  const exited = await process.exited
  if (exited !== 0) {
    throw new Error("Something unexpected happened!");
  }

  return outPutFilePath;
}

