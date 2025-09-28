let isLoading = false;
let userFingerprint = null;

// Fingerprint-based conversation tracking
const DAILY_CONVERSATION_LIMIT = 25;

async function initializeFingerprint() {
    if (!userFingerprint) {
        userFingerprint = await window.browserFingerprint.getUserId();
    }
    return userFingerprint;
}

async function getUserConversationCount() {
    await initializeFingerprint();
    try {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getDailyCount',
                fingerprintId: userFingerprint
            })
        });
        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Failed to get conversation count:', error);
        // Fallback to localStorage
        const today = new Date().toISOString().split('T')[0];
        const key = `teach_sg_conversations_${today}`;
        const stored = localStorage.getItem(key);
        return stored ? parseInt(stored) : 0;
    }
}

async function incrementUserConversationCount() {
    // Keep localStorage as backup
    const today = new Date().toISOString().split('T')[0];
    const key = `teach_sg_conversations_${today}`;
    const current = await getUserConversationCount();
    localStorage.setItem(key, (current + 1).toString());
    return current + 1;
}

async function getRemainingConversations() {
    const count = await getUserConversationCount();
    return Math.max(0, DAILY_CONVERSATION_LIMIT - count);
}

async function hasReachedDailyLimit() {
    const count = await getUserConversationCount();
    return count >= DAILY_CONVERSATION_LIMIT;
}

async function storeConversation(userMessage, aiResponse) {
    await initializeFingerprint();
    try {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'store',
                fingerprintId: userFingerprint,
                userMessage,
                aiResponse,
                conversationId: Date.now().toString()
            })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to store conversation:', error);
        return false;
    }
}

function addMessage(content, isUser = false) {
    const chatContainer = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-6 flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`;

    const messageBubble = document.createElement('div');
    messageBubble.className = `chat-message ${isUser ? 'user max-w-xs lg:max-w-md' : 'ai max-w-2xl lg:max-w-4xl'} px-6 py-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
        isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
            : 'bg-gradient-to-r from-white to-gray-50 text-gray-800 shadow-xl border border-gray-100'
    }`;

    if (isUser) {
        messageBubble.textContent = content;
    } else {
        // Format AI response with proper markdown-like styling
        const formattedContent = formatAIResponse(content);
        messageBubble.innerHTML = formattedContent;
        // Render LaTeX math expressions
        setTimeout(() => {
            renderMathInElement(messageBubble, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\[", right: "\\]", display: true},
                    {left: "\\(", right: "\\)", display: false}
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false,
                trust: false,
                macros: {
                    "\\f": "#1f(#2)"
                }
            });
        }, 150);
    }

    messageDiv.appendChild(messageBubble);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const chatContainer = document.getElementById('chat-container');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'mb-6 flex justify-start animate-fade-in';
    typingDiv.innerHTML = `
        <div class="chat-message ai max-w-xs px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 shadow-lg border border-gray-100">
            <div class="flex items-center space-x-2">
                <span class="text-lg">🦉</span>
                <span class="text-sm">Thinking</span>
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        </div>
    `;
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function sendMessage(message = null) {
    if (isLoading) return;

    // Check individual user daily limit first
    if (await hasReachedDailyLimit()) {
        addMessage("You've reached your daily limit of 25 conversations. Come back tomorrow for more free tutoring! 😊");
        updateUsageDisplay(0, DAILY_CONVERSATION_LIMIT);
        return;
    }

    const input = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messageText = message || input.value.trim();

    if (!messageText) return;

    isLoading = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';

    // Add user message
    addMessage(messageText, true);
    if (!message) input.value = '';

    // Add typing indicator
    addTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText
            })
        });

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        if (!response.ok) {
            if (response.status === 429) {
                if (data.global_limit) {
                    // Global platform limit reached
                    addMessage(`🌍 Platform Daily Limit Reached! The site has served its $10 daily budget across all users. Thanks for using Teach.sg - we'll be back tomorrow with fresh tutoring! 📚✨`);
                    updateUsageDisplay(0, 4, true);
                } else {
                    // Individual user limit reached
                    addMessage(`Daily limit reached! ${data.message || "You've reached your daily limit of 25 conversations. Come back tomorrow for more free tutoring!"}`);
                    updateUsageDisplay(0, data.limit || 25);
                }
            } else {
                addMessage(data.error || 'Sorry, I encountered an error. Please try again.');
            }
            return;
        }

        // Add AI response
        const aiResponse = data.response || 'Sorry, I encountered an error. Please try again.';
        addMessage(aiResponse);

        // Store conversation in KV storage
        await storeConversation(messageText, aiResponse);

        // Increment user's conversation count for successful responses
        const conversationsUsed = await incrementUserConversationCount();
        const remaining = await getRemainingConversations();
        updateUsageDisplay(remaining, DAILY_CONVERSATION_LIMIT);

    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.');
    } finally {
        isLoading = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
    }
}

