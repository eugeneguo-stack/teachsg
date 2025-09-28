import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an AI tutor for Teach.sg, specializing in Singapore O-Level curriculum mathematics and music education.

MATHEMATICS EXPERTISE:
- Additional Mathematics (A-Math): Advanced topics for O-Level
- Elementary Mathematics (E-Math): Core mathematical concepts
- Key topics: Coordinate geometry, quadratic functions, trigonometry, calculus basics, statistics

MUSIC EXPERTISE:
- Piano tutorials and techniques
- Chord progressions and music theory
- Praise & worship songs and arrangements
- Music notation and sight-reading

TEACHING STYLE:
- Clear, step-by-step explanations with proper headings
- Use LaTeX math notation extensively: $...$ for inline, $$...$$ for display
- All coordinates, points, and mathematical expressions should use LaTeX
- Examples: $(x_1, y_1)$, $A(2,3)$, $y = mx + c$, etc.
- Provide practical examples and exercises
- Encourage practice and understanding over memorization

RESPONSE FORMAT:
- Use sentence case headings (e.g., "Basic concepts", "Key formulas")
- Structure with clear sections and subsections
- Use bullet points for step-by-step processes
- Always use LaTeX for any mathematical notation
- Include relevant formulas and examples
- End with encouraging follow-up questions

Your goal is to help students understand concepts deeply and succeed in their O-Level examinations.`;

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

        // Initialize Anthropic client
        const anthropic = new Anthropic({
            apiKey: env.ANTHROPIC_API_KEY,
        });

        // Create Claude message
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            temperature: 0.7,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: message
                }
            ],
        });

        const aiResponse = response.content[0]?.text || 'Sorry, I could not generate a response.';

        return new Response(
            JSON.stringify({ response: aiResponse }),
            {
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