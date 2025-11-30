import nodemailer from "nodemailer";

export const sendDetailsEmail = async (to, sessionInfo, userName) => {
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
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Successful - Session Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial, sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:30px;box-shadow:0 4px 10px rgba(0,0,0,0.1)">
          
          <!-- Header -->
          <tr>
            <td align="center">
              <h1 style="color:#4f46e5;margin:0">Oriyet Organization</h1>
              <p style="color:#16a34a;font-weight:bold;margin-top:6px">
                ✅ Payment Successful
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-top:20px;color:#374151;font-size:16px">
              <p>Dear <strong>${userName}</strong>,</p>

              <p>
                We are pleased to inform you that your payment has been 
                <strong style="color:#16a34a">successfully received</strong>.
              </p>

              <p>
                Your registration for the following session is now 
                <strong>confirmed</strong>.
              </p>
            </td>
          </tr>

          <!-- Session Card -->
          <tr>
            <td style="padding:20px 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;padding:20px;background:#f9fafb">
                
                <tr>
                  <td style="font-size:18px;font-weight:bold;color:#4f46e5">
                    ${sessionInfo.name}
                  </td>
                </tr>

                <tr>
                  <td style="padding:8px 0;color:#374151">
                    ${sessionInfo.tagline}
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;color:#374151;font-size:15px">
                    <strong>Category:</strong> ${sessionInfo.category}
                  </td>
                </tr>

                <tr>
                  <td style="padding:6px 0;color:#374151;font-size:15px">
                    <strong>Date & Time:</strong><br>
                    ${new Date(sessionInfo.startTime).toLocaleString()} – ${new Date(sessionInfo.endTime).toLocaleString()}
                  </td>
                </tr>

                <tr>
                  <td style="padding:6px 0;color:#374151;font-size:15px">
                    <strong>Platform:</strong> ${sessionInfo.platform}
                  </td>
                </tr>

                ${
                  sessionInfo.meetingLink
                    ? `<tr>
                        <td style="padding:10px 0">
                          <a href="${sessionInfo.meetingLink}" 
                             style="background:#4f46e5;color:white;padding:10px 16px;
                             text-decoration:none;border-radius:6px;display:inline-block">
                              Join Session
                          </a>
                        </td>
                      </tr>`
                    : ""
                }

              </table>
            </td>
          </tr>

          <!-- Payment summary -->
          <tr>
            <td style="padding:10px 0;color:#374151;font-size:16px">
              <p><strong>Payment Summary:</strong></p>

              <table width="100%" style="border-collapse:collapse">
                <tr>
                  <td style="padding:6px 0">Amount Paid:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:bold">
                    ৳${sessionInfo.amount}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0">Payment Status:</td>
                  <td style="padding:6px 0;text-align:right;color:#16a34a;font-weight:bold">
                    Paid
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0">Transaction ID:</td>
                  <td style="padding:6px 0;text-align:right">
                    ${`${sessionInfo.transactionId}`? `${sessionInfo.transactionId}` : "xjdhvsh1jhdf5"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer message -->
          <tr>
            <td style="padding-top:20px;color:#374151;font-size:16px">
              <p>
                We’re excited to have you with us!  
                If you have any questions, feel free to contact our support team.
              </p>

              <p>
                Warm Regards,<br>
                <strong>Oriyet Organization</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;font-size:13px;color:#6b7280">
              © ${new Date().getFullYear()} Oriyet Organization. All rights reserved.
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
    subject: "Your payment & session details",
    html,
  };

  await transporter.sendMail(mailOptions);
};
