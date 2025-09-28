// Workers AI API for basic educational queries
// Uses Llama 4 Scout for cost-effective responses before falling back to Claude

const WORKERS_AI_SYSTEM_PROMPT = `You are a helpful AI tutor for Singapore O-Level students. Provide clear, concise explanations for mathematics and music questions.

Focus on:
- Step-by-step solutions for math problems
- Basic music theory concepts
- Clear explanations suitable for O-Level students
- Use simple LaTeX for math: $x^2 + 2x + 1$

Keep responses under 300 words and direct to the point.`;

// Determine if query is suitable for Workers AI (basic questions)
function shouldUseWorkersAI(query) {
    const basicPatterns = [
        // Math basics
        /what is|define|explain|basic|simple/i,
        /formula|equation|solve/i,
        /\d+\s*[\+\-\*\/]\s*\d+/, // Simple arithmetic with optional spaces
        /quadratic|linear|graph/i,
        /area|volume|perimeter/i,

        // Music basics
        /chord|scale|note|key/i,
        /piano|music theory/i,
        /major|minor|sharp|flat/i,

        // General educational
        /how to|what does|meaning/i,
        /example|practice/i
    ];

    const complexPatterns = [
        // Complex patterns that need Claude
        /step.*step.*step/i, // Multi-step problems
        /proof|derive|demonstrate/i,
        /advanced|complex|difficult/i,
        /assignment|homework.*detailed/i,
        /explain.*detail.*with.*example/i
    ];

    // Don't use Workers AI for complex queries
    if (complexPatterns.some(pattern => pattern.test(query))) {
        return false;
    }

    // Use Workers AI for basic patterns
    return basicPatterns.some(pattern => pattern.test(query)) || query.length < 100;
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

        // Call Workers AI with Llama 4 Scout
        const aiResponse = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
            messages: [
                {
                    role: 'system',
                    content: WORKERS_AI_SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: query
                }
            ],
            max_tokens: 300, // Keep responses concise
            temperature: 0.7
        });

        const responseText = aiResponse.response || 'Sorry, I could not generate a response.';

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
                model: 'llama-4-scout-17b-16e-instruct',
                cost_estimate: 0.001, // Much cheaper than Claude
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