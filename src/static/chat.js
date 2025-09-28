let isLoading = false;

function addMessage(content, isUser = false) {
    const chatContainer = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-4 ${isUser ? 'text-right' : 'text-left'}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = `inline-block ${isUser ? 'max-w-xs lg:max-w-md' : 'max-w-2xl lg:max-w-4xl'} px-4 py-3 rounded-lg ${
        isUser
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800 shadow-lg'
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
                ]
            });
        }, 100);
    }

    messageDiv.appendChild(messageBubble);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const chatContainer = document.getElementById('chat-container');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'mb-4 text-left';
    typingDiv.innerHTML = `
        <div class="inline-block bg-white text-gray-500 px-4 py-2 rounded-lg shadow">
            <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
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
                    addMessage(`Daily limit reached! ${data.message || "You've reached your 10¢ daily budget (≈4 questions). Come back tomorrow for more free tutoring!"}`);
                    updateUsageDisplay(0, data.limit || 4);
                }
            } else {
                addMessage(data.error || 'Sorry, I encountered an error. Please try again.');
            }
            return;
        }

        // Add AI response
        addMessage(data.response || 'Sorry, I encountered an error. Please try again.');

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
    // Format the AI response to look more like Claude app
    return content
        // Format section headings (sentence case words followed by colon)
        .replace(/^([A-Z][a-z\s]+[a-z]):$/gm, '<h3 class="font-bold text-lg text-gray-800 mt-4 mb-2">$1</h3>')

        // Format subsection headings
        .replace(/^([A-Z][A-Z\s&-]+):$/gm, '<h4 class="font-semibold text-gray-700 mt-3 mb-1 text-sm uppercase tracking-wide">$1</h4>')

        // Format numbered sections (1., 2., etc.)
        .replace(/^(\d+\.\s+[^:]+):/gm, '<h4 class="font-semibold text-gray-700 mt-3 mb-1">$1:</h4>')

        // Format bullet points
        .replace(/^- (.+)$/gm, '<div class="ml-4 mb-1">• $1</div>')

        // Format examples and practice sections
        .replace(/^(Practical example|Example|Practice):/gmi, '<div class="bg-blue-50 p-3 rounded-lg mt-4 mb-2"><strong class="text-blue-800">$1:</strong>')
        .replace(/^(Would you like to|Try this|Next steps):/gmi, '</div><div class="bg-green-50 p-3 rounded-lg mt-4 mb-2"><strong class="text-green-800">$1:</strong>')

        // Format line breaks properly
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br>')

        // Wrap in paragraph tags
        .replace(/^/, '<p class="mb-2">')
        .replace(/$/, '</p>')

        // Clean up any unclosed divs
        .replace(/(<div[^>]*>[^<]*<\/strong>[^<]*(?!<\/div>))$/g, '$1</div>');
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
            remainingQuestions.textContent = `${remaining}/${limit} questions left today`;
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
}

// Add some welcome quick start options on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Teach.sg Chat initialized - No registration required!');

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