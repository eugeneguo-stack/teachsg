// GPT-OSS-120B-only architecture - no Claude needed

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

        // Parse request body
        const { message } = await request.json();

        if (!message) {
            return new Response(
                JSON.stringify({ error: 'Message is required' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                }
            );
        }

        // Token limiting - truncate very long inputs
        const MAX_INPUT_TOKENS = 2000; // ~1500 words max
        const truncatedMessage = message.length > MAX_INPUT_TOKENS ?
            message.substring(0, MAX_INPUT_TOKENS) + '... [message truncated for length]' :
            message;

        // 1. Check cache first
        const origin = new URL(request.url).origin;
        let cacheResponse;
        try {
            const cacheCheckResponse = await fetch(`${origin}/api/cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get',
                    query: truncatedMessage
                })
            });
            cacheResponse = await cacheCheckResponse.json();
        } catch (error) {
            console.log('Cache check failed:', error);
            cacheResponse = { cached: false };
        }

        if (cacheResponse.cached && cacheResponse.similarity > 0.8) {
            // Increment cache hit count
            try {
                await fetch(`${origin}/api/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'increment',
                        query: truncatedMessage
                    })
                });
            } catch (error) {
                console.log('Cache increment failed:', error);
            }

            return new Response(
                JSON.stringify({
                    response: cacheResponse.response,
                    cached: true,
                    cost_saved: true
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // 2. Check keyword fallback
        let keywordResponse;
        try {
            const keywordCheckResponse = await fetch(`${origin}/api/keywords`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: truncatedMessage
                })
            });
            keywordResponse = await keywordCheckResponse.json();
        } catch (error) {
            console.log('Keyword check failed:', error);
            keywordResponse = { useAI: true };
        }

        if (!keywordResponse.useAI) {
            // Cache the keyword response for future use
            try {
                await fetch(`${origin}/api/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'set',
                        query: truncatedMessage,
                        response: keywordResponse.response
                    })
                });
            } catch (error) {
                console.log('Cache set failed:', error);
            }

            return new Response(
                JSON.stringify({
                    response: keywordResponse.response,
                    keyword_match: true,
                    type: keywordResponse.type,
                    cost_saved: true
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // 3. Try Workers AI for basic queries first (cheaper than Claude)
        let workersAIResponse;
        try {
            const workersAICheckResponse = await fetch(`${origin}/api/workers-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: truncatedMessage
                })
            });
            workersAIResponse = await workersAICheckResponse.json();
        } catch (error) {
            console.log('Workers AI check failed:', error);
            workersAIResponse = { useClaudeInstead: true };
        }

        if (!workersAIResponse.useClaudeInstead && workersAIResponse.response) {
            // Cache the Workers AI (GPT-OSS-120B) response for future use
            try {
                await fetch(`${origin}/api/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'set',
                        query: truncatedMessage,
                        response: workersAIResponse.response
                    })
                });
            } catch (error) {
                console.log('Cache set failed:', error);
            }

            return new Response(
                JSON.stringify({
                    response: workersAIResponse.response,
                    workers_ai: true,
                    model: workersAIResponse.model || 'gpt-oss-120b',
                    cost_saved: true,
                    quality: 'high' // GPT-OSS-120B provides high-quality responses
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // 4. If we reach here, Workers AI (GPT-OSS-120B) couldn't handle the query
        // This should rarely happen since GPT-OSS-120B handles all educational queries better than Claude
        return new Response(
            JSON.stringify({
                error: 'AI service temporarily unavailable',
                message: 'GPT-OSS-120B is currently unavailable. Please try again in a few minutes.',
                suggestion: 'Try rephrasing your question or check back shortly.',
                model_unavailable: 'gpt-oss-120b'
            }),
            {
                status: 503,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );

    } catch (error) {
        console.error('Chat API error:', error);

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