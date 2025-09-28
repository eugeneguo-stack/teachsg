// Workers AI API for basic educational queries
// Uses Llama 4 Scout for cost-effective responses before falling back to Claude

const WORKERS_AI_SYSTEM_PROMPT = `You are a helpful AI tutor for Singapore O-Level students. Provide clear, concise explanations for mathematics and music questions.

Focus on:
- Step-by-step solutions for math problems
- Basic music theory concepts
- Clear explanations suitable for O-Level students
- Use simple LaTeX for math: $x^2 + 2x + 1$

Keep responses under 300 words and direct to the point.`;

// GPT-OSS-120B handles ALL queries - no restrictions needed
function shouldUseWorkersAI(query) {
    // GPT-OSS-120B outperformed Claude in all tests, so handle everything
    return true;
}

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
        const { query } = await request.json();

        if (!query) {
            return new Response(
                JSON.stringify({ error: 'Query is required' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                }
            );
        }

        // Check if this query is suitable for Workers AI
        if (!shouldUseWorkersAI(query)) {
            return new Response(
                JSON.stringify({
                    useClaudeInstead: true,
                    reason: 'Complex query needs Claude 3.5 Sonnet'
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        // Call Workers AI with GPT-OSS-120B (superior quality and cost-effectiveness)
        const aiResponse = await env.AI.run('@cf/openai/gpt-oss-120b', {
            input: [
                {
                    role: 'system',
                    content: WORKERS_AI_SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: query
                }
            ],
            reasoning: {
                effort: 'medium',
                summary: 'concise'
            }
        });

        // Handle different response formats for different models
        let responseText;
        if (aiResponse.output) {
            // GPT-OSS format: find message type in output array
            const messageOutput = aiResponse.output.find(item => item.type === 'message');
            responseText = messageOutput?.content?.[0]?.text || 'Sorry, I could not generate a response.';
        } else {
            // Standard format for other models
            responseText = aiResponse.response || 'Sorry, I could not generate a response.';
        }

        // Track usage for cost monitoring
        const inputTokens = Math.ceil(query.length / 4); // Rough estimate: 4 chars per token
        const outputTokens = Math.ceil(responseText.length / 4); // Rough estimate: 4 chars per token

        try {
            // Update usage statistics
            const { updateUsage } = await import('./workers-ai-usage.js');
            await updateUsage(env, inputTokens, outputTokens);
        } catch (error) {
            console.log('Usage tracking failed:', error);
        }

        // Basic quality check - if response is too short or generic, use Claude instead
        if (responseText.length < 30 ||  // Reduced from 50 to 30
            responseText.includes('I cannot') ||
            responseText.includes('I don\'t know') ||
            responseText.includes('sorry') ||
            responseText.includes('Sorry')) {

            return new Response(
                JSON.stringify({
                    useClaudeInstead: true,
                    reason: 'Workers AI response quality insufficient'
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }

        return new Response(
            JSON.stringify({
                response: responseText,
                model: 'gpt-oss-120b',
                cost_estimate: {
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    estimated_cost: ((inputTokens / 1000000) * 0.350) + ((outputTokens / 1000000) * 0.750)
                },
                tokens_used: responseText.length
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );

    } catch (error) {
        console.error('Workers AI error:', error);

        // Fallback to Claude on any error
        return new Response(
            JSON.stringify({
                useClaudeInstead: true,
                reason: 'Workers AI error: ' + error.message
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    }
}