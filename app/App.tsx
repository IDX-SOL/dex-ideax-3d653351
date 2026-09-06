import { Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Outlet } from "react-router-dom";
import { HttpsRequiredWarning } from "@/components/HttpsRequiredWarning";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SubNavBackAffordance } from "@/components/SubNavBackAffordance";
import DeferredGtm from "@/components/analytics/DeferredGtm";
import { OrderlyBootGate } from "@/components/orderlyProvider/OrderlyBootGate";
import { OrderlyLocaleProvider } from "@/components/orderlyProvider/orderlyLocaleProvider";
import { OrderlyBootProvider } from "@/contexts/OrderlyBootContext";
import { withBasePath } from "./utils/base-path";
import { getSEOConfig, getUserLanguage } from "./utils/seo";
import { getRuntimeConfig } from "./utils/runtime-config";

export default function App() {
  const seoConfig = getSEOConfig();
  const defaultLanguage = getUserLanguage();
  const googleVerification = getRuntimeConfig("VITE_GOOGLE_SITE_VERIFICATION");
  const bingVerification = getRuntimeConfig("VITE_BING_SITE_VERIFICATION");

  return (
    <>
      <Helmet>
        <html lang={seoConfig.language || defaultLanguage} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {googleVerification ? (
          <meta
            name="google-site-verification"
            content={googleVerification}
          />
        ) : null}
        {bingVerification ? (
          <meta name="msvalidate.01" content={bingVerification} />
        ) : null}
        <link
          rel="icon"
          type="image/webp"
          href={withBasePath("/favicon.webp")}
        />
      </Helmet>
      <DeferredGtm />
      <HttpsRequiredWarning />
      <OrderlyLocaleProvider>
        <OrderlyBootProvider>
          <OrderlyBootGate>
            <SubNavBackAffordance />
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </OrderlyBootGate>
        </OrderlyBootProvider>
      </OrderlyLocaleProvider>
    </>
  );
}
