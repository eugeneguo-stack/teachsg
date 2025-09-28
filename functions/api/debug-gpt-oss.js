// Debug GPT-OSS-120B API to understand response structure and parameters

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

        const { query = "What is 2+2?" } = await request.json();

        const tests = [];

        // Test 1: Original format from docs
        try {
            console.log('Test 1: Standard input array format');
            const test1 = await env.AI.run('@cf/openai/gpt-oss-120b', {
                input: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI tutor.'
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

            tests.push({
                test: 'Standard input array',
                success: true,
                raw_response: test1,
                parsed_content: test1.choices?.[0]?.message?.content || test1.content || test1.response || 'No content found',
                response_keys: Object.keys(test1 || {})
            });
        } catch (error) {
            tests.push({
                test: 'Standard input array',
                success: false,
                error: error.message
            });
        }

        // Test 2: String input format
        try {
            console.log('Test 2: String input format');
            const test2 = await env.AI.run('@cf/openai/gpt-oss-120b', {
                input: `System: You are a helpful AI tutor.\nUser: ${query}\nAssistant:`,
                reasoning: {
                    effort: 'low',
                    summary: 'auto'
                }
            });

            tests.push({
                test: 'String input',
                success: true,
                raw_response: test2,
                parsed_content: test2.choices?.[0]?.message?.content || test2.content || test2.response || 'No content found',
                response_keys: Object.keys(test2 || {})
            });
        } catch (error) {
            tests.push({
                test: 'String input',
                success: false,
                error: error.message
            });
        }

        // Test 3: No reasoning parameters
        try {
            console.log('Test 3: No reasoning parameters');
            const test3 = await env.AI.run('@cf/openai/gpt-oss-120b', {
                input: [
                    {
                        role: 'user',
                        content: query
                    }
                ]
            });

            tests.push({
                test: 'No reasoning params',
                success: true,
                raw_response: test3,
                parsed_content: test3.choices?.[0]?.message?.content || test3.content || test3.response || 'No content found',
                response_keys: Object.keys(test3 || {})
            });
        } catch (error) {
            tests.push({
                test: 'No reasoning params',
                success: false,
                error: error.message
            });
        }

        // Test 4: High effort reasoning
        try {
            console.log('Test 4: High effort reasoning');
            const test4 = await env.AI.run('@cf/openai/gpt-oss-120b', {
                input: [
                    {
                        role: 'user',
                        content: query
                    }
                ],
                reasoning: {
                    effort: 'high',
                    summary: 'detailed'
                }
            });

            tests.push({
                test: 'High effort reasoning',
                success: true,
                raw_response: test4,
                parsed_content: test4.choices?.[0]?.message?.content || test4.content || test4.response || 'No content found',
                response_keys: Object.keys(test4 || {})
            });
        } catch (error) {
            tests.push({
                test: 'High effort reasoning',
                success: false,
                error: error.message
            });
        }

        // Test 5: Different model call format
        try {
            console.log('Test 5: Different response access');
            const test5 = await env.AI.run('@cf/openai/gpt-oss-120b', {
                input: [
                    {
                        role: 'user',
                        content: query
                    }
                ],
                reasoning: {
                    effort: 'medium'
                }
            });

            // Try different ways to access response
            const possibleResponses = {
                direct_response: test5.response,
                choices_content: test5.choices?.[0]?.message?.content,
                choices_text: test5.choices?.[0]?.text,
                content: test5.content,
                message_content: test5.message?.content,
                output: test5.output,
                result: test5.result,
                text: test5.text
            };

            tests.push({
                test: 'Response access methods',
                success: true,
                raw_response: test5,
                possible_responses: possibleResponses,
                response_keys: Object.keys(test5 || {}),
                all_values: test5
            });
        } catch (error) {
            tests.push({
                test: 'Response access methods',
                success: false,
                error: error.message
            });
        }

        return new Response(
            JSON.stringify({
                query: query,
                model: '@cf/openai/gpt-oss-120b',
                total_tests: tests.length,
                successful_tests: tests.filter(t => t.success).length,
                tests: tests
            }, null, 2),
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );

    } catch (error) {
        console.error('Debug GPT-OSS error:', error);

        return new Response(
            JSON.stringify({
                error: 'Debug failed',
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