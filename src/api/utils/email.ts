import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resend REST API configuration
const RESEND_API_KEY = process.env.SMTP_PASS || process.env.RESEND_API_KEY || '';
const SMTP_FROM = process.env.SMTP_FROM || '"Xane PMS" <onboarding@resend.dev>';

// Logs directory for fallback email logging
const logsDir = path.join(__dirname, '..', '..', '..', 'logs');
const emailLogPath = path.join(logsDir, 'emails.log');

function ensureLogsDirectory() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/** Calls Resend REST API directly via Node https, bypassing SSL proxy issues */
function callResendApi(payload: object): Promise<{ id?: string; error?: string }> {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const options: https.RequestOptions = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      // Bypass SSL interception by corporate proxy (same as NODE_TLS_REJECT_UNAUTHORIZED=0)
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ id: parsed.id });
          } else {
            resolve({ error: parsed.message || `HTTP ${res.statusCode}` });
          }
        } catch {
          resolve({ error: `Invalid JSON response: ${data}` });
        }
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ error: 'Request timed out after 15s' });
    });

    req.write(body);
    req.end();
  });
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  // Use Resend REST API if key is configured
  if (RESEND_API_KEY) {
    try {
      const result = await callResendApi({
        from: SMTP_FROM,
        to: [to],
        subject,
        text,
        html,
      });

      if (result.error) {
        console.error('[Email Failed] Resend API error:', result.error);
        // Fall through to log fallback
      } else {
        console.log(`[Email Sent] Resend Message ID: ${result.id} → ${to}`);
        return { success: true, messageId: result.id };
      }
    } catch (error) {
      console.error('[Email Failed] Resend call exception, falling back to local logs:', error);
    }
  }

  // Fallback to local logs
  try {
    ensureLogsDirectory();
    const logMessage = `
========================================
[TIMESTAMP] ${new Date().toISOString()}
[TO]        ${to}
[SUBJECT]   ${subject}
----------------------------------------
[TEXT CONTENT]
${text}
----------------------------------------
[HTML CONTENT]
${html}
========================================
`;
    fs.appendFileSync(emailLogPath, logMessage, 'utf-8');
    console.log(`[Email Logged] Email to "${to}" logged to logs/emails.log (Resend not configured or failed)`);
    return { success: true, logged: true };
  } catch (logError) {
    console.error('[Email Logger Failed] Could not write email to log file:', logError);
    console.log(`[Email Console Fallback] To: ${to} | Subject: ${subject}\nText: ${text}`);
    return { success: false, error: 'Failed to write log' };
  }
}

/**
 * Generates modern HTML template for password reset email
 */
export function getPasswordResetHtml(resetLink: string, userName: string) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.05em; margin: 0; color: #0f172a;">Xane PMS</h1>
        <p style="font-size: 14px; color: #64748b; margin-top: 5px;">Hotel Property Management System</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
        <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #0f172a;">Password Reset Request</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          Hello ${userName},<br/>
          We received a request to reset the password associated with your account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
        </p>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 32px; border-radius: 12px; transition: background-color 0.2s;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 0;">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for booking confirmation email
 */
export function getBookingConfirmationHtml(booking: any, hotel: { name: string; address: string | null }) {
  const nights = Math.max(1, (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (86400000));
  
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.05em; margin: 0; color: #0f172a;">${hotel.name}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.1em;">${hotel.address || 'Booking Confirmation'}</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #dcfce7; color: #15803d; padding: 8px 16px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
            Booking Confirmed
          </div>
          <h2 style="font-size: 24px; font-weight: 800; margin-top: 15px; margin-bottom: 5px;">Thank You for Your Booking!</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Reservation Ref: #B-${booking.id}</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569;">
          Dear ${booking.guestName},<br/>
          We are delighted to confirm your upcoming stay with us. Below are your booking details. We look forward to welcoming you!
        </p>
        
        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 15px;">Stay Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Guest Name:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.guestName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Check-In Date:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.checkInDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Check-Out Date:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.checkOutDate} (${nights} Night${nights > 1 ? 's' : ''})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Guests Count:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.pax} Guests</td>
            </tr>
            ${booking.roomCount ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Rooms Booked:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.roomCount} Room${booking.roomCount > 1 ? 's' : ''}</td>
            </tr>
            ` : ''}
            ${booking.roomTypeName ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Room Type:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.roomTypeName}</td>
            </tr>
            ` : ''}
            ${booking.planName ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Meal Plan:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.planName}</td>
            </tr>
            ` : ''}
            ${booking.notes ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b; vertical-align: top;">Special Requests:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 500; text-align: right; color: #475569;">${booking.notes}</td>
            </tr>
            ` : ''}
          </table>
        </div>
      </div>
      
      <div style="background-color: #0f172a; padding: 30px; border-radius: 20px; color: #ffffff;">
        <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-top: 0; margin-bottom: 10px;">Need Help?</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0;">
          If you have any questions, feel free to reply directly to this email or contact us at our address above. See you soon!
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for onboarding signup verification code
 */
