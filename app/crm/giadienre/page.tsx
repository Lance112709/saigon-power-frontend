"use client";
import { PlugZap } from "lucide-react";
import SubscriptionsModule from "@/components/crm/SubscriptionsModule";

export default function GiaDienRePage() {
  return (
    <SubscriptionsModule
      leadSource="GiaDienRe Website"
      title="GiaDienRe Subscription"
      subtitle="Customers who subscribed on giadienre.com — lead source “GiaDienRe Website”"
      basePath="/crm/giadienre"
      badgeKeyPrefix="gdr"
      icon={PlugZap}
      planOptions={[
        { value: "plus", label: "Saigon Power Plus ($9.99)" },
        { value: "managed", label: "Managed (legacy)" },
        { value: "managed-plus", label: "Managed Plus (legacy)" },
      ]}
      showFormType
      csvPrefix="giadienre"
      emptyText="No subscriptions yet. New signups on giadienre.com will appear here automatically."
    />
  );
}
