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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

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
        // Format headings (ALL CAPS words followed by colon)
        .replace(/^([A-Z][A-Z\s&-]+):$/gm, '<h3 class="font-bold text-lg text-gray-800 mt-4 mb-2">$1</h3>')

        // Format numbered sections (1., 2., etc.)
        .replace(/^(\d+\.\s+[^:]+):/gm, '<h4 class="font-semibold text-gray-700 mt-3 mb-1">$1:</h4>')

        // Format bullet points
        .replace(/^- (.+)$/gm, '<div class="ml-4 mb-1">• $1</div>')

        // Format bold text (words in all caps within sentences)
        .replace(/\b([A-Z]{2,})\b/g, '<strong class="font-semibold">$1</strong>')

        // Format examples and practice sections
        .replace(/^(PRACTICAL EXAMPLE|EXAMPLE|PRACTICE):/gm, '<div class="bg-blue-50 p-3 rounded-lg mt-4 mb-2"><strong class="text-blue-800">$1:</strong>')
        .replace(/^(Would you like to|Try this|Next steps):/gm, '</div><div class="bg-green-50 p-3 rounded-lg mt-4 mb-2"><strong class="text-green-800">$1:</strong>')

        // Format line breaks properly
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br>')

        // Wrap in paragraph tags
        .replace(/^/, '<p class="mb-2">')
        .replace(/$/, '</p>')

        // Clean up any unclosed divs
        .replace(/(<div[^>]*>[^<]*<\/strong>[^<]*(?!<\/div>))$/g, '$1</div>');
}

// Add some welcome quick start options on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Teach.sg Chat initialized');

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