export function getOnboardingOtpHtml(otpCode: string, adminName: string) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.05em; margin: 0; color: #0f172a;">Xane PMS</h1>
        <p style="font-size: 14px; color: #64748b; margin-top: 5px;">Property Onboarding Verification</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
        <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #0f172a;">Email Verification Code</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          Hello ${adminName},<br/>
          Thank you for choosing Xane PMS to run your property! To proceed with setting up your hotel workspace, please use the following One-Time Verification Code:
        </p>
        
        <div style="text-align: center; margin: 35px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px 36px; border-radius: 16px; font-size: 32px; font-weight: 800; letter-spacing: 0.15em; color: #1e3a8a; font-family: monospace;">
            ${otpCode}
          </div>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 0;">
          This code is valid for <strong>10 minutes</strong>. If you did not initiate this request, you can safely ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for guest Check-in confirmation email
 */
export function getCheckInConfirmationHtml(booking: any, roomNumber: string, pinCode: string, hotel: { name: string; address: string | null }) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 950; letter-spacing: -0.05em; margin: 0; color: #0f172a;">${hotel.name}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.15em;">Check-in Confirmation</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 8px 18px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
            Checked In
          </div>
          <h2 style="font-size: 24px; font-weight: 800; margin-top: 15px; margin-bottom: 5px;">Welcome to Your Room!</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Reservation Ref: #B-${booking.id}</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569;">
          Dear ${booking.guestName},<br/>
          You have been successfully checked in. Below is your room assignment and your digital access information.
        </p>
        
        <div style="margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Room</span>
            <span style="font-weight: 900; font-size: 18px; color: #1e3a8a;">Room ${roomNumber}</span>
          </div>
          <div style="padding: 20px; text-align: center; background-color: #ffffff;">
            <div style="font-size: 12px; text-transform: uppercase; tracking-wider; font-weight: 800; color: #64748b; margin-bottom: 8px;">Your Guest Portal login PIN</div>
            <div style="display: inline-block; background-color: #fef08a; color: #713f12; padding: 10px 24px; border-radius: 8px; font-size: 24px; font-weight: 850; letter-spacing: 0.1em;">
              ${pinCode}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 12px;">
              Access room service orders, chat with staff, or request amenities by logging in at your room's smart display or visiting your guest dashboard.
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Guest Name:</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.guestName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Check-Out Date:</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${booking.checkOutDate}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #0f172a; padding: 30px; border-radius: 20px; color: #ffffff;">
        <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-top: 0; margin-bottom: 10px;">Enjoy Your Stay!</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0;">
          Let us know if you need fresh towels, room service, or local recommendations. Simply reply to this email or request it on the portal.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for guest Check-out confirmation email
 */
