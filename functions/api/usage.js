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

        // Get IP and cost data from request
        const { ip_address, cost_estimate } = await request.json();

        if (!ip_address) {
            return new Response(
                JSON.stringify({ error: 'IP address required' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                }
            );
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check IP's usage for today
        const { data: usage, error: usageError } = await supabase
            .from('ip_usage')
            .select('*')
            .eq('ip_address', ip_address)
            .eq('date', today)
            .single();

        // 10 cent daily budget = 4 questions at 2.5 cents each
        const dailyBudget = 0.10; // $0.10
        const dailyQuestionLimit = Math.floor(dailyBudget / (cost_estimate || 0.025));

        const currentUsage = usage?.question_count || 0;
        const currentCost = usage?.total_cost || 0;

        // Check if user has exceeded budget or question limit
        const nextCost = currentCost + (cost_estimate || 0.025);

        if (currentUsage >= dailyQuestionLimit || nextCost > dailyBudget) {
            return new Response(
                JSON.stringify({
                    allowed: false,
                    remaining: 0,
                    limit: dailyQuestionLimit,
                    current_cost: currentCost,
                    daily_budget: dailyBudget,
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
                .from('ip_usage')
                .update({
                    question_count: currentUsage + 1,
                    total_cost: nextCost
                })
                .eq('ip_address', ip_address)
                .eq('date', today);
        } else {
            await supabase
                .from('ip_usage')
                .insert({
                    ip_address: ip_address,
                    date: today,
                    question_count: 1,
                    total_cost: cost_estimate || 0.025
                });
        }

        const remaining = dailyQuestionLimit - (currentUsage + 1);
        const remainingBudget = dailyBudget - nextCost;

        return new Response(
            JSON.stringify({
                allowed: true,
                remaining: remaining,
                limit: dailyQuestionLimit,
                current_cost: nextCost,
                remaining_budget: remainingBudget,
                daily_budget: dailyBudget,
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