import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        // Handle CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Initialize Supabase
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

        // Get user from request
        const { user_id } = await request.json();

        if (!user_id) {
            return new Response(
                JSON.stringify({ error: 'User ID required' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                }
            );
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check user's usage for today
        const { data: usage, error: usageError } = await supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', user_id)
            .eq('date', today)
            .single();

        // Get user's subscription plan
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('subscription_plan')
            .eq('user_id', user_id)
            .single();

        const plan = userProfile?.subscription_plan || 'free';

        // Define limits
        const limits = {
            free: 10,
            student: 100,
            premium: -1 // unlimited
        };

        const dailyLimit = limits[plan];
        const currentUsage = usage?.count || 0;

        // Check if user has exceeded limit
        if (dailyLimit !== -1 && currentUsage >= dailyLimit) {
            return new Response(
                JSON.stringify({
                    allowed: false,
                    remaining: 0,
                    limit: dailyLimit,
                    plan: plan,
                    resetTime: 'tomorrow'
                }),
                {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                }
            );
        }

        // Update or create usage record
        if (usage) {
            await supabase
                .from('user_usage')
                .update({ count: currentUsage + 1 })
                .eq('user_id', user_id)
                .eq('date', today);
        } else {
            await supabase
                .from('user_usage')
                .insert({
                    user_id: user_id,
                    date: today,
                    count: 1
                });
        }

        const remaining = dailyLimit === -1 ? -1 : dailyLimit - (currentUsage + 1);

        return new Response(
            JSON.stringify({
                allowed: true,
                remaining: remaining,
                limit: dailyLimit,
                plan: plan,
                resetTime: 'tomorrow'
            }),
            {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
        );

    } catch (error) {
        console.error('Usage tracking error:', error);

        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: error.message
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    }
}