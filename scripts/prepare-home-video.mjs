import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

const help = `Prepare a versioned R2 HLS release locally. Does not upload or deploy.

Usage: node scripts/prepare-home-video.mjs --input VIDEO --out DIRECTORY [--start SECONDS] [--end SECONDS]
Example: node scripts/prepare-home-video.mjs --input ~/Downloads/hero.mp4 --out /tmp/portfolio-hls --start 0.16 --end 305

--start trims from that offset (default 0). --end is an absolute offset in the
source (default: the end of the input). Both are re-encoded frame-accurately and
change the release id, so a different trim never collides with a published one.

Requires ffmpeg with libx264 and ffprobe. Existing complete releases are reused.
Upload the resulting directory under hls/<release-id>/, never over an old release.
`;
const { values } = parseArgs({
  options: {
    input: { type: "string" },
    out: { type: "string" },
    start: { type: "string" },
    end: { type: "string" },
    help: { type: "boolean" },
  },
});
if (values.help) { console.log(help); process.exit(0); }
if (!values.input || !values.out) { console.error(help); process.exit(1); }

const seconds = (name, raw) => {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a number of seconds`);
  return value;
};

const settings = {
  version: 1,
  segmentSeconds: 4,
  renditions: [
    { name: "1080", width: 1920, height: 1080, crf: 19, maxrate: 6000 },
    { name: "720", width: 1280, height: 720, crf: 23, maxrate: 2400 },
    { name: "480", width: 854, height: 480, crf: 27, maxrate: 800 },
  ],
};
const run = (command, args) => execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const probe = path => JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate", "-of", "json", path])).streams[0];
const duration = path => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path]).trim());

let staging;
try {
  const input = resolve(values.input);
  if (!(await stat(input)).isFile()) throw new Error("--input must be a local video file");
  const ffmpeg = run("ffmpeg", ["-version"]).split("\n")[0];
  const source = probe(input);
  if (!source) throw new Error("Input contains no video stream");
  const [numerator, denominator] = source.avg_frame_rate.split("/").map(Number);
  const fps = Math.min(30, numerator / denominator);
  if (!Number.isFinite(fps) || fps <= 0) throw new Error("Input has no usable frame rate");
  const sourceDuration = duration(input);
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) throw new Error("Input has no usable duration");
  const trimStart = seconds("start", values.start) ?? 0;
  const trimEnd = Math.min(seconds("end", values.end) ?? sourceDuration, sourceDuration);
  if (trimStart >= sourceDuration) throw new Error("--start is at or past the end of the input");
  if (trimEnd <= trimStart) throw new Error("--end must be after --start");
  settings.trim = { start: Number(trimStart.toFixed(3)), end: Number(trimEnd.toFixed(3)) };
  // Trim before decoding and bound the output duration: re-encoding keeps the
  // result frame-accurate, and the poster comes from the same first frame.
  const clip = ["-ss", settings.trim.start.toFixed(3), "-i", input, "-t", (settings.trim.end - settings.trim.start).toFixed(3)];
  const hash = createHash("sha256").update(JSON.stringify({ settings, ffmpeg }));
  hash.update(await readFile(new URL(import.meta.url)));
  for await (const chunk of createReadStream(input)) hash.update(chunk);
  const release = hash.digest("hex");
  const urls = {
    src: `https://hero-video-proxy.albertolivecorbella.workers.dev/hls/${release}/master.m3u8`,
    poster: `https://hero-video-proxy.albertolivecorbella.workers.dev/hls/${release}/poster.jpg`,
  };
  const output = resolve(values.out);
  const destination = join(output, release);
  await mkdir(output, { recursive: true });
  try {
    const existing = JSON.parse(await readFile(join(destination, "release.json"), "utf8"));
    if (existing.release !== release || !existing.files?.["master.m3u8"] || !existing.files?.["poster.jpg"]) {
      throw new Error("Invalid existing release metadata. Refusing to overwrite it.");
    }
    for (const [name, expected] of Object.entries(existing.files)) {
      if (!/^(?:master\.m3u8|poster\.jpg|(?:1080|720|480)\/(?:index\.m3u8|seg\d+\.ts))$/.test(name) || typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
        throw new Error("Invalid existing release file entry. Refusing to read it.");
      }
      const actual = createHash("sha256").update(await readFile(join(destination, name))).digest("hex");
      if (actual !== expected) throw new Error(`Existing release is damaged: ${name}. Do not overwrite a published release.`);
    }
    console.log(JSON.stringify({ release, directory: destination, trim: existing.trim ?? settings.trim, variants: existing.variants, ...urls, reused: true }, null, 2));
    process.exit(0);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  staging = await mkdtemp(join(output, ".prepare-"));
  const variants = [];
  const files = [];
  for (const rendition of settings.renditions) {
    const directory = join(staging, rendition.name);
    await mkdir(directory);
    console.error(`Encoding ${rendition.name}p...`);
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", ...clip,
      "-map", "0:v:0", "-an", "-sn", "-dn", "-vf",
      `scale=w='min(${rendition.width},iw)':h='min(${rendition.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,fps=${fps}`,
      "-c:v", "libx264", "-preset", "slow", "-crf", String(rendition.crf),
      "-maxrate", `${rendition.maxrate}k`, "-bufsize", `${rendition.maxrate * 2}k`,
      "-pix_fmt", "yuv420p", "-g", String(Math.round(fps * settings.segmentSeconds)), "-sc_threshold", "0",
      "-force_key_frames", `expr:gte(t,n_forced*${settings.segmentSeconds})`,
      "-f", "hls", "-hls_time", String(settings.segmentSeconds), "-hls_playlist_type", "vod",
      "-hls_flags", "independent_segments", "-hls_segment_filename", join(directory, "seg%d.ts"), join(directory, "index.m3u8")]);
    const playlist = await readFile(join(directory, "index.m3u8"), "utf8");
    const segments = [...playlist.matchAll(/#EXTINF:([\d.]+),\s*\n([^#\n]+)/g)];
    if (!segments.length || !playlist.includes("#EXT-X-ENDLIST")) throw new Error("Incomplete HLS playlist");
    let bytes = 0;
    let duration = 0;
    let bandwidth = 0;
    for (const [, seconds, filename] of segments) {
      const size = (await stat(join(directory, filename))).size;
      bytes += size;
      duration += Number(seconds);
      bandwidth = Math.max(bandwidth, Math.ceil(size * 8 / Number(seconds)));
    }
    const dimensions = probe(join(directory, segments[0][2]));
    const variant = { name: rendition.name, width: dimensions.width, height: dimensions.height, bandwidth, average: Math.ceil(bytes * 8 / duration) };
    const higher = variants.at(-1);
    // Do not publish a lower-resolution rendition that costs almost as much.
    if (higher && (variant.width * variant.height >= higher.width * higher.height || variant.average > higher.average * 0.8 || variant.bandwidth >= higher.bandwidth)) {
      console.error(`Omitting redundant ${rendition.name}p rendition`);
      await rm(directory, { recursive: true });
      continue;
    }
    variants.push(variant);
    files.push(`${rendition.name}/index.m3u8`, ...segments.map(([, , filename]) => `${rendition.name}/${filename}`));
  }
  const master = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS", ...variants.toReversed().flatMap(v => [
    `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},AVERAGE-BANDWIDTH=${v.average},RESOLUTION=${v.width}x${v.height}`,
    `${v.name}/index.m3u8`,
  ]), ""].join("\n");
  await writeFile(join(staging, "master.m3u8"), master);
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", ...clip, "-map", "0:v:0", "-frames:v", "1", "-vf", "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease", "-q:v", "2", join(staging, "poster.jpg")]);
  files.push("master.m3u8", "poster.jpg");
  const checksums = {};
  for (const file of files) checksums[file] = createHash("sha256").update(await readFile(join(staging, file))).digest("hex");
  await writeFile(join(staging, "release.json"), JSON.stringify({ release, trim: settings.trim, variants, files: checksums }, null, 2) + "\n");
  await rename(staging, destination);
  staging = undefined;
  console.log(JSON.stringify({ release, directory: destination, trim: settings.trim, variants, ...urls, reused: false }, null, 2));
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (staging) await rm(staging, { recursive: true, force: true });
}
