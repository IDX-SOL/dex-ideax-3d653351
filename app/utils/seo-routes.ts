/** Pure SEO route registry — safe for Node build scripts and the browser. */

export type SeoChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export const SEO_HOME_PAGE_TITLE =
  "IDX Exchange - Decentralized Crypto Perpetual Futures (Perp) Exchange";

export const SITE_DESCRIPTION =
  "Trade crypto perpetual futures on IDX Exchange, a decentralized perp exchange with no KYC, up to 100x leverage, non-custodial trading, deep liquidity, low fees, and seamless on-chain derivatives.";

export interface SeoRouteDefinition {
  path: string;
  titleSuffix: string;
  /** When set, used as the full document title (no `| broker` suffix). */
  pageTitle?: string;
  description: string;
  /** Included in sitemap.xml when true (default false for aux routes). */
  indexable?: boolean;
  changefreq?: SeoChangeFreq;
  priority?: number;
}

export const SEO_NOINDEX_PREFIXES = [
  "/ai-futures-bot",
  "/portfolio",
  "/perp",
] as const;

export const SEO_ROBOTS_DISALLOW = [
  "/ai-futures-bot",
  "/portfolio/",
  "/perp/",
  "/tradingview/",
] as const;

const SITE_DESCRIPTION_FALLBACK = SITE_DESCRIPTION;

export const SEO_HOME_ROUTE: SeoRouteDefinition = {
  path: "/",
  titleSuffix: "IDX Exchange",
  pageTitle: SEO_HOME_PAGE_TITLE,
  description: SITE_DESCRIPTION,
  indexable: true,
  changefreq: "weekly",
  priority: 1,
};

export const SEO_INDEXABLE_ROUTES: SeoRouteDefinition[] = [
  {
    path: "/futures",
    titleSuffix: "Futures",
    description:
      "Trade crypto perpetual futures with deep liquidity, low fees, and up to 100x leverage on IDX Exchange.",
    indexable: true,
    changefreq: "daily",
    priority: 0.9,
  },
  {
    path: "/markets",
    titleSuffix: "Markets",
    description:
      "Browse perpetual futures markets, compare pairs, and open trades on IDX Exchange.",
    indexable: true,
    changefreq: "daily",
    priority: 0.8,
  },
  {
    path: "/swap",
    titleSuffix: "Bridge/Swap",
    description:
      "Bridge and swap assets across supported chains from IDX Exchange.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.7,
  },
  {
    path: "/leaderboard",
    titleSuffix: "Leaderboard",
    description: "See top traders and rankings on IDX Exchange.",
    indexable: true,
    changefreq: "daily",
    priority: 0.6,
  },
  {
    path: "/points",
    titleSuffix: "Points",
    description: "View trading points and rewards activity on IDX Exchange.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.5,
  },
  {
    path: "/rewards/affiliate",
    titleSuffix: "Affiliate",
    description:
      "Refer traders and track affiliate rewards on IDX Exchange.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.5,
  },
];

/** Routes that get static index.html copies in build.ts (includes noindex app pages). */
export const SEO_STATIC_BUILD_ROUTES: SeoRouteDefinition[] = [
  SEO_HOME_ROUTE,
  ...SEO_INDEXABLE_ROUTES.filter((route) => route.path !== "/rewards/affiliate"),
  {
    path: "/perp",
    titleSuffix: "Futures",
    description:
      "Trade crypto perpetual futures with deep liquidity on IDX Exchange.",
  },
  {
    path: "/portfolio",
    titleSuffix: "Portfolio",
    description: "View your IDX Exchange portfolio, positions, and balances.",
  },
  {
    path: "/portfolio/positions",
    titleSuffix: "Positions",
    description: "Manage open perpetual futures positions on IDX Exchange.",
  },
  {
    path: "/portfolio/orders",
    titleSuffix: "Orders",
    description: "Review open and historical orders on IDX Exchange.",
  },
  {
    path: "/portfolio/fee",
    titleSuffix: "Fee tier",
    description: "View your fee tier and trading volume on IDX Exchange.",
  },
  {
    path: "/portfolio/api-key",
    titleSuffix: "API Keys",
    description: "Create and manage API keys for IDX Exchange.",
  },
  {
    path: "/portfolio/setting",
    titleSuffix: "Settings",
    description: "Portfolio and account settings on IDX Exchange.",
  },
];

export function normalizeSeoPath(pathname: string): string {
  let path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function stripBasePath(pathname: string, basePath = "/"): string {
  const base =
    basePath.endsWith("/") && basePath.length > 1
      ? basePath.slice(0, -1)
      : basePath;
  if (base !== "/" && pathname.startsWith(base)) {
    const stripped = pathname.slice(base.length);
    return stripped ? normalizeSeoPath(stripped) : "/";
  }
  return normalizeSeoPath(pathname);
}

export function isNoindexPath(pathname: string, basePath = "/"): boolean {
  const path = stripBasePath(pathname, basePath);
  return SEO_NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function getSeoRouteForPath(
  pathname: string,
  basePath = "/",
): SeoRouteDefinition | undefined {
  const path = stripBasePath(pathname, basePath);
  if (path === "/") return SEO_HOME_ROUTE;
  return SEO_STATIC_BUILD_ROUTES.find((route) => route.path === path);
}

export interface ResolvedSeo {
  path: string;
  titleSuffix: string;
  description: string;
  noindex: boolean;
}

export function resolveSeoForPath(
  pathname: string,
  options: {
    basePath?: string;
    brokerName?: string;
    siteDescription?: string;
  } = {},
): ResolvedSeo {
  const basePath = options.basePath ?? "/";
  const path = stripBasePath(pathname, basePath);
  const route = getSeoRouteForPath(path, basePath);
  const noindex = isNoindexPath(path, basePath);

  return {
    path,
    titleSuffix: route?.titleSuffix ?? options.brokerName ?? "IDX Exchange",
    description:
      route?.description ??
      options.siteDescription ??
      SITE_DESCRIPTION_FALLBACK,
    noindex,
  };
}

export function getSitemapRoutes(): SeoRouteDefinition[] {
  return [SEO_HOME_ROUTE, ...SEO_INDEXABLE_ROUTES.filter((r) => r.indexable)];
}

export function buildPageTitle(titleSuffix: string, brokerName: string): string {
  return `${titleSuffix} | ${brokerName}`;
}

export function resolvePageTitle(
  route: SeoRouteDefinition | undefined,
  brokerName: string,
): string {
  if (route?.pageTitle) return route.pageTitle;
  return buildPageTitle(route?.titleSuffix ?? "IDX Exchange", brokerName);
}

export function buildCanonicalUrl(
  siteUrl: string,
  pathname: string,
  basePath = "/",
): string {
  const path = stripBasePath(pathname, basePath);
  const origin = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  const base =
    basePath.endsWith("/") && basePath.length > 1
      ? basePath.slice(0, -1)
      : basePath === "/"
        ? ""
        : basePath;
  if (path === "/") {
    const url = `${origin}${base}/`;
    return url.replace(/([^:]\/)\/+/g, "$1");
  }
  return `${origin}${base}${path}`.replace(/([^:]\/)\/+/g, "$1");
}
