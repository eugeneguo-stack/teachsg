export async function onRequestGet(context) {
    const { env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    return new Response(
        JSON.stringify({
            supabaseUrl: env.SUPABASE_URL,
            supabaseAnonKey: env.SUPABASE_ANON_KEY
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        }
    );
}