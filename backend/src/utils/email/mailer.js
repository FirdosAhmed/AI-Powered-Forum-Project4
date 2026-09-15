/**
 * Outgoing email.
 *
 * No provider is wired up yet, so messages are written to the server log and
 * the reset link can be copied from the terminal. To send real email, install a
 * transport (nodemailer, Resend, SendGrid) and replace the body of
 * `deliverEmail` only; the callers below do not change.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Hands a message to the configured transport.
 *
 * @param {Object} message - The message to send.
 * @param {string} message.to - The recipient email address.
 * @param {string} message.subject - The subject line.
 * @param {string} message.text - The plain text body.
 * @returns {Promise<void>}
 */
const deliverEmail = async ({ to, subject, text }) => {
  console.log(
    ['', '--- email ---', `to: ${to}`, `subject: ${subject}`, text, ''].join(
      '\n',
    ),
  );
};

/**
 * Emails a password reset link containing the single-use token.
 *
 * @param {Object} payload - The email inputs.
 * @param {string} payload.email - The recipient email address.
 * @param {string} payload.firstName - The recipient's first name.
 * @param {string} payload.token - The plain reset token (never stored).
 * @param {number} payload.expiresInMinutes - Minutes until the link expires.
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async ({
  email,
  firstName,
  token,
  expiresInMinutes,
}) => {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

  await deliverEmail({
    to: email,
    subject: 'Reset your Evangadi Forum password',
    text: [
      `Hi ${firstName},`,
      '',
      'Use the link below to choose a new password:',
      resetUrl,
      '',
      `This link expires in ${expiresInMinutes} minutes and can only be used once.`,
      'If you did not request a reset, you can ignore this email.',
    ].join('\n'),
  });
};
