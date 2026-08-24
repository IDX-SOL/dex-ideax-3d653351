import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import {
  getSeoInjectionOptions,
  injectSeoIntoHtml,
  isNoindexPath,
} from "./scripts/generate-seo-files";
import {
  SEO_HOME_ROUTE,
  getSeoRouteForPath,
} from "./app/utils/seo-routes";

const STATIC_ROUTES = [
  "/futures",
  "/perp",
  "/markets",
  "/portfolio",
  "/portfolio/positions",
  "/portfolio/orders",
  "/portfolio/fee",
  "/portfolio/api-key",
  "/portfolio/setting",
  "/leaderboard",
  "/swap",
  "/points",
];

interface SymbolInfo {
  symbol: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    rows: SymbolInfo[];
  };
}

async function fetchSymbols(): Promise<string[]> {
  try {
    const response = await fetch("https://api.orderly.org/v1/public/info");
    const data = (await response.json()) as ApiResponse;
    return data.data.rows.map((row) => row.symbol);
  } catch (error) {
    console.error("Error fetching symbols:", error);
    return [];
  }
}

async function copyIndexToPath(indexPath: string, targetPath: string) {
  try {
    // Create parent directory if it doesn't exist
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(indexPath, targetPath);
    console.log(`Created: ${targetPath}`);
  } catch (error) {
    console.error(`Error copying to ${targetPath}:`, error);
  }
}

async function clearDirectory(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    console.log(`Cleared directory: ${dir}`);
  } catch (error) {
    console.error(`Error clearing directory ${dir}:`, error);
  }
}

async function main() {
  const buildDir = "./build/client";

  // Get the base path from environment variable or default to '/'
  const basePath = process.env.PUBLIC_PATH || "/";
  console.log(`Using base path: ${basePath}`);

  // Step 1: Clear build directory
  console.log("Clearing build directory...");
  await clearDirectory(buildDir);

  // Step 2: Run the regular build
  console.log("\nRunning regular build...");
  execSync("yarn build", { stdio: "inherit" });

  const indexPath = path.join(buildDir, "index.html");

  // Step 3: Create HTML files for static routes
  console.log("\nCreating static route files...");
  const seoOptions = getSeoInjectionOptions();
  const rootIndexHtml = await fs.readFile(indexPath, "utf-8");
  const homeHtml = injectSeoIntoHtml(rootIndexHtml, SEO_HOME_ROUTE, {
    ...seoOptions,
    noindex: false,
  });
  await fs.writeFile(indexPath, homeHtml);
  console.log("Updated: build/client/index.html");

  for (const route of STATIC_ROUTES) {
    const targetPath = path.join(buildDir, route, "index.html");
    const routeDef = getSeoRouteForPath(route, seoOptions.basePath);
    if (!routeDef) {
      await copyIndexToPath(indexPath, targetPath);
      continue;
    }
    const html = injectSeoIntoHtml(homeHtml, routeDef, {
      ...seoOptions,
      noindex: isNoindexPath(route, seoOptions.basePath),
    });
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, html);
    console.log(`Created: ${targetPath}`);
  }

  // Step 4: Fetch symbols and create perp route files
  console.log("\nFetching symbols and creating perp route files...");
  const symbols = await fetchSymbols();
  console.log(symbols);

  for (const symbol of symbols) {
    const targetPath = path.join(buildDir, "perp", symbol, "index.html");
    const routeDef = getSeoRouteForPath("/perp", seoOptions.basePath);
    const html =
      routeDef != null
        ? injectSeoIntoHtml(homeHtml, routeDef, {
            ...seoOptions,
            noindex: true,
          })
        : homeHtml;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, html);
    console.log(`Created: ${targetPath}`);
  }

  // Step 5: Create 404.html for GitHub Pages fallback routing
  console.log("\nCreating 404.html for GitHub Pages fallback...");
  const fallbackPath = path.join(buildDir, "404.html");
  await copyIndexToPath(indexPath, fallbackPath);

  console.log("\nBuild completed successfully!");
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
