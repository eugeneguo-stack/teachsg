export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { action, query, response } = await request.json();

        if (!env.RESPONSE_CACHE) {
            return new Response(JSON.stringify({ error: 'Cache not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Normalize query for consistent caching
        const normalizedQuery = normalizeQuery(query);
        const cacheKey = `response:${hashQuery(normalizedQuery)}`;

        switch (action) {
            case 'get':
                const cachedResponse = await env.RESPONSE_CACHE.get(cacheKey);
                if (cachedResponse) {
                    const parsed = JSON.parse(cachedResponse);
                    // Check if cache is still valid (24 hours)
                    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        return new Response(JSON.stringify({
                            cached: true,
                            response: parsed.response,
                            similarity: calculateSimilarity(query, parsed.originalQuery)
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                return new Response(JSON.stringify({ cached: false }), {
                    headers: { 'Content-Type': 'application/json' }
                });

            case 'set':
                if (!response) {
                    return new Response(JSON.stringify({ error: 'Response required for caching' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const cacheData = {
                    response: response,
                    originalQuery: query,
                    normalizedQuery: normalizedQuery,
                    timestamp: Date.now(),
                    hitCount: 1
                };

                // Cache for 24 hours
                await env.RESPONSE_CACHE.put(cacheKey, JSON.stringify(cacheData), {
                    expirationTtl: 24 * 60 * 60
                });

                return new Response(JSON.stringify({ cached: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });

            case 'increment':
                // Increment hit count for analytics
                const existing = await env.RESPONSE_CACHE.get(cacheKey);
                if (existing) {
                    const data = JSON.parse(existing);
                    data.hitCount = (data.hitCount || 1) + 1;
                    await env.RESPONSE_CACHE.put(cacheKey, JSON.stringify(data), {
                        expirationTtl: 24 * 60 * 60
                    });
                }
                return new Response(JSON.stringify({ incremented: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });

            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
        }
    } catch (error) {
        console.error('Cache error:', error);
        return new Response(JSON.stringify({ error: 'Cache operation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function normalizeQuery(query) {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

function hashQuery(query) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const char = query.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

function calculateSimilarity(query1, query2) {
    const words1 = new Set(normalizeQuery(query1).split(' '));
    const words2 = new Set(normalizeQuery(query2).split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}