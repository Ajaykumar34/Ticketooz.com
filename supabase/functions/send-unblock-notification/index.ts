
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UnblockNotificationRequest {
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName }: UnblockNotificationRequest = await req.json();

    console.log('Sending unblock notification to:', userEmail);

    const emailResponse = await resend.emails.send({
      from: "Dexotix Support <noreply@dexotix.com>",
      to: [userEmail],
      subject: "Account Access Restored - Dexotix",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0;">Account Access Restored</h1>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0; color: #15803d;">
              <strong>Your account access has been restored!</strong>
            </p>
          </div>
          
          <p>Dear ${userName || 'User'},</p>
          
          <p>We are pleased to inform you that your account access on Dexotix has been successfully restored.</p>
          
          <p>You can now:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Log in to your account</li>
            <li>Browse and book events</li>
            <li>Access all platform features</li>
            <li>Enjoy our services without restrictions</li>
          </ul>
          
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Get Started</h3>
            <p style="margin: 0;">
              Visit our platform: <a href="https://dexotix.com" style="color: #2563eb;">https://dexotix.com</a><br>
              If you experience any issues, please don't hesitate to contact our support team.
            </p>
          </div>
          
          <p>We apologize for any inconvenience caused during the temporary restriction and look forward to providing you with an excellent experience on our platform.</p>
          
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Need Help?</h3>
            <p style="margin: 0;">
              Email: <a href="mailto:help@dexotix.com" style="color: #2563eb;">help@dexotix.com</a><br>
              Our support team is here to assist you with any questions or concerns.
            </p>
          </div>
          
          <p>Thank you for being a valued member of the Dexotix community!</p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">
              This is an automated message from Dexotix.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Unblock notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending unblock notification:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send notification email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
