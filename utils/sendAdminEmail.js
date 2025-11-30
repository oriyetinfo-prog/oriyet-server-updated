import nodemailer from 'nodemailer';

export const sendAdminEmail = async (to, code) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif;">
      <h2>Admin Verification Code</h2>
      <p>Please use the following verification code to confirm admin access:</p>
      <div style="background:#111827;color:#fff;padding:12px;display:inline-block;font-weight:700;border-radius:6px">${code}</div>
      <p>If you did not request this, ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Admin Verification Code',
    html,
  });
};

export default sendAdminEmail;
