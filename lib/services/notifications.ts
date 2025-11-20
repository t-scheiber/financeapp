import { prisma } from "@/lib/db";
import {
  sendBreakingNewsNotification,
  sendPriceAlertNotification,
  sendSentimentNotification,
} from "./email";

export interface Notification {
  id: string;
  userId: string;
  type: "sentiment_change" | "breaking_news" | "price_alert";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

/**
 * Create a notification in database
 */
export async function createNotification(
  userId: string,
  type: Notification["type"],
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<Notification | null> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : undefined,
      },
    });

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as Notification["type"],
      title: notification.title,
      message: notification.message,
      data: notification.data
        ? JSON.parse(notification.data as string)
        : undefined,
      read: notification.read,
      createdAt: notification.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false,
): Promise<Notification[]> {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return notifications.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      type: notification.type as Notification["type"],
      title: notification.title,
      message: notification.message,
      data: notification.data
        ? JSON.parse(notification.data as string)
        : undefined,
      read: notification.read,
      createdAt: notification.createdAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<boolean> {
  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Send sentiment change notification
 */
export async function notifySentimentChange(
  userId: string,
  userEmail: string,
  companySymbol: string,
  oldSentiment: string,
  newSentiment: string,
  newsTitle: string,
  newsUrl: string,
): Promise<boolean> {
  // Create notification in database
  const notification = await createNotification(
    userId,
    "sentiment_change",
    `${companySymbol} Sentiment Changed`,
    `Sentiment changed from ${oldSentiment} to ${newSentiment}`,
    {
      companySymbol,
      oldSentiment,
      newSentiment,
      newsTitle,
      newsUrl,
    },
  );

  if (notification) {
    // Send email notification
    return sendSentimentNotification(
      userEmail,
      companySymbol,
      oldSentiment,
      newSentiment,
      newsTitle,
      newsUrl,
    );
  }

  return false;
}

/**
 * Send breaking news notification
 */
export async function notifyBreakingNews(
  userId: string,
  userEmail: string,
  companySymbol: string,
  newsTitle: string,
  newsSummary: string,
  newsUrl: string,
  sentiment: string,
): Promise<boolean> {
  // Create notification in database
  const notification = await createNotification(
    userId,
    "breaking_news",
    `Breaking News: ${companySymbol}`,
    newsTitle,
    {
      companySymbol,
      newsTitle,
      newsSummary,
      newsUrl,
      sentiment,
    },
  );

  if (notification) {
    // Send email notification
    return sendBreakingNewsNotification(
      userEmail,
      companySymbol,
      newsTitle,
      newsSummary,
      newsUrl,
      sentiment,
    );
  }

  return false;
}

/**
 * Send price alert notification
 */
export async function notifyPriceAlert(
  userId: string,
  userEmail: string,
  companySymbol: string,
  currentPrice: number,
  threshold: number,
  direction: "above" | "below",
  portfolioName?: string,
): Promise<boolean> {
  // Create notification in database
  const notification = await createNotification(
    userId,
    "price_alert",
    `${companySymbol} Price Alert`,
    `Price ${direction === "above" ? "above" : "below"} threshold: $${currentPrice.toFixed(2)}`,
    {
      companySymbol,
      currentPrice,
      threshold,
      direction,
      portfolioName,
    },
  );

  if (notification) {
    // Send email notification
    return sendPriceAlertNotification(
      userEmail,
      companySymbol,
      currentPrice,
      threshold,
      direction,
      portfolioName,
    );
  }

  return false;
}

/**
 * Get unread notification count for user
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  } catch {
    return 0;
  }
}

/**
 * Get or create notification preference for user
 */
export async function getNotificationPreference(
  userId: string,
): Promise<{ emailEnabled: boolean }> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (preference) {
    return { emailEnabled: preference.emailEnabled };
  }

  const created = await prisma.notificationPreference.create({
    data: {
      userId,
      emailEnabled: true,
    },
  });

  return { emailEnabled: created.emailEnabled };
}

/**
 * Update notification preference
 */
export async function updateNotificationPreference(
  userId: string,
  emailEnabled: boolean,
): Promise<{ emailEnabled: boolean }> {
  const updated = await prisma.notificationPreference.upsert({
    where: { userId },
    update: { emailEnabled },
    create: {
      userId,
      emailEnabled,
    },
  });

  return { emailEnabled: updated.emailEnabled };
}
