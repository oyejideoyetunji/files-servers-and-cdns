
const landscapeFraction = Math.floor(16/9);
const potraitFraction = Math.floor(9/16);

export async function getVideoOrientation(filePath: string) {
  const process = Bun.spawn(["ffprobe",  "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", filePath]);

  const stdoutText = await new Response(process.stdout).text();

  const exited = await process.exited

  if (exited !== 0) {
    throw new Error("Something unexpected happened!");
  }

  const videoData = JSON.parse(stdoutText);
  const videoDimension = videoData?.streams?.[0];

  if (
    typeof videoDimension !== "object" || 
    typeof videoDimension.width !== "number" ||
    typeof videoDimension.height !== "number"
  ) {
    throw new Error("Something unexpected happened!");
  }

  const { width, height } = videoDimension;
  const fraction = Math.floor(width/height);

  if (fraction === landscapeFraction) return "landscape";

  if (fraction === potraitFraction) return "portrait";

  return "other";
}
