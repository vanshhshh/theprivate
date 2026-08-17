import assert from "node:assert/strict";
import test from "node:test";
import { customerPrice, distanceKm, isInternational } from "../lib/pricing";

test("distanceKm returns known domestic airport-pair distance", async () => {
  const distance = await distanceKm("Delhi", "Mumbai");
  assert.ok(distance);
  assert.ok(distance! > 1100 && distance! < 1200);
});

test("isInternational distinguishes domestic and international routes", async () => {
  assert.equal(await isInternational("Delhi", "Mumbai"), false);
  assert.equal(await isInternational("Delhi", "Dubai"), true);
});

test("customerPrice rounds up to the nearest thousand", () => {
  assert.equal(customerPrice(1000001), 1001000);
  assert.equal(customerPrice(1000000), 1000000);
});
