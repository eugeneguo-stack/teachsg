export async function onRequestGet(context) {
    const { env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS request for CORS
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Check if environment variables are set
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            return new Response(
                JSON.stringify({
                    error: 'Supabase configuration not found',
                    message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables in Cloudflare Pages',
                    configured: false
                }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        return new Response(
            JSON.stringify({
                supabaseUrl: env.SUPABASE_URL,
                supabaseAnonKey: env.SUPABASE_ANON_KEY,
                configured: true
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                configured: false
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}