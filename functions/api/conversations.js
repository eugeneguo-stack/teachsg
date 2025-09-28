export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { action, fingerprintId, userMessage, aiResponse, conversationId } = await request.json();

        if (action === 'store') {
            // Store a new conversation
            const today = new Date().toISOString().split('T')[0];
            const timestamp = new Date().toISOString();

            // Get existing conversations for this fingerprint
            const conversationsKey = `conversations_${fingerprintId}`;
            const existingConversations = await env.RESPONSE_CACHE.get(conversationsKey, 'json') || [];

            // Create new conversation entry
            const newConversation = {
                id: conversationId || Date.now().toString(),
                timestamp,
                date: today,
                userMessage,
                aiResponse,
                fingerprintId
            };

            // Add to conversations list
            existingConversations.push(newConversation);

            // Store updated conversations
            await env.RESPONSE_CACHE.put(conversationsKey, JSON.stringify(existingConversations));

            // Update daily count
            const dailyCountKey = `daily_count_${fingerprintId}_${today}`;
            const currentCount = parseInt(await env.RESPONSE_CACHE.get(dailyCountKey) || '0');
            await env.RESPONSE_CACHE.put(dailyCountKey, (currentCount + 1).toString());

            return new Response(JSON.stringify({
                success: true,
                conversationId: newConversation.id,
                dailyCount: currentCount + 1
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'getDailyCount') {
            // Get daily conversation count for rate limiting
            const today = new Date().toISOString().split('T')[0];
            const dailyCountKey = `daily_count_${fingerprintId}_${today}`;
            const count = parseInt(await env.RESPONSE_CACHE.get(dailyCountKey) || '0');

            return new Response(JSON.stringify({
                count,
                remaining: Math.max(0, 25 - count)
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Conversations API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestGet(context) {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action');

        if (action === 'list') {
            // List all conversations for monitoring
            const { keys } = await env.RESPONSE_CACHE.list({ prefix: 'conversations_' });
            const allConversations = [];

            for (const key of keys) {
                const conversations = await env.RESPONSE_CACHE.get(key.name, 'json') || [];
                allConversations.push(...conversations);
            }

            // Sort by timestamp (newest first)
            allConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return new Response(JSON.stringify(allConversations), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const fingerprintId = url.searchParams.get('fingerprintId');
        if (fingerprintId) {
            // Get conversations for specific fingerprint
            const conversationsKey = `conversations_${fingerprintId}`;
            const conversations = await env.RESPONSE_CACHE.get(conversationsKey, 'json') || [];

            return new Response(JSON.stringify(conversations), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Missing parameters' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Conversations GET API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}