"use client";
import { Zap } from "lucide-react";
import SubscriptionsModule from "@/components/crm/SubscriptionsModule";

export default function PowerPlusMembershipPage() {
  return (
    <SubscriptionsModule
      leadSource="SaigonPowerTX Website"
      title="POWER PLUS Membership"
      subtitle="Customers who joined on saigonpowertx.com/membership — lead source “SaigonPowerTX Website”"
      basePath="/crm/powerplus"
      badgeKeyPrefix="powerplus"
      icon={Zap}
      planOptions={[
        { value: "POWER_PLUS_RES", label: "Residential ($9.99)" },
        { value: "POWER_PLUS_COM", label: "Commercial ($19.99)" },
      ]}
      showFormType
      csvPrefix="powerplus"
      emptyText="No members yet. New signups on saigonpowertx.com/membership will appear here automatically."
    />
  );
}
