import assert from "node:assert/strict";
import { coverLevel } from "../lib/video.ts";

const levels = [{ width: 854, height: 480 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }];
assert.equal(coverLevel(levels, 390, 724, 1), 2, "portrait cover needs enough height, not just width");
assert.equal(coverLevel(levels, 600, 300, 1), 0);
assert.equal(coverLevel(levels, 600, 300, 2), 1, "retina scaling uses physical pixels");
assert.equal(coverLevel(levels, 1920, 1080, 2), 2, "use largest available rather than upscaling a low rung");
assert.equal(coverLevel([], 390, 724, 1), -1);
assert.equal(coverLevel([levels[2], levels[0], levels[1]], 600, 300, 2), 2, "resolution selection does not assume bitrate order");
console.log("PASS HLS cover-size capping, portrait, retina, oversized, empty, unordered levels");
