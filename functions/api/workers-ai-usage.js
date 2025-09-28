// Workers AI Usage Monitoring for GPT-OSS-120B
// Track costs and token usage to prevent overspending

export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        // Handle CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Get the current date for daily tracking
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // KV keys for tracking
        const dailyUsageKey = `workers-ai-usage-${today}`;
        const monthlyUsageKey = `workers-ai-usage-${today.slice(0, 7)}`; // YYYY-MM format

        // Get current usage from KV
        let dailyUsage = await env.RESPONSE_CACHE.get(dailyUsageKey, { type: 'json' }) || {
            date: today,
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            estimated_cost: 0,
            gpt_oss_120b_requests: 0
        };

        let monthlyUsage = await env.RESPONSE_CACHE.get(monthlyUsageKey, { type: 'json' }) || {
            month: today.slice(0, 7),
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            estimated_cost: 0,
            gpt_oss_120b_requests: 0
        };

        // Calculate current costs based on GPT-OSS-120B pricing
        const INPUT_COST_PER_M_TOKENS = 0.350; // $0.350 per M input tokens
        const OUTPUT_COST_PER_M_TOKENS = 0.750; // $0.750 per M output tokens

        const dailyCostEstimate =
            (dailyUsage.total_input_tokens / 1000000) * INPUT_COST_PER_M_TOKENS +
            (dailyUsage.total_output_tokens / 1000000) * OUTPUT_COST_PER_M_TOKENS;

        const monthlyCostEstimate =
            (monthlyUsage.total_input_tokens / 1000000) * INPUT_COST_PER_M_TOKENS +
            (monthlyUsage.total_output_tokens / 1000000) * OUTPUT_COST_PER_M_TOKENS;

        // Cost limits and warnings
        const DAILY_COST_LIMIT = 5.00; // $5 per day
        const MONTHLY_COST_LIMIT = 50.00; // $50 per month
        const WARNING_THRESHOLD = 0.8; // 80% of limit

        const dailyWarning = dailyCostEstimate >= (DAILY_COST_LIMIT * WARNING_THRESHOLD);
        const monthlyWarning = monthlyCostEstimate >= (MONTHLY_COST_LIMIT * WARNING_THRESHOLD);
        const dailyLimitReached = dailyCostEstimate >= DAILY_COST_LIMIT;
        const monthlyLimitReached = monthlyCostEstimate >= MONTHLY_COST_LIMIT;

        // Usage statistics
        const usageStats = {
            daily: {
                date: today,
                requests: dailyUsage.total_requests,
                input_tokens: dailyUsage.total_input_tokens,
                output_tokens: dailyUsage.total_output_tokens,
                estimated_cost: dailyCostEstimate,
                limit: DAILY_COST_LIMIT,
                percentage_used: (dailyCostEstimate / DAILY_COST_LIMIT) * 100,
                warning: dailyWarning,
                limit_reached: dailyLimitReached,
                gpt_oss_120b_requests: dailyUsage.gpt_oss_120b_requests
            },
            monthly: {
                month: today.slice(0, 7),
                requests: monthlyUsage.total_requests,
                input_tokens: monthlyUsage.total_input_tokens,
                output_tokens: monthlyUsage.total_output_tokens,
                estimated_cost: monthlyCostEstimate,
                limit: MONTHLY_COST_LIMIT,
                percentage_used: (monthlyCostEstimate / MONTHLY_COST_LIMIT) * 100,
                warning: monthlyWarning,
                limit_reached: monthlyLimitReached,
                gpt_oss_120b_requests: monthlyUsage.gpt_oss_120b_requests
            },
            pricing: {
                model: 'GPT-OSS-120B',
                input_cost_per_m_tokens: INPUT_COST_PER_M_TOKENS,
                output_cost_per_m_tokens: OUTPUT_COST_PER_M_TOKENS,
                cost_comparison: {
                    gpt_oss_120b: `$${INPUT_COST_PER_M_TOKENS}/$${OUTPUT_COST_PER_M_TOKENS}`,
                    claude_3_5_sonnet: '$3.00/$15.00',
                    savings: '8-20x cheaper than Claude'
                }
            },
            alerts: {
                daily_warning: dailyWarning,
                monthly_warning: monthlyWarning,
                daily_limit_reached: dailyLimitReached,
                monthly_limit_reached: monthlyLimitReached,
                next_reset: {
                    daily: `Tomorrow (${new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]})`,
                    monthly: `Next month (${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]})`
                }
            }
        };

        return new Response(
            JSON.stringify(usageStats, null, 2),
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );

    } catch (error) {
        console.error('Workers AI usage monitoring error:', error);

        return new Response(
            JSON.stringify({
                error: 'Usage monitoring failed',
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

// Function to update usage (called from workers-ai.js)
export async function updateUsage(env, inputTokens, outputTokens) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyUsageKey = `workers-ai-usage-${today}`;
        const monthlyUsageKey = `workers-ai-usage-${today.slice(0, 7)}`;

        // Get current usage
        let dailyUsage = await env.RESPONSE_CACHE.get(dailyUsageKey, { type: 'json' }) || {
            date: today,
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            estimated_cost: 0,
            gpt_oss_120b_requests: 0
        };

        let monthlyUsage = await env.RESPONSE_CACHE.get(monthlyUsageKey, { type: 'json' }) || {
            month: today.slice(0, 7),
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            estimated_cost: 0,
            gpt_oss_120b_requests: 0
        };

        // Update usage
        dailyUsage.total_requests += 1;
        dailyUsage.total_input_tokens += inputTokens;
        dailyUsage.total_output_tokens += outputTokens;
        dailyUsage.gpt_oss_120b_requests += 1;

        monthlyUsage.total_requests += 1;
        monthlyUsage.total_input_tokens += inputTokens;
        monthlyUsage.total_output_tokens += outputTokens;
        monthlyUsage.gpt_oss_120b_requests += 1;

        // Store updated usage (expire daily after 2 days, monthly after 32 days)
        await env.RESPONSE_CACHE.put(dailyUsageKey, JSON.stringify(dailyUsage), { expirationTtl: 2 * 24 * 60 * 60 });
        await env.RESPONSE_CACHE.put(monthlyUsageKey, JSON.stringify(monthlyUsage), { expirationTtl: 32 * 24 * 60 * 60 });

        return { success: true };
    } catch (error) {
        console.error('Failed to update usage:', error);
        return { success: false, error: error.message };
    }
}