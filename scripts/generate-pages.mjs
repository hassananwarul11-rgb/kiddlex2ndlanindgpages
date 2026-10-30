// Build step: turns data/config.json into static landing pages (public/<slug>.html).
// Static files are served free by Cloudflare Pages, no Function invocation per click.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pub = path.join(root, "public");
const RESERVED = new Set(["admin","api","assets","functions","404","favicon.ico","robots.txt","sitemap.xml"]);
const GA_ID = "G-16BHTEV2QP";

const config = JSON.parse(fs.readFileSync(path.join(root, "data", "config.json"), "utf8"));
if (!config || typeof config !== "object" || Array.isArray(config) || !Object.keys(config).length) {
  console.error("config.json is empty or invalid, aborting build so the live site stays unchanged");
  process.exit(1);
}

const cleanSlug = v => String(v || "").toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
// safe inside <script>
const js = v => JSON.stringify(v).replace(/</g, "\\u003c");

function landingHtml(slug, destination, delay, desktopDestination) {
  const images = Array.from({ length: 18 }, (_, i) => "/assets/" + (i + 1) + ".webp");
  const desktopURL = desktopDestination ||
    ("https://www.google.com/?utm_source=jack&utm_medium=" + encodeURIComponent(slug.toUpperCase()));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Please wait...</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; }
    body { display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .landing { width: 100%; max-width: 520px; padding: 12px; text-align: center; }
    .landing img { display: block; width: 100%; max-height: 90vh; object-fit: contain; margin: 0 auto; }
  </style>
</head>
<body>
  <main class="landing"><img id="randomImage" src="" alt="Loading"></main>
  <script>
    const desktopURL = ${js(desktopURL)};
    const mobileURL = ${js(destination)};
    const redirectDelay = ${Number(delay)};
    const images = ${js(images)};
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      window.location.replace(desktopURL);
    } else {
      document.getElementById("randomImage").src = images[Math.floor(Math.random() * images.length)];
      setTimeout(function () { window.location.replace(mobileURL); }, redirectDelay);
    }
  </script>
</body>
</html>`;
}

let count = 0;
for (const [rawSlug, item] of Object.entries(config)) {
  const slug = cleanSlug(rawSlug);
  if (!slug || RESERVED.has(slug) || !item || !item.destination) {
    console.warn("skipped:", rawSlug);
    continue;
  }
  const rawDelay = Number(item.delay);
  const delay = Number.isFinite(rawDelay) && rawDelay >= 0 && rawDelay <= 60000 ? rawDelay : 3000;
  const desktop = item.desktopDestination ? String(item.desktopDestination) : "";
  fs.writeFileSync(path.join(pub, slug + ".html"), landingHtml(slug, String(item.destination), delay, desktop));
  count++;
}

fs.writeFileSync(path.join(pub, "404.html"),
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Not found</title></head><body style="font-family:system-ui;text-align:center;padding-top:20vh">Not found</body></html>');
console.log("Generated " + count + " landing pages");
