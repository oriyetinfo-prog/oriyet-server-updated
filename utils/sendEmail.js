import nodemailer from "nodemailer";

export const sendEmail = async (to, code, sessionInfo, userName) => {
  const { sessionName, sessionDate, speakerName } = sessionInfo;

  // Nodemailer transporter (Gmail example)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // আপনার email
      pass: process.env.EMAIL_PASS, // আপনার app password
    },
  });

  // HTML email template
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: 600; line-height: 1.5; font-family: Arial, Helvetica, sans-serif; text-align: center; padding: 15px 10px; border-bottom: 3px solid #4f46e5;">
                Organization for Research Innovation Youth Empowerment and Sustainability (Oriyet)</h1>
              </td>
            </tr>

            <tr>
              <td style="padding-bottom: 20px; color: #374151; font-size: 16px;">
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Thank you for registering for our session. Please use the following verification code to complete your registration:</p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding: 20px 0;">
                <div style="display: inline-block; padding: 20px 30px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #ffffff; background-color: #4f46e5; border-radius: 8px;">
                  ${code}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-bottom: 20px; color: #374151; font-size: 16px;">
                <p><strong>Session:</strong> ${sessionName}</p>
                <p><strong>Date & Time:</strong> ${sessionDate}</p>
                <p><strong>Speaker:</strong> ${speakerName}</p>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 20px; color: #6b7280; font-size: 14px; text-align: center;">
                <p>Oriyet Organization &copy; ${new Date().getFullYear()}. All rights reserved.</p>
                <p>If you didn't request this email, please ignore it.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // Send email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Verification Code - Oriyet Organization",
    html,
  };

  await transporter.sendMail(mailOptions);
};
