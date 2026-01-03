import nodemailer from 'nodemailer';
import { config } from '../config';

// Debugging Credential Loading
console.log('--- SMTP Configuration Loaded ---');
console.log(`Host: ${config.smtp.host}`);
console.log(`Port: ${config.smtp.port}`);
console.log(`Secure: ${config.smtp.port === 465}`);
console.log(`User: '${config.smtp.user}'`);
console.log(`Pass Length: ${config.smtp.pass ? config.smtp.pass.length : 0}`);
console.log('---------------------------------');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
  debug: true,
  logger: true
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Retry logic for sending emails
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delay - Delay between retries in milliseconds (default: 1000)
 * @returns Promise that resolves when email is sent or all retries are exhausted
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`❌ Email sending failed after ${maxRetries} attempts`);
        throw error;
      }
      
      // Exponential backoff: delay increases with each retry
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      console.warn(`⚠️  Email send attempt ${attempt} failed, retrying in ${backoffDelay}ms... (${maxRetries - attempt} attempts remaining)`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
};

export const sendEmail = async (options: EmailOptions, retries: number = 3): Promise<void> => {
  // In development, if no SMTP credentials are provided, just log the email
  if (config.nodeEnv === 'development' && (!config.smtp.user || !config.smtp.pass)) {
    console.log('---------------------------------------------------');
    console.log(`📧 MOCK EMAIL to ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Content (HTML):');
    console.log(options.html);
    console.log('---------------------------------------------------');
    return;
  }

  // Use retry logic with exponential backoff
  await retryWithBackoff(async () => {
    try {
      const result = await transporter.sendMail({
        from: `"Auth System" <${config.smtp.user}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`✅ Email sent successfully to ${options.to} (Message ID: ${result.messageId})`);
    } catch (error: any) {
      // Log detailed error information
      console.error(`❌ Email sending error for ${options.to}:`, {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        message: error.message
      });
      throw error; // Re-throw to trigger retry
    }
  }, retries);
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verificationUrl = `${config.clientUrl}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f7; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px; }
        .content p { color: #51545e; font-size: 16px; line-height: 1.6; margin: 0 0 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .footer { padding: 20px 40px; background: #f4f4f7; text-align: center; }
        .footer p { color: #9a9ea6; font-size: 14px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Welcome! Please click the button below to verify your email address and activate your account.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Auth System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f7; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px; }
        .content p { color: #51545e; font-size: 16px; line-height: 1.6; margin: 0 0 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .footer { padding: 20px 40px; background: #f4f4f7; text-align: center; }
        .footer p { color: #9a9ea6; font-size: 14px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Auth System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
  });
};
