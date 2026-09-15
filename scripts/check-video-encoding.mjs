import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "portfolio-encoding-"));
const run = (command, args) => execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
try {
  const input = join(directory, "source.mp4");
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24", "-t", "6", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", input]);
  const args = [fileURLToPath(new URL("./prepare-home-video.mjs", import.meta.url)), "--input", input, "--out", join(directory, "output")];
  const result = JSON.parse(run(process.execPath, args));
  assert.match(result.release, /^[a-f0-9]{64}$/);
  assert.equal(result.variants.length, 3);
  const playlist = await readFile(join(result.directory, "master.m3u8"), "utf8");
  assert.ok(playlist.includes("#EXT-X-INDEPENDENT-SEGMENTS"));
  assert.ok(playlist.indexOf("480/index.m3u8") < playlist.indexOf("1080/index.m3u8"));
  for (const [i, variant] of result.variants.entries()) {
    if (i) {
      assert.ok(variant.average <= result.variants[i - 1].average * 0.8, "lower quality must save at least 20% bandwidth");
      assert.ok(variant.bandwidth < result.variants[i - 1].bandwidth);
    }
    const first = join(result.directory, variant.name, "seg0.ts");
    const metadata = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "format=duration,start_time", "-show_entries", "stream=width,height,codec_name", "-of", "json", first]));
    assert.equal(metadata.streams[0].codec_name, "h264");
    assert.equal(metadata.streams[0].height, variant.height);
    assert.ok(Math.abs(Number(metadata.format.duration) - 4) < 0.05, "aligned four-second segments");
    run("ffmpeg", ["-v", "error", "-nostdin", "-i", first, "-f", "null", "-"]);
  }
  const repeated = JSON.parse(run(process.execPath, args));
  assert.equal(repeated.reused, true);
  assert.equal(repeated.release, result.release);
  await writeFile(join(result.directory, "poster.jpg"), "damaged");
  assert.throws(() => run(process.execPath, args), /Existing release is damaged/, "never overwrite a damaged or previously published release");
  console.log("PASS real FFmpeg encoding, separated bitrates, segment timing/decoding, versioned names, idempotent reuse, corruption detection");
} finally {
  await rm(directory, { recursive: true, force: true });
}
