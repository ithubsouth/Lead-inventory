import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OMS_BASE_URL = Deno.env.get("OMS_API_BASE_URL") ?? "https://apigw.leadschool.in/oms/warehouse/orders/devices";
const OMS_API_KEY = Deno.env.get("OMS_API_KEY") ?? "f6kA3UF8?9GV";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let soNo = "";

    if (req.method === "GET") {
      soNo = new URL(req.url).searchParams.get("soNo") ?? "";
    } else {
      const body = await req.json().catch(() => ({}));
      soNo = body?.soNo ?? "";
    }

    if (!soNo?.toString().trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing sales order number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const upstreamResponse = await fetch(`${OMS_BASE_URL}?soNo=${encodeURIComponent(soNo)}`, {
      method: "GET",
      headers: {
        api_key: OMS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const raw = await upstreamResponse.text();
    const payload = raw ? JSON.parse(raw) : {};

    return new Response(JSON.stringify(payload), {
      status: upstreamResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("oms-order-details error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch OMS order details",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});