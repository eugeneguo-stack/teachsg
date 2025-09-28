import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        // Handle CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Initialize Supabase
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check global daily usage
        const { data: globalUsage, error } = await supabase
            .from('global_usage')
            .select('*')
            .eq('date', today)
            .single();

        const dailyGlobalLimit = 10.00; // $10 daily global limit
        const currentGlobalCost = globalUsage?.total_cost || 0;
        const estimatedCost = 0.025; // Cost per question

        // Check if adding this question would exceed global limit
        if (currentGlobalCost + estimatedCost > dailyGlobalLimit) {
            return new Response(
                JSON.stringify({
                    allowed: false,
                    reason: 'global_limit_reached',
                    message: 'Daily platform limit reached ($10). Service will resume tomorrow.',
                    current_global_cost: currentGlobalCost,
                    global_limit: dailyGlobalLimit,
                    reset_time: 'tomorrow'
                }),
                {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                }
            );
        }

        // Update or create global usage record
        if (globalUsage) {
            await supabase
                .from('global_usage')
                .update({
                    total_cost: currentGlobalCost + estimatedCost,
                    question_count: (globalUsage.question_count || 0) + 1
                })
                .eq('date', today);
        } else {
            await supabase
                .from('global_usage')
                .insert({
                    date: today,
                    total_cost: estimatedCost,
                    question_count: 1
                });
        }

        const remainingBudget = dailyGlobalLimit - (currentGlobalCost + estimatedCost);

        return new Response(
            JSON.stringify({
                allowed: true,
                current_global_cost: currentGlobalCost + estimatedCost,
                remaining_global_budget: remainingBudget,
                global_limit: dailyGlobalLimit,
                questions_served_today: (globalUsage?.question_count || 0) + 1
            }),
            {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
        );

    } catch (error) {
        console.error('Global usage tracking error:', error);

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