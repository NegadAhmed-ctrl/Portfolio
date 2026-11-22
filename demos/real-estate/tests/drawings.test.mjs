import test from "node:test";
import assert from "node:assert/strict";
import { UNITS, findUnit } from "../js/units.js";
import { elevation, floorPlan, planRooms, unitFloors } from "../js/drawings.js";
import { similarUnits, unitBody } from "../js/unit-body.js";
import { unitJsonLd, renderCard } from "../js/render.js";
import { CONFIG } from "../js/config.js";

test("drawings are deterministic and valid-looking SVG", () => {
  for (const u of UNITS) {
    const a = elevation(u), b = elevation(u);
    assert.equal(a.svg, b.svg, u.id);
    assert.match(a.svg, /^<svg [^>]*viewBox="0 0 280 \d+"/);
    assert.ok(a.bannerX > 0 && a.bannerX < 100 && a.bannerY > 0 && a.bannerY < 100, u.id);
    assert.ok(!/NaN|undefined/.test(a.svg + floorPlan(u)), u.id);
  }
});

test("the banner hangs higher for higher floors", () => {
  const low = elevation({ ...findUnit("LR-0412"), floor: 2 }).bannerY;
  const high = elevation({ ...findUnit("LR-0412"), floor: 8 }).bannerY;
  assert.ok(high < low);
});

test("a duplex takes two floors, never above the roof", () => {
  assert.deepEqual(unitFloors(findUnit("LR-0909")), [8, 9]);
  assert.deepEqual(unitFloors({ type: "duplex", floor: 9, floors: 9 }), [9, 9]);
});

test("floor plan has the right rooms and adds up to the net area", () => {
  for (const u of UNITS) {
    const { rooms } = planRooms(u);
    const beds = rooms.filter((r) => r.kind === "bed").length;
    const baths = rooms.filter((r) => r.kind === "bath").length;
    if (u.rooms > 1) assert.equal(beds, u.rooms, u.id);
    assert.equal(baths, u.baths, u.id);
    const total = rooms.reduce((s, r) => s + r.m2, 0);
    assert.ok(Math.abs(total - u.size * 0.88) <= rooms.length, `${u.id}: ${total}`);
  }
});

test("similar units: same purpose, never itself", () => {
  for (const u of UNITS) {
    const sim = similarUnits(u);
    assert.ok(sim.every((s) => s.purpose === u.purpose && s.id !== u.id), u.id);
  }
});

test("unit page has escaped content, WhatsApp link and JSON-LD", () => {
  const u = findUnit("SM-0402R");
  const html = unitBody(u);
  assert.ok(html.includes("https://wa.me/" + CONFIG.whatsapp));
  assert.ok(html.includes('name="when"'));
  const ld = unitJsonLd(u, CONFIG.siteUrl, CONFIG);
  assert.equal(ld["@type"], "RealEstateListing");
  assert.equal(ld.offers.priceCurrency, "EGP");
  assert.equal(ld.offers.priceSpecification.unitCode, "MON");
  const evil = renderCard({ ...u, street: '<img src=x onerror="alert(1)">' });
  assert.ok(!evil.includes("<img src=x"));
});
