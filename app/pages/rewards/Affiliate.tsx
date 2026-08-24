import { Dashboard, ReferralProvider } from "@orderly.network/affiliate";
import { usePageSEO } from "@/hooks/usePageSEO";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { renderSEOTags } from "@/utils/seo-tags";

export default function RewardsAffiliate() {
  const brokerName = getRuntimeConfig("VITE_ORDERLY_BROKER_NAME");
  const { tags, pageTitle } = usePageSEO("Affiliate");
  const referralLinkUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://orderly.network";

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <ReferralProvider
        becomeAnAffiliateUrl="https://orderly.network"
        learnAffiliateUrl="https://orderly.network"
        referralLinkUrl={referralLinkUrl}
        overwrite={{
          shortBrokerName: brokerName,
          brokerName: brokerName,
        }}
      >
        <Dashboard.DashboardPage
          classNames={{
            root: "oui-flex oui-justify-center",
            home: "oui-py-6 oui-px-4 lg:oui-px-6 lg:oui-py-12 xl:oui-pl-4 xl:oui-pr-6 oui-w-full",
            dashboard: "oui-py-6 oui-px-4 lg:oui-px-6 xl:oui-pl-3 xl:oui-pr-6",
          }}
        />
      </ReferralProvider>
    </>
  );
}
