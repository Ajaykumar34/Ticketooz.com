import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BlockNotificationRequest {
  userEmail: string;
  userName: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, reason }: BlockNotificationRequest = await req.json();

    console.log('Sending block notification to:', userEmail);

    const emailResponse = await resend.emails.send({
      from: "Dexotix Support <noreply@dexotix.com>",
      to: [userEmail],
      subject: "Account Access Blocked - Dexotix",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Account Access Blocked</h1>
          </div>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0; color: #991b1b;">
              <strong>Your account access has been temporarily blocked.</strong>
            </p>
          </div>
          
          <p>Dear ${userName || 'User'},</p>
          
          <p>We are writing to inform you that your account access on Dexotix has been temporarily blocked.</p>
          
          ${reason ? `
            <div style="background-color: #f9fafb; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">Reason:</p>
              <p style="margin: 5px 0 0 0;">${reason}</p>
            </div>
          ` : ''}
          
          <p>If you believe this action was taken in error or would like to discuss this matter, please contact our support team immediately.</p>
          
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Contact Support</h3>
            <p style="margin: 0;">
              Email: <a href="mailto:help@dexotix.com" style="color: #2563eb;">help@dexotix.com</a><br>
              Please include your email address and any relevant details when contacting support.
            </p>
          </div>
          
          <p>We apologize for any inconvenience this may cause and appreciate your understanding.</p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">
              This is an automated message from Dexotix.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Block notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending block notification:", error);
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