let isLoading = false;

function addMessage(content, isUser = false) {
    const chatContainer = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-4 ${isUser ? 'text-right' : 'text-left'}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = `inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800 shadow'
    }`;

    if (isUser) {
        messageBubble.textContent = content;
    } else {
        messageBubble.innerHTML = content;
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