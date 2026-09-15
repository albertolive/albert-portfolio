import assert from "node:assert/strict";
import { coverLevel, floorLevel, parseLevels } from "../lib/video.ts";

const levels = [{ width: 854, height: 480 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }];
assert.equal(coverLevel(levels, 390, 724, 1), 2, "portrait cover needs enough height, not just width");
assert.equal(coverLevel(levels, 600, 300, 1), 0);
assert.equal(coverLevel(levels, 600, 300, 2), 1, "retina scaling uses physical pixels");
assert.equal(coverLevel(levels, 1920, 1080, 2), 2, "use largest available rather than upscaling a low rung");
assert.equal(coverLevel([], 390, 724, 1), -1);
assert.equal(coverLevel([levels[2], levels[0], levels[1]], 600, 300, 2), 2, "resolution selection does not assume bitrate order");
assert.equal(floorLevel(levels, 2), 2, "the hero is pinned to the covering rendition and never steps down");
assert.equal(floorLevel(levels, 2, 1), 1, "one step down is the largest smaller rendition");
assert.equal(floorLevel(levels, 2, 2), 0);
assert.equal(floorLevel(levels, 0, 1), 0, "the lowest rendition cannot step down further");
assert.equal(floorLevel([levels[1], levels[2], levels[0]], 1, 1), 0, "the floor does not assume bitrate order");
assert.equal(floorLevel(levels, -1), -1);
const master = [
  "#EXTM3U",
  "#EXT-X-VERSION:3",
  "#EXT-X-INDEPENDENT-SEGMENTS",
  "#EXT-X-STREAM-INF:BANDWIDTH=1400145,AVERAGE-BANDWIDTH=844137,RESOLUTION=854x480",
  "480/index.m3u8",
  "#EXT-X-STREAM-INF:BANDWIDTH=4145339,AVERAGE-BANDWIDTH=2483559,RESOLUTION=1280x720",
  "720/index.m3u8",
  "#EXT-X-STREAM-INF:BANDWIDTH=10137273,AVERAGE-BANDWIDTH=6171140,RESOLUTION=1920x1080",
  "1080/index.m3u8",
  "",
].join("\n");
const parsed = parseLevels(master, "https://video.example/hls/abc/master.m3u8");
assert.equal(parsed.length, 3);
assert.equal(parsed[0].url, "https://video.example/hls/abc/480/index.m3u8");
assert.deepEqual(parsed.map((level) => [level.width, level.height]), [[854, 480], [1280, 720], [1920, 1080]]);
assert.equal(coverLevel(parsed, 1376, 772, 1), 2, "the native path requests the covering rendition");
assert.equal(parseLevels("#EXTM3U\n#EXT-X-VERSION:3\n", "https://video.example/master.m3u8").length, 0);
console.log("PASS HLS cover-size capping, portrait, retina, oversized, empty, unordered levels, the pinned quality floor, and native ladder parsing");
