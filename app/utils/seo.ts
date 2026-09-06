import { getRuntimeConfig, getRuntimeConfigArray } from "./runtime-config";
import {
  buildCanonicalUrl,
  buildPageTitle,
  getSeoRouteForPath,
  resolveSeoForPath,
} from "./seo-routes";

export interface SEOConfig {
  siteName?: string;
  siteDescription?: string;
  siteUrl?: string;
  language?: string;
  locale?: string;
  twitterHandle?: string;
  themeColor?: string;
  keywords?: string;
}

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type LinkTag = {
  rel: string;
  href: string;
  hrefLang?: string;
};

export type SeoTag = MetaTag | LinkTag;

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇷" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
];

export function getUserLanguage(): string {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam) {
      return langParam;
    }

    if (navigator.language) {
      return navigator.language.split("-")[0];
    }
  }
  return "en";
}

export function getSEOConfig(): SEOConfig {
  return {
    siteName: getRuntimeConfig("VITE_SEO_SITE_NAME"),
    siteDescription: getRuntimeConfig("VITE_SEO_SITE_DESCRIPTION"),
    siteUrl: getRuntimeConfig("VITE_SEO_SITE_URL"),
    language: getRuntimeConfig("VITE_SEO_SITE_LANGUAGE"),
    locale: getRuntimeConfig("VITE_SEO_SITE_LOCALE"),
    twitterHandle: getRuntimeConfig("VITE_SEO_TWITTER_HANDLE"),
    themeColor: getRuntimeConfig("VITE_SEO_THEME_COLOR"),
    keywords: getRuntimeConfig("VITE_SEO_KEYWORDS"),
  };
}

function getBasePath(): string {
  return getRuntimeConfig("VITE_BASE_URL") || import.meta.env.BASE_URL || "/";
}

function getAvailableLanguages(): string[] {
  const languages = getRuntimeConfigArray("VITE_AVAILABLE_LANGUAGES");
  if (languages.length === 0) return ["en"];

  return languages
    .map((code: string) => code.trim())
    .filter((code: string) =>
      SUPPORTED_LANGUAGES.some((lang) => lang.code === code),
    );
}

function generateHrefLangLinks(path: string): LinkTag[] {
  const config = getSEOConfig();
  const siteUrl = config.siteUrl;

  if (!siteUrl) return [];

  const availableLanguages = getAvailableLanguages();
  const links: LinkTag[] = [];

  availableLanguages.forEach((langCode) => {
    const url = new URL(buildCanonicalUrl(siteUrl, path, getBasePath()));

    if (langCode !== "en") {
      url.searchParams.set("lang", langCode);
    }

    links.push({
      rel: "alternate",
      hrefLang: langCode,
      href: url.toString(),
    });
  });

  if (availableLanguages.length > 1) {
    links.push({
      rel: "alternate",
      hrefLang: "x-default",
      href: buildCanonicalUrl(siteUrl, path, getBasePath()),
    });
  }

  return links;
}

export function getOgImageUrl(siteUrl?: string): string | undefined {
  const base = siteUrl || getSEOConfig().siteUrl;
  if (!base) return undefined;
  const origin = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${origin}/og-image.jpg`;
}

export interface GetPageMetaOptions {
  pathname?: string;
  pageTitle?: string;
}

export function getPageMeta(options: GetPageMetaOptions = {}): SeoTag[] {
  const config = getSEOConfig();
  const basePath = getBasePath();
  const pathname =
    options.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const resolved = resolveSeoForPath(pathname, {
    basePath,
    brokerName: getRuntimeConfig("VITE_ORDERLY_BROKER_NAME") || "IDX",
    siteDescription: config.siteDescription,
  });
  const route = getSeoRouteForPath(resolved.path, basePath);

  const pageTitle =
    options.pageTitle ??
    route?.pageTitle ??
    config.siteName ??
    buildPageTitle(resolved.titleSuffix, getRuntimeConfig("VITE_ORDERLY_BROKER_NAME") || "IDX");
  const description = resolved.description;
  const siteUrl = config.siteUrl;
  const canonical = siteUrl
    ? buildCanonicalUrl(siteUrl, resolved.path, basePath)
    : "";
  const metaImage = getOgImageUrl(siteUrl);
  const metaKeywords = config.keywords;

  const tags: SeoTag[] = [];

  if (pageTitle) {
    tags.push({ title: pageTitle });
  }

  if (description) {
    tags.push({ name: "description", content: description });
  }

  tags.push({
    name: "robots",
    content: resolved.noindex ? "noindex, nofollow" : "index, follow",
  });

  if (metaKeywords) {
    tags.push({ name: "keywords", content: metaKeywords });
  }

  if (config.themeColor) {
    tags.push({ name: "theme-color", content: config.themeColor });
  }

  if (canonical) {
    tags.push({ rel: "canonical", href: canonical });
  }

  if (siteUrl) {
    tags.push({ property: "og:type", content: "website" });

    if (pageTitle) {
      tags.push({ property: "og:title", content: pageTitle });
    }

    if (config.siteName) {
      tags.push({ property: "og:site_name", content: config.siteName });
    }

    if (canonical) {
      tags.push({ property: "og:url", content: canonical });
    }

    if (metaImage) {
      tags.push({ property: "og:image", content: metaImage });
    }

    if (description) {
      tags.push({ property: "og:description", content: description });
    }

    if (config.locale) {
      tags.push({ property: "og:locale", content: config.locale });
    }
  }

  tags.push({ name: "twitter:card", content: "summary_large_image" });

  if (pageTitle) {
    tags.push({ name: "twitter:title", content: pageTitle });
  }

  if (description) {
    tags.push({ name: "twitter:description", content: description });
  }

  if (config.twitterHandle) {
    tags.push({ name: "twitter:site", content: config.twitterHandle });
  }

  if (metaImage) {
    tags.push({ name: "twitter:image", content: metaImage });
  }

  tags.push(...generateHrefLangLinks(resolved.path));
  return tags;
}

export function getHomeStructuredData(): Record<string, unknown> {
  const config = getSEOConfig();
  const siteUrl = config.siteUrl || "https://dex.idxsolana.io";
  const siteName = config.siteName || "IDX Exchange";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        description: config.siteDescription,
        inLanguage: config.language || "en",
      },
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl.replace(/\/$/, "")}/exchange-home/logo.png`,
      },
    ],
  };
}
