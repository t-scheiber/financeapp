import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { resolveOrCreateCompany } from "@/lib/services/company-resolver";
import { notifyPriceAlert } from "@/lib/services/notifications";

export type PriceAlertDirection = "above" | "below";

export interface PriceAlert {
  id: string;
  userId: string;
  companyId: number;
  symbol: string;
  companyName: string;
  direction: PriceAlertDirection;
  threshold: number;
  isActive: boolean;
  lastTriggered?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getUserPriceAlerts(
  userId: string,
): Promise<PriceAlert[]> {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          id: true,
          symbol: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return alerts.map((alert) => ({
    id: alert.id,
    userId: alert.userId,
    companyId: alert.companyId,
    symbol: alert.company.symbol,
    companyName: alert.company.name,
    direction: alert.direction as PriceAlertDirection,
    threshold: alert.threshold,
    isActive: alert.isActive,
    lastTriggered: alert.lastTriggered,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  }));
}

export async function createPriceAlert({
  userId,
  symbol,
  direction,
  threshold,
  displayName,
}: {
  userId: string;
  symbol: string;
  direction: PriceAlertDirection;
  threshold: number;
  displayName?: string;
}): Promise<PriceAlert | { alreadyExists: true; alert: PriceAlert }> {
  const company = await resolveOrCreateCompany({
    symbol,
    fallbackName: displayName,
  });

  try {
    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        companyId: company.id,
        direction,
        threshold,
      },
      include: {
        company: {
          select: {
            id: true,
            symbol: true,
            name: true,
          },
        },
      },
    });

    return {
      id: alert.id,
      userId: alert.userId,
      companyId: alert.companyId,
      direction: alert.direction as PriceAlertDirection,
      threshold: alert.threshold,
      symbol: alert.company.symbol,
      companyName: alert.company.name,
      isActive: alert.isActive,
      lastTriggered: alert.lastTriggered,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.priceAlert.findFirstOrThrow({
        where: {
          userId,
          companyId: company.id,
          direction,
          threshold,
        },
        include: {
          company: {
            select: {
              id: true,
              symbol: true,
              name: true,
            },
          },
        },
      });

      return {
        alreadyExists: true,
        alert: {
          id: existing.id,
          userId: existing.userId,
          companyId: existing.companyId,
          direction: existing.direction as PriceAlertDirection,
          threshold: existing.threshold,
          symbol: existing.company.symbol,
          companyName: existing.company.name,
          isActive: existing.isActive,
          lastTriggered: existing.lastTriggered,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      };
    }
    throw error;
  }
}

export async function deletePriceAlert(
  userId: string,
  alertId: string,
): Promise<boolean> {
  try {
    const result = await prisma.priceAlert.deleteMany({
      where: {
        id: alertId,
        userId,
      },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}

export async function checkPriceAlertsForCompany(
  companyId: number,
  currentPrice: number,
): Promise<void> {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      company: {
        select: {
          symbol: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          notificationPreference: {
            select: {
              emailEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!alerts.length) {
    return;
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  for (const alert of alerts) {
    const shouldTrigger =
      alert.direction === "above"
        ? currentPrice >= alert.threshold
        : currentPrice <= alert.threshold;

    if (!shouldTrigger) {
      continue;
    }

    if (
      alert.lastTriggered &&
      alert.lastTriggered.getTime() >= startOfDay.getTime()
    ) {
      continue;
    }

    const emailEnabled =
      alert.user.notificationPreference?.emailEnabled ?? true;

    if (!emailEnabled || !alert.user.email) {
      continue;
    }

    const success = await notifyPriceAlert(
      alert.user.id,
      alert.user.email,
      alert.company.symbol,
      currentPrice,
      alert.threshold,
      alert.direction as PriceAlertDirection,
      undefined,
    );

    if (success) {
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: {
          lastTriggered: now,
        },
      });
    }
  }
}
