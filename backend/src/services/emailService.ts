/**
 * Email sending via SMTP (nodemailer).
 * If SMTP is not configured, logs to console for development.
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@example.com';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Send a generic email. If SMTP is not configured, logs to console.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const transporter = getTransporter();
  const from = typeof MAIL_FROM === 'string' && MAIL_FROM.includes('<') ? MAIL_FROM : `"ConversaTree" <${MAIL_FROM}>`;

  if (!transporter) {
    console.log('[Email not configured – would have sent]', {
      to: options.to,
      subject: options.subject,
      text: options.text.slice(0, 200) + (options.text.length > 200 ? '…' : ''),
    });
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br>\n'),
    });
  } catch (err) {
    console.error('Email send error:', err);
    throw err;
  }
}

/**
 * Send workspace invite email with link to create account and join.
 */
export async function sendWorkspaceInviteEmail(
  to: string,
  workspaceName: string,
  inviteLink: string
): Promise<void> {
  const subject = `You're invited to join ${workspaceName}`;
  const text = [
    `You've been invited to join the workspace "${workspaceName}".`,
    '',
    'Create your account to get started:',
    inviteLink,
    '',
    'This link expires in 7 days. If you didn’t expect this invite, you can ignore this email.',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #334155; max-width: 480px;">
  <p>You've been invited to join the workspace <strong>${escapeHtml(workspaceName)}</strong>.</p>
  <p>Create your account to get started:</p>
  <p><a href="${escapeHtml(inviteLink)}" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px;">Create account &amp; join</a></p>
  <p style="font-size: 13px; color: #64748b;">This link expires in 7 days. If you didn't expect this invite, you can ignore this email.</p>
</body>
</html>`.trim();

  await sendEmail({ to, subject, text, html });
}

/**
 * Send password reset email with link to set new password.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const subject = 'Reset your ConversaTree password';
  const text = [
    'You requested a password reset for your ConversaTree account.',
    '',
    'Click the link below to set a new password:',
    resetLink,
    '',
    'This link expires in 1 hour. If you didn’t request this, you can ignore this email.',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #334155; max-width: 480px;">
  <p>You requested a password reset for your ConversaTree account.</p>
  <p>Click the button below to set a new password:</p>
  <p><a href="${escapeHtml(resetLink)}" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px;">Reset password</a></p>
  <p style="font-size: 13px; color: #64748b;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
</body>
</html>`.trim();

  await sendEmail({ to, subject, text, html });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
