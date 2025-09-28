// Simple keyword-based responses for common queries
const KEYWORD_RESPONSES = {
    // Math basics
    'what is algebra': 'Algebra is a branch of mathematics that uses symbols (usually letters) to represent unknown numbers in equations. It helps us solve problems by finding the value of these unknowns.',

    'what is calculus': 'Calculus is advanced mathematics that studies rates of change (derivatives) and accumulation (integrals). It\'s used in physics, engineering, and many other fields.',

    'pythagorean theorem': 'The Pythagorean theorem states that in a right triangle, a² + b² = c², where c is the hypotenuse and a, b are the other two sides.',

    'quadratic formula': 'The quadratic formula is x = (-b ± √(b² - 4ac)) / (2a), used to solve equations of the form ax² + bx + c = 0.',

    // Music basics
    'what are chords': 'Chords are combinations of three or more musical notes played together. They form the harmonic foundation of most music.',

    'major scale': 'A major scale follows the pattern: whole-whole-half-whole-whole-whole-half steps. For example, C major: C-D-E-F-G-A-B-C.',

    'what is rhythm': 'Rhythm is the pattern of beats and timing in music. It\'s created by combining notes of different durations.',

    // Platform help
    'how to use': 'Simply type your math or music question in the chat box below! I can help with equations, concepts, chord progressions, and more.',

    'daily limit': 'Each visitor gets 10¢ worth of AI questions per day (about 4-5 questions). The platform has a $10 daily budget shared across all users.',

    'cost': 'Teach.sg is completely free! No registration required. Just ask your questions and learn.',

    // Common greetings
    'hello': 'Hello! I\'m your AI tutor for mathematics and music. What would you like to learn today?',
    'hi': 'Hi there! Ready to explore some math or music concepts? Ask me anything!',
    'help': 'I can help you with:\n• Mathematics (algebra, calculus, geometry, etc.)\n• Music theory (chords, scales, rhythm)\n• Practice problems and explanations\n\nJust type your question!'
};

// Keywords that should always use AI (complex topics)
const AI_REQUIRED_KEYWORDS = [
    'solve', 'calculate', 'derive', 'prove', 'explain why', 'step by step',
    'homework', 'assignment', 'problem', 'equation', 'integral', 'derivative',
    'compose', 'analyze', 'compare', 'evaluate', 'apply'
];

// Simple math that can be handled without AI
const SIMPLE_PATTERNS = [
    {
        pattern: /what is (\d+) \+ (\d+)/i,
        handler: (match) => `${match[1]} + ${match[2]} = ${parseInt(match[1]) + parseInt(match[2])}`
    },
    {
        pattern: /what is (\d+) - (\d+)/i,
        handler: (match) => `${match[1]} - ${match[2]} = ${parseInt(match[1]) - parseInt(match[2])}`
    },
    {
        pattern: /what is (\d+) \* (\d+)/i,
        handler: (match) => `${match[1]} × ${match[2]} = ${parseInt(match[1]) * parseInt(match[2])}`
    },
    {
        pattern: /what is (\d+) \/ (\d+)/i,
        handler: (match) => {
            const result = parseInt(match[1]) / parseInt(match[2]);
            return `${match[1]} ÷ ${match[2]} = ${result % 1 === 0 ? result : result.toFixed(3)}`;
        }
    }
];

export async function onRequest(context) {
    const { request } = context;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { query } = await request.json();

        if (!query || typeof query !== 'string') {
            return new Response(JSON.stringify({ error: 'Query required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = checkKeywordResponse(query);

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Keyword processing error:', error);
        return new Response(JSON.stringify({
            useAI: true,
            error: 'Keyword processing failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function checkKeywordResponse(query) {
    const normalizedQuery = query.toLowerCase().trim();

    // Check if query requires AI (complex keywords)
    if (AI_REQUIRED_KEYWORDS.some(keyword => normalizedQuery.includes(keyword))) {
        return { useAI: true, reason: 'Complex query requires AI' };
    }

    // Check simple math patterns
    for (const { pattern, handler } of SIMPLE_PATTERNS) {
        const match = normalizedQuery.match(pattern);
        if (match) {
            return {
                useAI: false,
                response: handler(match),
                type: 'simple_math'
            };
        }
    }

    // Check keyword responses (exact matches first)
    for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
        if (normalizedQuery === keyword) {
            return {
                useAI: false,
                response: response,
                type: 'exact_keyword'
            };
        }
    }

    // Check partial keyword matches
    for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
        if (normalizedQuery.includes(keyword)) {
            return {
                useAI: false,
                response: response,
                type: 'partial_keyword',
                confidence: calculateKeywordConfidence(normalizedQuery, keyword)
            };
        }
    }

    // Check if query is very short (likely needs AI for context)
    if (normalizedQuery.length < 10) {
        // But handle very simple cases
        if (['yes', 'no', 'ok', 'thanks', 'thank you'].includes(normalizedQuery)) {
            return {
                useAI: false,
                response: 'You\'re welcome! Feel free to ask any math or music questions.',
                type: 'simple_response'
            };
        }
    }

    // Default to AI for anything else
    return {
        useAI: true,
        reason: 'No keyword match found',
        queryLength: normalizedQuery.length
    };
}

function calculateKeywordConfidence(query, keyword) {
    const queryWords = query.split(' ');
    const keywordWords = keyword.split(' ');

    const matchingWords = keywordWords.filter(word =>
        queryWords.some(qWord => qWord.includes(word) || word.includes(qWord))
    );

    return matchingWords.length / keywordWords.length;
}