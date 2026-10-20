import nodemailer from "nodemailer";
import { siteConfig } from "@/site.config";
import { isSafeMailbox } from "@/lib/tip-mail";

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

/**
 * All four SMTP variables are required. A missing or invalid value means
 * "do not send", which the submit form treats as success.
 */
export function readSmtpSettings(
  env: Record<string, string | undefined> = process.env,
): SmtpSettings | null {
  const host = (env.SMTP_HOST ?? "").trim();
  const portRaw = (env.SMTP_PORT ?? "").trim();
  const user = (env.SMTP_USER ?? "").trim();
  const pass = (env.SMTP_PASS ?? "").trim();
  if (!host || !portRaw || !user || !pass) return null;
  if (!/^\d{1,5}$/.test(portRaw)) return null;
  const port = Number(portRaw);
  if (port < 1 || port > 65535) return null;
  return { host, port, user, pass };
}

/** From and To are always the single site mailbox. */
export function submissionMailbox(): { from: string; to: string } {
  const address = siteConfig.contactEmail;
  return { from: address, to: address };
}

export async function sendStoryTipEmail(input: {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<"sent" | "skipped"> {
  const settings = readSmtpSettings();
  if (!settings) {
    console.warn(
      "[submit] SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are not all set. Skipping email.",
    );
    return "skipped";
  }

  const mailbox = submissionMailbox();
  const replyTo = input.replyTo && isSafeMailbox(input.replyTo) ? input.replyTo : undefined;
  const secure = settings.port === 465;
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure,
    requireTLS: settings.port === 587,
    auth: { user: settings.user, pass: settings.pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  try {
    await transporter.sendMail({
      from: { name: siteConfig.name, address: mailbox.from },
      to: mailbox.to,
      replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } finally {
    transporter.close();
  }
  console.log("[submit] emailed story tip to the site mailbox");
  return "sent";
}
