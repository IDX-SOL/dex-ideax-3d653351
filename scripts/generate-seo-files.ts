import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  SEO_ROBOTS_DISALLOW,
  buildCanonicalUrl,
  buildPageTitle,
  getSitemapRoutes,
  isNoindexPath,
  resolvePageTitle,
  type SeoRouteDefinition,
} from "../app/utils/seo-routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Config {
  VITE_SEO_SITE_URL?: string;
  VITE_BASE_URL?: string;
  VITE_ORDERLY_BROKER_NAME?: string;
}

function loadConfig(): Config {
  const configPath = join(__dirname, "../public/config.js");
  if (!existsSync(configPath)) return {};

  const configText = readFileSync(configPath, "utf-8");
  const jsonText = configText
    .replace(/window\.__RUNTIME_CONFIG__\s*=\s*/, "")
    .replace(/;\s*$/, "")
    .trim();
  return JSON.parse(jsonText) as Config;
}

export function resolveOgImagePath(): string {
  const publicDir = join(__dirname, "../public");
  if (existsSync(join(publicDir, "og-image.jpg"))) return "/og-image.jpg";
  if (existsSync(join(publicDir, "exchange-home/trade-desktop.png"))) {
    return "/exchange-home/trade-desktop.png";
  }
  return "/logo.webp";
}

function withBasePath(path: string, basePath: string): string {
  if (path.match(/^(https?:)?\/\//)) return path;
  const base =
    basePath.endsWith("/") && basePath.length > 1
      ? basePath.slice(0, -1)
      : basePath;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base === "/") return normalized;
  return `${base}${normalized}`;
}

export function generateRobotsTxt(siteUrl: string, basePath: string): string {
  const sitemapUrl = `${siteUrl.replace(/\/$/, "")}${withBasePath("/sitemap.xml", basePath)}`;
  const disallowLines = SEO_ROBOTS_DISALLOW.map(
    (path) => `Disallow: ${withBasePath(path, basePath)}`,
  );

  return [
    "User-agent: *",
    "Allow: /",
    ...disallowLines,
    "",
    `Sitemap: ${sitemapUrl}`,
    "",
  ].join("\n");
}

export function generateSitemapXml(
  siteUrl: string,
  basePath: string,
  lastmod: string,
): string {
  const urls = getSitemapRoutes()
    .map((route) => {
      const loc = buildCanonicalUrl(siteUrl, route.path, basePath);
      const priority =
        route.priority != null
          ? `<priority>${route.priority.toFixed(1)}</priority>`
          : "";
      const changefreq = route.changefreq
        ? `<changefreq>${route.changefreq}</changefreq>`
        : "";
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    ${changefreq}
    ${priority}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function injectSeoIntoHtml(
  html: string,
  route: SeoRouteDefinition,
  options: {
    siteUrl: string;
    basePath: string;
    brokerName: string;
    ogImagePath: string;
    noindex?: boolean;
  },
): string {
  const pageTitle = escapeHtmlAttr(
    resolvePageTitle(route, options.brokerName),
  );
  const description = escapeHtmlAttr(route.description);
  const canonical = escapeHtmlAttr(
    buildCanonicalUrl(options.siteUrl, route.path, options.basePath),
  );
  const ogImage = escapeHtmlAttr(
    `${options.siteUrl.replace(/\/$/, "")}${withBasePath(options.ogImagePath, options.basePath)}`,
  );
  const robotsContent = options.noindex ? "noindex, nofollow" : "index, follow";

  let next = html;
  next = next.replace(/<title>[\s\S]*?<\/title>/, `<title>${pageTitle}</title>`);

  const upsertMeta = (
    pattern: RegExp,
    tag: string,
    anchor: string,
  ) => {
    if (pattern.test(next)) {
      next = next.replace(pattern, tag);
    } else {
      next = next.replace(anchor, `${tag}\n    ${anchor}`);
    }
  };

  upsertMeta(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
    '<meta name="viewport"',
  );
  upsertMeta(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${robotsContent}" />`,
    '<meta name="viewport"',
  );

  if (!/<link\s+rel="canonical"/.test(next)) {
    next = next.replace(
      '<meta name="viewport"',
      `<link rel="canonical" href="${canonical}" />\n    <meta name="viewport"`,
    );
  } else {
    next = next.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonical}" />`,
    );
  }

  next = next.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${pageTitle}" />`,
  );
  next = next.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  next = next.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`,
  );
  next = next.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${ogImage}" />`,
  );
  next = next.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${pageTitle}" />`,
  );
  next = next.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );
  next = next.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${ogImage}" />`,
  );

  return next;
}

export function getSeoInjectionOptions(config: Config = loadConfig()) {
  return {
    siteUrl: config.VITE_SEO_SITE_URL || "https://dex.idxsolana.io",
    basePath: config.VITE_BASE_URL || process.env.PUBLIC_PATH || "/",
    brokerName: config.VITE_ORDERLY_BROKER_NAME || "IDX",
    ogImagePath: resolveOgImagePath(),
  };
}

function writeSeoFiles(contents: { robots: string; sitemap: string }) {
  const publicDir = join(__dirname, "../public");
  writeFileSync(join(publicDir, "robots.txt"), contents.robots);
  writeFileSync(join(publicDir, "sitemap.xml"), contents.sitemap);
  console.log("✓ Generated: public/robots.txt");
  console.log("✓ Generated: public/sitemap.xml");

  const buildDir = join(__dirname, "../build/client");
  if (existsSync(buildDir)) {
    writeFileSync(join(buildDir, "robots.txt"), contents.robots);
    writeFileSync(join(buildDir, "sitemap.xml"), contents.sitemap);
    console.log("✓ Generated: build/client/robots.txt");
    console.log("✓ Generated: build/client/sitemap.xml");
  }
}

function main() {
  const config = loadConfig();
  const siteUrl = config.VITE_SEO_SITE_URL || "https://dex.idxsolana.io";
  const basePath = config.VITE_BASE_URL || process.env.PUBLIC_PATH || "/";
  const lastmod = new Date().toISOString().slice(0, 10);

  console.log("\n🔨 Generating SEO files...\n");
  console.log(`✓ Site URL: ${siteUrl}`);
  console.log(`✓ Base path: ${basePath}`);

  writeSeoFiles({
    robots: generateRobotsTxt(siteUrl, basePath),
    sitemap: generateSitemapXml(siteUrl, basePath, lastmod),
  });

  console.log("\n✅ SEO file generation complete!\n");
}

main();

export { isNoindexPath };
