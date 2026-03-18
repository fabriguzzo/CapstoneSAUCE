const { Resend } = require('resend');

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
let hasWarnedAboutMissingResendKey = false;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (!hasWarnedAboutMissingResendKey) {
      console.warn('RESEND_API_KEY is not set. Email sending is disabled until it is added to the environment.');
      hasWarnedAboutMissingResendKey = true;
    }

    throw new Error('Missing RESEND_API_KEY in environment variables');
  }

  return new Resend(apiKey);
}

exports.sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const resend = getResendClient();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'SAUCE — Reset Your Password',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff2d1; border-radius: 8px;">
        <h2 style="color: #005F02; text-align: center;">SAUCE</h2>
        <p style="color: #333;">You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #005F02; color: #fff2d1; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `
  });
};

exports.sendApprovalNotificationEmail = async (toEmail, teamName) => {
  const resend = getResendClient();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'SAUCE — You\'ve Been Approved!',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff2d1; border-radius: 8px;">
        <h2 style="color: #005F02; text-align: center;">SAUCE</h2>
        <p style="color: #333;">Great news! Your request to join <strong>${teamName}</strong> has been approved by your coach.</p>
        <p style="color: #333;">You can now log in and access the stat tracker and your assigned stats.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background: #005F02; color: #fff2d1; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Log In</a>
        </div>
      </div>
    `
  });
};
