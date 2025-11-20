import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import SettingsClient from "@/components/settings/settings-client";
import { getUserApiKeys } from "@/lib/services/user-api-keys";
import { getUserWatchlists } from "@/lib/services/watchlists";
import { getUserPortfolios } from "@/lib/services/portfolios";
import {
  getNotificationPreference,
} from "@/lib/services/notifications";
import { getUserPriceAlerts } from "@/lib/services/price-alerts";
import { ensureUserByEmail } from "@/lib/services/users";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/auth/signin?next=/settings");
  }

  const user = await ensureUserByEmail({
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  });

  if (!user) {
    redirect("/auth/signin?next=/settings");
  }

  const [
    apiKeys,
    watchlists,
    rawPortfolios,
    notificationPreference,
    priceAlerts,
  ] = await Promise.all([
    getUserApiKeys(user.id).then((keys) =>
      keys.map(({ id, provider, isValid, lastTested }) => ({
        id,
        provider,
        isValid,
        lastTested: lastTested?.toISOString() ?? null,
      })),
    ),
    getUserWatchlists(user.id),
    getUserPortfolios(user.id),
    getNotificationPreference(user.id),
    getUserPriceAlerts(user.id).then((alerts) =>
      alerts.map((alert) => ({
        ...alert,
        lastTriggered: alert.lastTriggered?.toISOString() ?? null,
      })),
    ),
  ]);

  return (
    <SettingsClient
      sessionUser={{
        id: user.id,
        email: user.email,
        name: session.user.name ?? null,
        hasSeenGuide: user.hasSeenGuide,
      }}
      initialApiKeys={apiKeys}
      initialWatchlists={watchlists}
      initialPortfolios={rawPortfolios.map((portfolio) => ({
        ...portfolio,
        optimizedPortfolio: portfolio.optimizedPortfolio
          ? {
              ...portfolio.optimizedPortfolio,
              calculatedAt: portfolio.optimizedPortfolio.calculatedAt.toISOString(),
            }
          : undefined,
      }))}
      initialNotificationPreference={notificationPreference}
      initialPriceAlerts={priceAlerts}
      initialGuideSeen={user.hasSeenGuide}
    />
  );
}