export function getCheckOutConfirmationHtml(booking: any, hotel: { name: string; address: string | null }) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 950; letter-spacing: -0.05em; margin: 0; color: #0f172a;">${hotel.name}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.15em;">Check-Out Confirmation</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px; text-align: center;">
        <div style="display: inline-block; background-color: #fee2e2; color: #b91c1c; padding: 8px 18px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 15px;">
          Checked Out
        </div>
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 20px;">Thank You for Staying With Us!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569; text-align: left; margin-bottom: 24px;">
          Dear ${booking.guestName},<br/>
          Your check-out has been processed. We sincerely hope you enjoyed your stay at ${hotel.name}. 
          An invoice summary has been generated for your record (Reference #B-${booking.id}). 
          We look forward to hosting you again in the future!
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for booking cancellation email
 */
export function getBookingCancellationHtml(booking: any, hotel: { name: string; address: string | null }) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 950; letter-spacing: -0.05em; margin: 0; color: #0f172a;">${hotel.name}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.15em;">Cancellation Confirmation</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px; text-align: center;">
        <div style="display: inline-block; background-color: #f3f4f6; color: #4b5563; padding: 8px 18px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 15px;">
          Cancelled
        </div>
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 20px;">Reservation Cancelled</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569; text-align: left; margin-bottom: 0;">
          Dear ${booking.guestName},<br/>
          This is to confirm that your reservation with reference <strong>#B-${booking.id}</strong> has been cancelled. 
          If you have any questions regarding refunds or re-booking, feel free to reply directly to this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for booking status confirmed email
 * Sent when a booking transitions from 'pending' to 'confirmed' by the hotel team
 */
export function getBookingStatusConfirmedHtml(booking: any, hotel: { name: string; address: string | null }) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.05em; margin: 0; color: #0f172a;">${hotel.name}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.15em;">${hotel.address || 'Reservation Update'}</p>
      </div>

      <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #dcfce7; color: #15803d; padding: 8px 20px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;">
            ✓ Confirmed
          </div>
          <h2 style="font-size: 24px; font-weight: 800; margin-top: 16px; margin-bottom: 6px; color: #0f172a;">Booking Confirmed!</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Reservation Ref: <strong>#B-${booking.id}</strong></p>
        </div>

        <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          Dear ${booking.guestName},<br/>
          Great news! Your booking has been reviewed and confirmed by the hotel team. We are looking forward to welcoming you.
        </p>

        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 14px;">Reservation Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Guest Name:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${booking.guestName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Check-In:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${booking.checkInDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Check-Out:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${booking.checkOutDate}</td>
            </tr>
            ${booking.roomTypeName ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Room Type:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${booking.roomTypeName}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="margin-top: 28px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 20px 24px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #15803d; margin-top: 0; margin-bottom: 8px;">Arrival Information</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #166534; margin: 0;">
            Your booking has been reviewed and confirmed by the hotel team. Please arrive by <strong>2:00 PM</strong> on your check-in date. Early check-in is subject to room availability — contact us in advance if needed.
          </p>
        </div>
      </div>

      <div style="background-color: #0f172a; padding: 30px; border-radius: 20px; color: #ffffff; margin-bottom: 24px;">
        <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-top: 0; margin-bottom: 10px;">Questions?</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0;">
          Feel free to reply to this email or contact the hotel directly. We are happy to assist with any arrangements before your arrival.
        </p>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for new staff member welcome email
 * Sent when a staff account is created for a hotel workspace
 */
export function getStaffWelcomeHtml(staffName: string, staffEmail: string, staffRole: string, hotelName: string, tempPassword: string) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="background-color: #0f172a; padding: 36px 40px; border-radius: 20px 20px 0 0; text-align: center; margin-bottom: 0;">
        <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; margin: 0; color: #ffffff;">${hotelName}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.15em;">Staff Workspace</p>
      </div>

      <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 20px 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #ede9fe; color: #6d28d9; padding: 8px 20px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">
            Welcome to the Team
          </div>
          <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 6px; color: #0f172a;">Hello, ${staffName}! 👋</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">You have been added to the <strong>${hotelName}</strong> workspace on Xane PMS.</p>
        </div>

        <div style="margin-bottom: 28px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 14px;">Your Account Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Full Name:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${staffName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${staffEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Role:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${staffRole}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef9c3; border: 1px solid #fde68a; border-radius: 14px; padding: 20px 24px; margin-bottom: 28px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #92400e; margin-top: 0; margin-bottom: 10px;">🔑 Temporary Password</h3>
          <div style="font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 0.12em; color: #78350f; background-color: #fffbeb; padding: 10px 16px; border-radius: 8px; display: inline-block; margin-bottom: 10px;">
            ${tempPassword}
          </div>
          <p style="font-size: 13px; color: #92400e; margin: 0;">Please change this password immediately after your first login for security.</p>
        </div>

        <div style="background-color: #0f172a; border-radius: 14px; padding: 24px; text-align: center;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-top: 0; margin-bottom: 12px;">Get Started</h3>
          <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 20px;">Log in to your staff dashboard to manage bookings, guests, and more.</p>
          <a href="/login" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
            Go to Login →
          </a>
        </div>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates modern HTML template for new travel agent welcome email
 * Sent when a travel agent account is created for a hotel workspace
 */
export function getAgentWelcomeHtml(agentName: string, agentEmail: string, hotelName: string, tempPassword: string) {
  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; border-radius: 24px;">
      <div style="background-color: #0f172a; padding: 36px 40px; border-radius: 20px 20px 0 0; text-align: center; margin-bottom: 0;">
        <h1 style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; margin: 0; color: #ffffff;">${hotelName}</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.15em;">Travel Agent Portal</p>
      </div>

      <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 20px 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 8px 20px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">
            Agent Account Ready
          </div>
          <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 6px; color: #0f172a;">Welcome, ${agentName}! 🌐</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Your travel agent account has been set up for <strong>${hotelName}</strong> on Xane PMS.</p>
        </div>

        <div style="margin-bottom: 28px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 14px;">Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Agent Name:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${agentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Email / Username:</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right; color: #0f172a;">${agentEmail}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef9c3; border: 1px solid #fde68a; border-radius: 14px; padding: 20px 24px; margin-bottom: 28px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #92400e; margin-top: 0; margin-bottom: 10px;">🔑 Temporary Password</h3>
          <div style="font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 0.12em; color: #78350f; background-color: #fffbeb; padding: 10px 16px; border-radius: 8px; display: inline-block; margin-bottom: 10px;">
            ${tempPassword}
          </div>
          <p style="font-size: 13px; color: #92400e; margin: 0;">Change this password after your first login to secure your account.</p>
        </div>

        <div style="margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-top: 0; margin-bottom: 14px;">What You Can Do</h3>
          <ul style="margin: 0; padding: 0 0 0 20px; list-style: none;">
            <li style="font-size: 14px; color: #475569; padding: 6px 0; padding-left: 0;">
              <span style="color: #6366f1; font-weight: 700; margin-right: 8px;">✦</span>Start creating bookings immediately for your clients
            </li>
            <li style="font-size: 14px; color: #475569; padding: 6px 0; padding-left: 0;">
              <span style="color: #6366f1; font-weight: 700; margin-right: 8px;">✦</span>Access real-time commission tracking and reporting
            </li>
            <li style="font-size: 14px; color: #475569; padding: 6px 0; padding-left: 0;">
              <span style="color: #6366f1; font-weight: 700; margin-right: 8px;">✦</span>Manage and review your full booking portfolio
            </li>
            <li style="font-size: 14px; color: #475569; padding: 6px 0; padding-left: 0;">
              <span style="color: #6366f1; font-weight: 700; margin-right: 8px;">✦</span>Check live room availability across room types
            </li>
          </ul>
        </div>

        <div style="background-color: #0f172a; border-radius: 14px; padding: 24px; text-align: center;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-top: 0; margin-bottom: 12px;">Start Booking Now</h3>
          <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 20px;">Log in to your agent portal to get started. You can begin placing bookings right away.</p>
          <a href="/login" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
            Access Agent Portal →
          </a>
        </div>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Generates a compact operational alert email for hotel admins
 * Sent when a guest checks in or checks out
 */
export function getAdminBookingAlertHtml(booking: any, eventType: 'checkin' | 'checkout', hotel: { name: string; address: string | null }) {
  const isCheckIn = eventType === 'checkin';
  const eventLabel = isCheckIn ? 'Guest Check-In' : 'Guest Check-Out';
  const badgeColor = isCheckIn ? '#dbeafe' : '#fee2e2';
  const badgeText = isCheckIn ? '#1d4ed8' : '#b91c1c';
  const badgeLabel = isCheckIn ? '▲ Check-In' : '▼ Check-Out';
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; background-color: #f1f5f9; color: #0f172a; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <p style="font-size: 11px; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 0.12em;">Operational Alert — ${hotel.name}</p>
      </div>

      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06); margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 18px;">
          <div>
            <div style="display: inline-block; background-color: ${badgeColor}; color: ${badgeText}; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
              ${badgeLabel}
            </div>
            <h2 style="font-size: 18px; font-weight: 800; margin: 0; color: #0f172a;">${eventLabel} Alert</h2>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 0.06em;">Ref</p>
            <p style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 2px 0 0 0;">#B-${booking.id}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 7px 0; font-size: 13px; color: #64748b; width: 40%;">Guest Name:</td>
            <td style="padding: 7px 0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">${booking.guestName}</td>
          </tr>
          ${booking.roomNumber ? `
          <tr>
            <td style="padding: 7px 0; font-size: 13px; color: #64748b;">Room Number:</td>
            <td style="padding: 7px 0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">Room ${booking.roomNumber}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 7px 0; font-size: 13px; color: #64748b;">Check-In Date:</td>
            <td style="padding: 7px 0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">${booking.checkInDate}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; font-size: 13px; color: #64748b;">Check-Out Date:</td>
            <td style="padding: 7px 0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">${booking.checkOutDate}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; font-size: 13px; color: #64748b;">Event Timestamp:</td>
            <td style="padding: 7px 0; font-size: 13px; font-weight: 600; text-align: right; color: #475569;">${timestamp}</td>
          </tr>
          ${booking.pax ? `
          <tr>
            <td style="padding: 7px 0; font-size: 13px; color: #64748b;">Guests:</td>
            <td style="padding: 7px 0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">${booking.pax} guest${booking.pax > 1 ? 's' : ''}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="background-color: #0f172a; padding: 20px 24px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">
          This is an automated operational notification from <strong style="color: #e2e8f0;">${hotel.name}</strong> via Xane PMS. No action required.
        </p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 Xane Media Group. All rights reserved.
      </div>
    </div>
  `;
}