function sendQuickStart(message) {
    sendMessage(message);
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function formatAIResponse(content) {
    // Protect LaTeX expressions from markdown processing
    const latexProtected = [];
    let protectedContent = content;

    // Protect display math $$...$$
    protectedContent = protectedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        const placeholder = `__LATEX_DISPLAY_${latexProtected.length}__`;
        latexProtected.push(match);
        return placeholder;
    });

    // Protect inline math $...$
    protectedContent = protectedContent.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
        const placeholder = `__LATEX_INLINE_${latexProtected.length}__`;
        latexProtected.push(match);
        return placeholder;
    });

    // Protect \(...\) and \[...\] expressions
    protectedContent = protectedContent.replace(/\\[\(\[][\s\S]*?\\[\)\]]/g, (match) => {
        const placeholder = `__LATEX_BRACKET_${latexProtected.length}__`;
        latexProtected.push(match);
        return placeholder;
    });

    // Format the AI response to look more like Claude app
    let formatted = protectedContent
        // Format markdown bold text **text** -> <strong>text</strong>
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')

        // Format markdown italic text *text* -> <em>text</em>
        .replace(/\*((?!\*)[^*]+)\*/g, '<em class="italic">$1</em>')

        // Format code blocks ```code``` -> styled code blocks
        .replace(/```([\s\S]*?)```/g, '<div class="bg-gray-100 rounded-lg p-3 my-2 font-mono text-sm">$1</div>')

        // Format inline code `code` -> styled inline code
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')

        // Format ### headings
        .replace(/^### (.+)$/gm, '<h3 class="font-bold text-lg text-gray-800 mt-4 mb-2">$1</h3>')

        // Format coordinate pairs like (x, y) -> $(x, y)$
        .replace(/\(([xyz]),\s*([xyz])\)/g, '$($1, $2)$')

        // Format mathematical expressions with variables like P(x, y) -> $P(x, y)$
        .replace(/([A-Z])\(([xyz]),\s*([xyz])\)/g, '$($1($2, $3))$')

        // Format section headings (sentence case words followed by colon)
        .replace(/^([A-Z][a-z\s]+[a-z]):$/gm, '<h3 class="font-bold text-lg text-gray-800 mt-4 mb-2">$1</h3>')

        // Format subsection headings
        .replace(/^([A-Z][A-Z\s&-]+):$/gm, '<h4 class="font-semibold text-gray-700 mt-3 mb-1 text-sm uppercase tracking-wide">$1</h4>')

        // Format numbered sections (1., 2., etc.)
        .replace(/^(\d+\.\s+[^:]+):/gm, '<h4 class="font-semibold text-gray-700 mt-3 mb-1">$1:</h4>')

        // Format bullet points (both - and •)
        .replace(/^[•-] (.+)$/gm, '<div class="ml-4 mb-1 flex items-start"><span class="text-blue-500 mr-2">•</span><span>$1</span></div>')

        // Format numbered lists
        .replace(/^(\d+)\. (.+)$/gm, '<div class="ml-4 mb-1 flex items-start"><span class="text-blue-500 mr-2 font-semibold">$1.</span><span>$2</span></div>')

        // Format examples and practice sections
        .replace(/^(Practical example|Example|Practice):/gmi, '<div class="bg-blue-50 p-3 rounded-lg mt-4 mb-2"><strong class="text-blue-800">$1:</strong>')
        .replace(/^(Would you like to|Try this|Next steps):/gmi, '</div><div class="bg-green-50 p-3 rounded-lg mt-4 mb-2"><strong class="text-green-800">$1:</strong>')

        // Remove standalone dash separators
        .replace(/^---\s*$/gm, '')
        .replace(/\n---\n/g, '\n\n')

        // Format markdown tables
        .replace(/\n\|(.+)\|\n\|[-\s\|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
            const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell);
            const tableRows = rows.trim().split('\n').map(row =>
                row.split('|').map(cell => cell.trim()).filter(cell => cell)
            );

            let tableHTML = '<div class="my-4 overflow-x-auto"><table class="min-w-full border border-gray-300 rounded-lg">';

            // Header
            tableHTML += '<thead class="bg-gray-50"><tr>';
            headerCells.forEach(cell => {
                tableHTML += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">${cell}</th>`;
            });
            tableHTML += '</tr></thead>';

            // Body
            tableHTML += '<tbody>';
            tableRows.forEach((row, index) => {
                const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                tableHTML += `<tr class="${bgClass}">`;
                row.forEach(cell => {
                    tableHTML += `<td class="border border-gray-300 px-4 py-2">${cell}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table></div>';

            return '\n' + tableHTML + '\n';
        })

        // Format line breaks properly
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br>')

        // Wrap in paragraph tags
        .replace(/^/, '<p class="mb-2">')
        .replace(/$/, '</p>')

        // Clean up any unclosed divs
        .replace(/(<div[^>]*>[^<]*<\/strong>[^<]*(?!<\/div>))$/g, '$1</div>');

    // Restore protected LaTeX expressions
    latexProtected.forEach((latex, index) => {
        formatted = formatted.replace(`__LATEX_DISPLAY_${index}__`, latex);
        formatted = formatted.replace(`__LATEX_INLINE_${index}__`, latex);
        formatted = formatted.replace(`__LATEX_BRACKET_${index}__`, latex);
    });

    return formatted;
}

// Update usage display
function updateUsageDisplay(remaining, limit, isGlobalLimit = false) {
    const remainingQuestions = document.getElementById('remaining-questions');
    const dailyUsage = document.getElementById('daily-usage');

    if (remainingQuestions) {
        if (isGlobalLimit) {
            remainingQuestions.textContent = 'Platform daily budget reached ($10) 🌍';
            remainingQuestions.className = 'text-red-600 text-xs mt-1';
        } else if (remaining > 0) {
            remainingQuestions.textContent = `${remaining}/${limit} conversations left today`;
            remainingQuestions.className = 'text-green-600 text-xs mt-1';
        } else {
            remainingQuestions.textContent = 'Your daily limit reached - back tomorrow! 😊';
            remainingQuestions.className = 'text-orange-600 text-xs mt-1';
        }
    }

    if (dailyUsage && remaining === 0) {
        if (isGlobalLimit) {
            dailyUsage.textContent = 'Platform limit: $10 daily budget';
        } else {
            dailyUsage.textContent = 'Your limit: 10¢ budget used';
        }
    }

    // Update conversation counter in chat interface
    updateConversationCounter(remaining);
}

// Update conversation counter in chat interface
function updateConversationCounter(remaining) {
    const counter = document.getElementById('conversation-counter');
    const remainingSpan = document.getElementById('conversations-remaining');

    if (counter && remainingSpan) {
        remainingSpan.textContent = remaining;

        // Show counter after first interaction or if limit is getting low
        if (remaining < 25 || remaining <= 10) {
            counter.classList.remove('hidden');

            // Change styling based on remaining count
            const counterBadge = counter.querySelector('div');
            if (remaining <= 5) {
                counterBadge.className = 'inline-block bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200';
            } else if (remaining <= 10) {
                counterBadge.className = 'inline-block bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-200';
            } else {
                counterBadge.className = 'inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200';
            }
        }
    }
}

// Add some welcome quick start options on load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Teach.sg Chat initialized - No registration required!');

    // Initialize conversation counter display
    try {
        const remaining = await getRemainingConversations();
        updateConversationCounter(remaining);
    } catch (error) {
        console.error('Failed to initialize conversation counter:', error);
    }

    // Initialize usage display
    const remaining = getRemainingConversations();
    updateUsageDisplay(remaining, DAILY_CONVERSATION_LIMIT);

    // Check if there's an auto-question from another page
    const autoQuestion = sessionStorage.getItem('autoQuestion');
    if (autoQuestion) {
        sessionStorage.removeItem('autoQuestion');
        // Wait a bit for the page to fully load, then ask the question
        setTimeout(() => {
            sendMessage(autoQuestion);
        }, 500);
    }
});