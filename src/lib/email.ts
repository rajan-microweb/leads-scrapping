/**
 * Email utility for sending password reset emails
 * 
 * For production, configure these environment variables:
 * - SMTP_HOST: Your SMTP server host
 * - SMTP_PORT: SMTP port (usually 587 for TLS)
 * - SMTP_USER: SMTP username
 * - SMTP_PASSWORD: SMTP password
 * - SMTP_FROM: Email address to send from
 * - APP_URL: Your application URL (e.g., http://localhost:3000)
 * 
 * For development, emails will be logged to console.
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD
  const smtpFrom = process.env.SMTP_FROM || "noreply@example.com"
  const appUrl = process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000"

  // If SMTP is not configured, log to console (development mode)
  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.log("=".repeat(60))
    console.log("EMAIL (Development Mode - SMTP not configured)")
    console.log("=".repeat(60))
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log("Body:")
    console.log(html)
    console.log("=".repeat(60))
    console.log("\nTo enable email sending, configure SMTP environment variables:")
    console.log("- SMTP_HOST")
    console.log("- SMTP_PORT")
    console.log("- SMTP_USER")
    console.log("- SMTP_PASSWORD")
    console.log("- SMTP_FROM")
    console.log("=".repeat(60))
    return true // Return true in dev mode so flow continues
  }

  // Production: Send actual email using nodemailer
  try {
    const nodemailer = await import("nodemailer")

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || "587"),
      secure: smtpPort === "465", // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    })

    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

export function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; margin-top: 0;">Password Reset Request</h1>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  `
}
