import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface NotificationData {
  type: "sentiment_change" | "breaking_news" | "price_alert";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Create email transporter using environment variables
 */
function createTransporter(): nodemailer.Transporter {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  };

  return nodemailer.createTransport(config);
}

/**
 * Send email notification to user
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<boolean> {
  try {
    // Check if email service is configured
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      return false;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send sentiment change notification
 */
export async function sendSentimentNotification(
  userEmail: string,
  companySymbol: string,
  oldSentiment: string,
  newSentiment: string,
  newsTitle: string,
  newsUrl: string,
): Promise<boolean> {
  const subject = `FinanceApp Alert: ${companySymbol} Sentiment Changed`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">FinanceApp Alert</h2>
      <p><strong>${companySymbol}</strong> sentiment has changed:</p>
      <div style="background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <p><strong>Previous:</strong> ${oldSentiment}</p>
        <p><strong>New:</strong> ${newSentiment}</p>
        <p><strong>News:</strong> <a href="${newsUrl}" style="color: #2563eb;">${newsTitle}</a></p>
      </div>
      <p>Stay informed about your investments!</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated notification from FinanceApp</p>
    </div>
  `;

  return sendEmailNotification(userEmail, subject, html);
}

/**
 * Send breaking news notification
 */
export async function sendBreakingNewsNotification(
  userEmail: string,
  companySymbol: string,
  newsTitle: string,
  newsSummary: string,
  newsUrl: string,
  sentiment: string,
): Promise<boolean> {
  const sentimentEmoji: Record<string, string> = {
    positive: "😊",
    negative: "😟",
    neutral: "😐",
  };
  const emoji = sentimentEmoji[sentiment] || "📰";

  const subject = `FinanceApp: Breaking News - ${companySymbol}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 Breaking News</h2>
      <p><strong>${companySymbol}</strong> - Important news alert:</p>
      <div style="background: #fef2f2; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #dc2626;">
        <h3 style="margin: 0 0 10px 0;">${newsTitle}</h3>
        <p style="margin: 0 0 10px 0; color: #374151;">${newsSummary}</p>
        <p style="margin: 0; font-size: 14px;">
          Sentiment: <span style="background: ${sentiment === "positive" ? "#dcfce7" : sentiment === "negative" ? "#fee2e2" : "#f3f4f6"}; padding: 2px 6px; border-radius: 3px;">
            ${emoji} ${sentiment}
          </span>
        </p>
      </div>
      <p><a href="${newsUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Read Full Article</a></p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated breaking news alert from FinanceApp</p>
    </div>
  `;

  return sendEmailNotification(userEmail, subject, html);
}

/**
 * Send price alert notification
 */
export async function sendPriceAlertNotification(
  userEmail: string,
  companySymbol: string,
  currentPrice: number,
  threshold: number,
  direction: "above" | "below",
  portfolioName?: string,
): Promise<boolean> {
  const subject = `FinanceApp Alert: ${companySymbol} Price ${direction === "above" ? "Above" : "Below"} Threshold`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">💰 Price Alert</h2>
      <p><strong>${companySymbol}</strong> price alert triggered:</p>
      <div style="background: #ecfdf5; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #059669;">
        <p><strong>Current Price:</strong> $${currentPrice.toFixed(2)}</p>
        <p><strong>Threshold:</strong> $${threshold.toFixed(2)}</p>
        <p><strong>Status:</strong> Price is ${direction === "above" ? "above" : "below"} threshold</p>
        ${portfolioName ? `<p><strong>Portfolio:</strong> ${portfolioName}</p>` : ""}
      </div>
      <p>Check your dashboard for more details!</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated price alert from FinanceApp</p>
    </div>
  `;

  return sendEmailNotification(userEmail, subject, html);
}

/**
 * Send weekly summary notification
 */
export async function sendWeeklySummaryNotification(
  userEmail: string,
  summaryData: {
    totalPortfolios: number;
    totalWatchlists: number;
    topMovers: Array<{ symbol: string; change: number; price: number }>;
    recentNews: Array<{ symbol: string; title: string; sentiment: string }>;
  },
): Promise<boolean> {
  const subject = "FinanceApp Weekly Summary";

  const topMoversHtml = summaryData.topMovers
    .map(
      (mover) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${mover.symbol}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${mover.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${mover.change >= 0 ? "#059669" : "#dc2626"};">${mover.change >= 0 ? "+" : ""}${mover.change.toFixed(2)}%</td>
      </tr>
    `,
    )
    .join("");

  const recentNewsHtml = summaryData.recentNews
    .map(
      (news) => `
      <div style="margin-bottom: 10px; padding: 10px; background: #f9fafb; border-radius: 5px;">
        <p style="margin: 0 0 5px 0; font-weight: bold;">${news.symbol}</p>
        <p style="margin: 0 0 5px 0; color: #374151;">${news.title}</p>
        <span style="font-size: 12px; padding: 2px 6px; border-radius: 3px; background: ${news.sentiment === "positive" ? "#dcfce7" : news.sentiment === "negative" ? "#fee2e2" : "#f3f4f6"}; color: ${news.sentiment === "positive" ? "#166534" : news.sentiment === "negative" ? "#991b1b" : "#374151"};">
          ${news.sentiment === "positive" ? "😊" : news.sentiment === "negative" ? "😟" : "😐"} ${news.sentiment}
        </span>
      </div>
    `,
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">FinanceApp Weekly Summary</h2>

      <div style="background: #f0f9ff; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2563eb;">
        <h3 style="margin: 0 0 10px 0;">Your Portfolio Overview</h3>
        <p style="margin: 0;"><strong>${summaryData.totalPortfolios}</strong> portfolios • <strong>${summaryData.totalWatchlists}</strong> watchlists</p>
      </div>

      <div style="margin: 20px 0;">
        <h3>Top Movers This Week</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: left;">Symbol</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Change</th>
            </tr>
          </thead>
          <tbody>
            ${topMoversHtml}
          </tbody>
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h3>Recent News</h3>
        ${recentNewsHtml}
      </div>

      <p style="text-align: center; margin: 20px 0;">
        <a href="https://your-domain.com" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
      </p>

      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is your weekly summary from FinanceApp</p>
    </div>
  `;

  return sendEmailNotification(userEmail, subject, html);
}
