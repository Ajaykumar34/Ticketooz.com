
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing payment verification data");
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      throw new Error("Razorpay key secret not configured");
    }

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment signature verification failed");
    }

    // Fetch payment details from Razorpay
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        "Authorization": `Basic ${auth}`,
      },
    });

    if (!paymentResponse.ok) {
      throw new Error("Failed to fetch payment details from Razorpay");
    }

    const paymentDetails = await paymentResponse.json();

    if (paymentDetails.status !== "captured") {
      throw new Error("Payment not captured");
    }

    // Log booking data for debugging
    console.log('[VERIFY-PAYMENT] Booking data received:', JSON.stringify(bookingData, null, 2));
    
    // Transform seat numbers to the required format
    const transformedSeatNumbers = Array.isArray(bookingData.seat_numbers) 
      ? bookingData.seat_numbers.map((seat: any) => ({
          price: seat.price || seat.base_price || 0,
          quantity: seat.quantity || "1",
          seat_number: seat.seat_number || seat.id,
          seat_category: seat.seat_category || seat.category || "General",
          total_quantity: "N/A",
          available_quantity: "N/A"
        }))
      : [{
          price: bookingData.total_price || 0,
          quantity: bookingData.quantity?.toString() || "1",
          seat_number: "General",
          seat_category: "General",
          total_quantity: "N/A",
          available_quantity: "N/A"
        }];

    // Create booking in database with transformed seat_numbers format
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        ...bookingData,
        seat_numbers: transformedSeatNumbers,
        user_id: user?.id || null,
        status: "Confirmed",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      throw new Error("Failed to create booking");
    }

    console.log("Payment verified and booking created:", booking.id);

    return new Response(
      JSON.stringify({
        success: true,
        booking,
        payment: {
          id: razorpay_payment_id,
          method: paymentDetails.method,
          amount: paymentDetails.amount / 100, // Convert from paise
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
