import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WaitlistRequest {
  email_or_phone: string;
  name: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email_or_phone, name, role }: WaitlistRequest = await req.json();

    const isEmail = email_or_phone.includes('@');
    
    if (isEmail) {
      console.log(`Sending welcome email to: ${email_or_phone}`);
      console.log(`Name: ${name}, Role: ${role}`);
      
      // Email sending would be integrated here with a service like Resend, SendGrid, etc.
      // For now, we'll just log it and return success
    } else {
      console.log(`SMS notification for: ${email_or_phone}`);
      console.log(`Name: ${name}, Role: ${role}`);
      
      // SMS sending would be integrated here with a service like Twilio, Africa's Talking, etc.
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Welcome notification queued",
        type: isEmail ? 'email' : 'sms'
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error processing waitlist notification:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to process notification" 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
