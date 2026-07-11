"use client";
import { BadgePercent } from "lucide-react";
import SubscriptionsModule from "@/components/crm/SubscriptionsModule";

export default function SaigonSubscriptionPage() {
  return (
    <SubscriptionsModule
      leadSource="SaigonLLC Website"
      title="SAIGON Subscription"
      subtitle="Customers who subscribed on saigonllc.com — lead source “SaigonLLC Website”"
      basePath="/crm/saigon"
      badgeKeyPrefix="saigon"
      icon={BadgePercent}
      planOptions={[
        { value: "MONTHLY", label: "Membership Monthly" },
        { value: "ANNUAL", label: "Membership Annual" },
        { value: "FAMILY_MONTHLY", label: "Family Monthly" },
        { value: "BUSINESS_MONTHLY", label: "Business Monthly" },
      ]}
      csvPrefix="saigon"
      emptyText="No subscriptions yet. New signups on saigonllc.com will appear here automatically."
    />
  );
}
