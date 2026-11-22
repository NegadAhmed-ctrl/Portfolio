// Static build: drawings/*.svg, units/<id>/index.html, prerendered cards + JSON-LD in index.html,
// sitemap.xml and robots.txt. Run: node scripts/build.mjs  (no dependencies)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../js/config.js";
import { UNITS } from "../js/units.js";
import { elevation } from "../js/drawings.js";
import { renderCard, unitJsonLd, unitTitle, unitUrl, esc } from "../js/render.js";
import { unitBody, unitDescription } from "../js/unit-body.js";
import { sortUnits } from "../js/filters.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = CONFIG.siteUrl;
const jsonForHtml = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

// 1. Drawings (lazy <img> on cards).
mkdirSync(join(root, "drawings"), { recursive: true });
for (const u of UNITS) writeFileSync(join(root, "drawings", `${u.id}.svg`), elevation(u).svg);

// 2. Unit pages.
if (existsSync(join(root, "units"))) rmSync(join(root, "units"), { recursive: true });
const tpl = readFileSync(join(root, "unit.template.html"), "utf8");
for (const u of UNITS) {
  const html = tpl
    .replaceAll("{{title}}", esc(unitTitle(u)))
    .replaceAll("{{description}}", esc(unitDescription(u)))
    .replaceAll("{{url}}", site + unitUrl(u))
    .replaceAll("{{site}}", site)
    .replaceAll("{{id}}", u.id)
    .replace("{{jsonld}}", () => jsonForHtml(unitJsonLd(u, site, CONFIG)))
    .replace("{{body}}", () => unitBody(u));
  mkdirSync(join(root, "units", u.id), { recursive: true });
  writeFileSync(join(root, "units", u.id, "index.html"), html);
}

// 3. Index: prerendered "for sale, newest" cards + office and list JSON-LD.
const indexPath = join(root, "index.html");
let index = readFileSync(indexPath, "utf8");
const first = sortUnits(UNITS.filter((u) => u.purpose === "sale"), "newest");
const ld = [
  {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: CONFIG.officeName,
    url: site,
    telephone: "+" + CONFIG.whatsapp,
    address: { "@type": "PostalAddress", streetAddress: "12 شارع عبد السلام عارف، لوران", addressLocality: "الإسكندرية", addressCountry: "EG" },
    openingHours: "Sa-Th 11:00-22:00",
    areaServed: "الإسكندرية",
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: UNITS.map((u, i) => ({ "@type": "ListItem", position: i + 1, url: site + unitUrl(u), name: unitTitle(u) })),
  },
];
index = index
  .replace(/<!--cards:start-->[\s\S]*?<!--cards:end-->/, () => `<!--cards:start-->\n${first.map((u) => renderCard(u)).join("\n")}\n<!--cards:end-->`)
  .replace(/<!--jsonld:start-->[\s\S]*?<!--jsonld:end-->/, () => `<!--jsonld:start--><script type="application/ld+json">${jsonForHtml(ld)}</script><!--jsonld:end-->`);
writeFileSync(indexPath, index);

// 4. Sitemap + robots.
const urls = [{ loc: site, lastmod: "2026-11-22" }, ...UNITS.map((u) => ({ loc: site + unitUrl(u), lastmod: u.listed }))];
writeFileSync(
  join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((x) => `  <url><loc>${x.loc}</loc><lastmod>${x.lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`,
);
writeFileSync(join(root, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site}sitemap.xml\n`);
console.log(`built ${UNITS.length} unit pages, ${UNITS.length} drawings, sitemap with ${urls.length} urls`);
