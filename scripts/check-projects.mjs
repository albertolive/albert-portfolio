import assert from "node:assert/strict";
import Matter from "matter-js";
import { parseGitHubContributions } from "../app/projects/_components/github-contributions.ts";

const engine = Matter.Engine.create();
engine.gravity.y = 0;
const thrown = Matter.Bodies.circle(80, 100, 20, { restitution: 1, frictionAir: 0 });
const target = Matter.Bodies.circle(155, 100, 20, { restitution: 1, frictionAir: 0 });
Matter.Body.setVelocity(thrown, { x: 12, y: 0 });
Matter.Composite.add(engine.world, [thrown, target]);
for (let step = 0; step < 20; step += 1) Matter.Engine.update(engine, 1000 / 60);
assert.ok(target.velocity.x > 4, "a thrown body transfers velocity through collision");

const release = Matter.Bodies.circle(0, 0, 10);
Matter.Body.setVelocity(release, { x: 9, y: -3 });
Matter.Composite.add(engine.world, release);
Matter.Engine.update(engine, 1000 / 60);
assert.ok(release.position.x > 0, "release velocity preserves forward momentum");

const calendar = parseGitHubContributions(`
  <h2>3,995 contributions in the last year</h2>
  <table><tbody><tr>
    <td data-date="2026-09-08" data-level="2" id="day-two"></td>
    <td data-date="2026-09-07" data-level="0" id="day-one"></td>
    <td data-date="2026-09-08" data-level="4" id="duplicate"></td>
    <td data-date="bad" data-level="8" id="bad"></td>
    <td data-date="2026-09-09" data-level="1" id="missing"></td>
  </tr></tbody></table>
  <tool-tip for="day-one">No contributions on September 7th.</tool-tip>
  <tool-tip for="day-two"><strong>1,234 contributions</strong> on September 8th.</tool-tip>
`);
assert.equal(calendar.total, 3995);
assert.deepEqual(calendar.days.map(({ date }) => date), ["2026-09-07", "2026-09-08", "2026-09-09"]);
assert.deepEqual(calendar.days.map(({ count }) => count), [0, 1234, null]);
assert.deepEqual(calendar.days.map(({ level }) => level), [0, 2, 1]);
assert.deepEqual(parseGitHubContributions("<html>login</html>"), { days: [], total: null });

console.log("projects checks: collision transfer, release momentum, and contribution HTML parsing passed");
