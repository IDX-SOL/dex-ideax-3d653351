import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig, Plugin } from "vite";
import { cjsInterop } from "vite-plugin-cjs-interop";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

const DEFAULT_HTML_TITLE =
  "IDX Exchange - Decentralized Crypto Perpetual Futures (Perp) Exchange";

function loadConfigTitle(): string {
  try {
    const configPath = path.join(__dirname, "public/config.js");
    if (!fs.existsSync(configPath)) {
      return DEFAULT_HTML_TITLE;
    }

    const configText = fs.readFileSync(configPath, "utf-8");
    const jsonText = configText
      .replace(/window\.__RUNTIME_CONFIG__\s*=\s*/, "")
      .replace(/;\s*$/, "")
      .trim();

    const config = JSON.parse(jsonText);
    return (
      config.VITE_SEO_SITE_NAME ||
      config.VITE_ORDERLY_BROKER_NAME ||
      DEFAULT_HTML_TITLE
    );
  } catch (error) {
    console.warn("Failed to load title from config.js:", error);
    return DEFAULT_HTML_TITLE;
  }
}

function htmlTitlePlugin(): Plugin {
  const title = loadConfigTitle();
  console.log(`Using title from config.js: ${title}`);

  return {
    name: "html-title-transform",
    transformIndexHtml(html) {
      return html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    },
  };
}

/**
 * Chart legend shows "… · Orderly" from ui-tradingview's hardcoded EXCHANGE.
 * Remap display/prefix to IDX; keep SymbolsStorage group "Orderly" for the API.
 */
function renameTradingViewExchange(code: string): string | null {
  if (!code.includes('var EXCHANGE = "Orderly"')) return null;

  let next = code.replace(/var EXCHANGE = "Orderly"/g, 'var EXCHANGE = "IDX"');

  next = next.replace(
    /var withExchangePrefix = \(symbol\) => symbol\.startsWith\(`\$\{EXCHANGE\}:`\) \? symbol : `\$\{EXCHANGE\}:\$\{symbol\}`;/g,
    "var withExchangePrefix = (symbol) => `${EXCHANGE}:${withoutExchangePrefix(symbol)}`;",
  );

  next = next.replace(
    /const fullName = tradedExchange \+ ":" \+ symbolName;/g,
    'const fullName = EXCHANGE + ":" + symbolName;',
  );

  next = next.replace(
    /listed_exchange: listedExchange,\s*exchange: tradedExchange,/g,
    "listed_exchange: EXCHANGE,\n          exchange: EXCHANGE,",
  );

  return next === code ? null : next;
}

function tradingViewExchangeNamePlugin(): Plugin {
  const isTradingViewPkg = (id: string) =>
    id.includes(
      `${path.sep}@orderly.network${path.sep}ui-tradingview${path.sep}`,
    );

  return {
    name: "idx-tradingview-exchange-name",
    enforce: "pre",
    transform(code, id) {
      if (!isTradingViewPkg(id)) return null;
      const next = renameTradingViewExchange(code);
      return next == null ? null : { code: next, map: null };
    },
    config() {
      return {
        optimizeDeps: {
          esbuildOptions: {
            plugins: [
              {
                name: "idx-tradingview-exchange-name-esbuild",
                setup(build) {
                  build.onLoad(
                    {
                      filter:
                        /@orderly\.network[\\/]ui-tradingview[\\/]dist[\\/]index\.(mjs|js)$/,
                    },
                    async (args) => {
                      const source = await fs.promises.readFile(
                        args.path,
                        "utf8",
                      );
                      const next = renameTradingViewExchange(source) ?? source;
                      return { contents: next, loader: "js" };
                    },
                  );
                },
              },
            ],
          },
        },
      };
    },
  };
}

export default defineConfig(() => {
  const basePath = process.env.PUBLIC_PATH || "/";

  return {
    server: {
      open: true,
      host: true,
    },
    base: basePath,
    plugins: [
      react(),
      tsconfigPaths(),
      htmlTitlePlugin(),
      tradingViewExchangeNamePlugin(),
      cjsInterop({
        dependencies: ["bs58", "@coral-xyz/anchor", "lodash", "dayjs"],
      }),
      nodePolyfills({
        include: ["buffer", "crypto", "stream"],
      }),
    ],
    build: {
      outDir: "build/client",
    },
    optimizeDeps: {
      // dayjs ships UMD/CJS (dayjs.min.js) — must be prebundled or ESM default import fails
      include: ["react", "react-dom", "react-router-dom", "dayjs"],
      // Patched in postinstall — pre-bundle cache ignores node_modules edits.
      // Keep trading prebundled for stability; clear node_modules/.vite after patch changes.
      exclude: ["@orderly.network/markets"],
    },
  };
});
