export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Check if SUPABASE_URL and SUPABASE_ANON_KEY are available
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            return new Response(JSON.stringify({
                error: 'Database configuration missing',
                message: 'Monitoring requires database access'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

        // Get query parameters
        const url = new URL(request.url);
        const days = parseInt(url.searchParams.get('days')) || 7;
        const detailed = url.searchParams.get('detailed') === 'true';

        // Get current date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Fetch global usage data
        const { data: globalData, error: globalError } = await supabase
            .from('global_usage')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', today)
            .order('date', { ascending: false });

        if (globalError) {
            throw globalError;
        }

        // Fetch IP usage data
        const { data: ipData, error: ipError } = await supabase
            .from('ip_usage')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', today)
            .order('date', { ascending: false });

        if (ipError) {
            throw ipError;
        }

        // Aggregate data by date
        const dailyStats = {};

        // Initialize with global data
        globalData.forEach(row => {
            dailyStats[row.date] = {
                date: row.date,
                global_cost: parseFloat(row.total_cost) || 0,
                global_questions: row.question_count || 0,
                unique_ips: 0,
                total_ip_questions: 0,
                total_ip_costs: 0,
                ip_details: []
            };
        });

        // Add IP data
        ipData.forEach(row => {
            const date = row.date;
            if (!dailyStats[date]) {
                dailyStats[date] = {
                    date: date,
                    global_cost: 0,
                    global_questions: 0,
                    unique_ips: 0,
                    total_ip_questions: 0,
                    total_ip_costs: 0,
                    ip_details: []
                };
            }

            dailyStats[date].unique_ips++;
            dailyStats[date].total_ip_questions += row.question_count || 0;
            dailyStats[date].total_ip_costs += parseFloat(row.total_cost) || 0;

            if (detailed) {
                dailyStats[date].ip_details.push({
                    ip: row.ip_address,
                    questions: row.question_count,
                    cost: parseFloat(row.total_cost) || 0
                });
            }
        });

        // Convert to array and sort
        const statsArray = Object.values(dailyStats).sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        // Calculate summary statistics
        const totalGlobalCost = statsArray.reduce((sum, day) => sum + day.global_cost, 0);
        const totalQuestions = statsArray.reduce((sum, day) => sum + day.global_questions, 0);
        const totalUniqueIPs = statsArray.reduce((sum, day) => sum + day.unique_ips, 0);
        const avgDailyCost = statsArray.length > 0 ? totalGlobalCost / statsArray.length : 0;

        // Get today's status
        const todayData = statsArray.find(day => day.date === today) || {
            global_cost: 0,
            global_questions: 0,
            unique_ips: 0
        };

        const status = todayData.global_cost >= 10.00 ? 'LIMIT_REACHED' :
                      todayData.global_cost >= 8.00 ? 'WARNING' : 'NORMAL';

        // Cache hit statistics (if KV is available)
        let cacheStats = null;
        if (env.RESPONSE_CACHE) {
            try {
                // Get cache hit rate from metadata (simplified)
                cacheStats = {
                    estimated_hits: Math.floor(totalQuestions * 0.3), // Rough estimate
                    estimated_savings: Math.floor(totalQuestions * 0.3 * 0.025),
                    note: 'Cache statistics are estimated'
                };
            } catch (error) {
                console.log('Cache stats error:', error);
            }
        }

        const response = {
            summary: {
                period_days: days,
                total_global_cost: totalGlobalCost.toFixed(4),
                total_questions: totalQuestions,
                total_unique_ips: totalUniqueIPs,
                average_daily_cost: avgDailyCost.toFixed(4),
                today_status: status,
                today_cost: todayData.global_cost.toFixed(4),
                today_questions: todayData.global_questions,
                today_unique_ips: todayData.unique_ips
            },
            daily_breakdown: statsArray,
            cache_stats: cacheStats,
            limits: {
                daily_global_limit: 10.00,
                daily_ip_limit: 0.10,
                warning_threshold: 8.00
            }
        };

        return new Response(JSON.stringify(response, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Monitoring error:', error);
        return new Response(JSON.stringify({
            error: 'Monitoring data unavailable',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}