// Model Comparison API for testing different Workers AI models
// Tests: Llama 4 Scout, QwQ-32B, DeepSeek-R1-Distill-32B, GPT-OSS-120B

const MODELS_TO_TEST = [
    {
        id: '@cf/meta/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout 17B',
        specialty: 'Multimodal, General Education',
        params: '17B active (109B total)'
    },
    {
        id: '@cf/qwen/qwq-32b',
        name: 'QwQ-32B',
        specialty: 'Reasoning & Problem Solving',
        params: '32B'
    },
    {
        id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
        name: 'DeepSeek-R1-Distill-32B',
        specialty: 'Mathematics & Logic',
        params: '32B'
    },
    {
        id: '@cf/openai/gpt-oss-120b',
        name: 'GPT-OSS-120B',
        specialty: 'Advanced Reasoning & Complex Tasks',
        params: '120B'
    }
];

const EDUCATIONAL_SYSTEM_PROMPT = `You are an AI tutor for Singapore O-Level students. Provide clear, concise explanations for mathematics and music questions.

Focus on:
- Step-by-step solutions for math problems
- Basic music theory concepts
- Clear explanations suitable for O-Level students
- Use simple LaTeX for math: $x^2 + 2x + 1$

Keep responses under 300 words and direct to the point.`;

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
        const { query, test_type = 'all' } = await request.json();

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

        const results = [];
        const startTime = Date.now();

        // Test each model
        for (const model of MODELS_TO_TEST) {
            const modelStartTime = Date.now();

            try {
                console.log(`Testing model: ${model.name}`);

                let aiResponse;

                // Some models may require different input formats
                if (model.id.includes('openai/gpt-oss')) {
                    // Use OpenAI Responses API format for GPT-OSS models
                    aiResponse = await env.AI.run(model.id, {
                        input: [
                            {
                                role: 'system',
                                content: EDUCATIONAL_SYSTEM_PROMPT
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
                } else {
                    // Standard messages format for other models
                    aiResponse = await env.AI.run(model.id, {
                        messages: [
                            {
                                role: 'system',
                                content: EDUCATIONAL_SYSTEM_PROMPT
                            },
                            {
                                role: 'user',
                                content: query
                            }
                        ],
                        max_tokens: 300,
                        temperature: 0.7
                    });
                }

                const responseTime = Date.now() - modelStartTime;

                // Handle different response formats
                let responseText;
                if (model.id.includes('openai/gpt-oss')) {
                    // GPT-OSS uses output array structure
                    // Find the message type output (not reasoning)
                    const messageOutput = aiResponse.output?.find(item => item.type === 'message');
                    responseText = messageOutput?.content?.[0]?.text || 'No response generated';
                } else {
                    responseText = aiResponse.response || 'No response generated';
                }

                results.push({
                    model: model.name,
                    model_id: model.id,
                    specialty: model.specialty,
                    parameters: model.params,
                    response: responseText,
                    response_time_ms: responseTime,
                    response_length: responseText.length,
                    tokens_estimated: Math.ceil(responseText.length / 4),
                    status: 'success'
                });

            } catch (error) {
                console.error(`Error with ${model.name}:`, error);

                results.push({
                    model: model.name,
                    model_id: model.id,
                    specialty: model.specialty,
                    parameters: model.params,
                    response: null,
                    error: error.message,
                    response_time_ms: Date.now() - modelStartTime,
                    status: 'error'
                });
            }
        }

        const totalTime = Date.now() - startTime;

        // Calculate comparison metrics
        const successfulResults = results.filter(r => r.status === 'success');
        const comparison = {
            query: query,
            total_test_time_ms: totalTime,
            models_tested: MODELS_TO_TEST.length,
            successful_responses: successfulResults.length,
            failed_responses: results.length - successfulResults.length,

            // Performance metrics
            fastest_model: successfulResults.length > 0 ?
                successfulResults.reduce((prev, curr) =>
                    prev.response_time_ms < curr.response_time_ms ? prev : curr
                ).model : null,

            longest_response: successfulResults.length > 0 ?
                successfulResults.reduce((prev, curr) =>
                    prev.response_length > curr.response_length ? prev : curr
                ).model : null,

            average_response_time: successfulResults.length > 0 ?
                Math.round(successfulResults.reduce((sum, r) => sum + r.response_time_ms, 0) / successfulResults.length) : 0,

            results: results
        };

        return new Response(
            JSON.stringify(comparison, null, 2),
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );

    } catch (error) {
        console.error('Model comparison error:', error);

        return new Response(
            JSON.stringify({
                error: 'Model comparison failed',
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