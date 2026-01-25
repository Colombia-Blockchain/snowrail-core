/**
 * YUKI Chat Component
 * Premium AI assistant interface for SnowRail
 * 
 * @author Colombia Blockchain
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface YukiChatProps {
  userId: string;
  walletAddress?: string;
  onPaymentRequest?: (amount: number, recipient: string) => void;
  className?: string;
}

// Component
export function YukiChat({ userId, walletAddress, onPaymentRequest, className = '' }: YukiChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm YUKI ❄️, your SnowRail assistant.\n\nI can help you with:\n• 💰 Check balances\n• 🔒 Verify payment safety (SENTINEL)\n• 💸 Execute secure payments\n\nWhat would you like to do?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (replace with actual YUKI API call)
    setTimeout(() => {
      const response = generateMockResponse(input.trim());
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick actions
  const quickActions = [
    { label: '💰 Balance', action: 'What\'s my balance?' },
    { label: '🔒 Check URL', action: 'Check trust for ' },
    { label: '📜 History', action: 'Show my transaction history' }
  ];

  return (
    <div className={`yuki-chat ${className}`}>
      <style>{styles}</style>
      
      {/* Header */}
      <div className="yuki-header">
        <div className="yuki-avatar">
          <span className="yuki-avatar-icon">❄️</span>
        </div>
        <div className="yuki-header-info">
          <h3 className="yuki-title">YUKI</h3>
          <span className="yuki-status">
            <span className="yuki-status-dot"></span>
            Online
          </span>
        </div>
        <div className="yuki-header-badge">AI Assistant</div>
      </div>

      {/* Messages */}
      <div className="yuki-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`yuki-message yuki-message-${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="yuki-message-avatar">❄️</div>
            )}
            <div className="yuki-message-content">
              <div className="yuki-message-text">
                {msg.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className="yuki-message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="yuki-message yuki-message-assistant">
            <div className="yuki-message-avatar">❄️</div>
            <div className="yuki-message-content">
              <div className="yuki-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="yuki-quick-actions">
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="yuki-quick-btn"
            onClick={() => setInput(action.action)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="yuki-input-container">
        <input
          ref={inputRef}
          type="text"
          className="yuki-input"
          placeholder="Ask YUKI anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isTyping}
        />
        <button
          className="yuki-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Mock response generator (replace with actual YUKI API)
function generateMockResponse(input: string): string {
  const lower = input.toLowerCase();
  
  if (lower.includes('balance')) {
    return '💰 Your current balance is **1,250.00 USDC**\n\nWould you like to make a payment or check your transaction history?';
  }
  
  if (lower.includes('check') || lower.includes('trust') || lower.includes('safe')) {
    return `🔒 **SENTINEL Trust Analysis**\n\n📊 Trust Score: **87/100**\n🎯 Risk Level: LOW\n✅ Safe to pay\n\n• TLS Certificate: Valid ✓\n• DNS Security: Protected ✓\n• Cloud Provider: AWS ✓\n• Payment Processor: Stripe ✓`;
  }
  
  if (lower.includes('history') || lower.includes('transactions')) {
    return '📜 **Recent Transactions**\n\n1. 100 USDC → merchant.xyz (Jan 25)\n2. 50 USDC → api.service.com (Jan 24)\n3. 250 USDC → vendor.io (Jan 23)';
  }
  
  if (lower.includes('pay') || lower.includes('send')) {
    return '📤 **Payment Request**\n\nTo complete this payment, I need:\n• Amount (e.g., 100 USDC)\n• Recipient URL or address\n\nExample: "Pay 100 USDC to https://merchant.com"';
  }
  
  if (lower.includes('help')) {
    return `Here's what I can do:\n\n**Payments:**\n• "Pay $100 to merchant.com"\n• "Send 50 USDC to 0x..."\n\n**Security:**\n• "Check https://merchant.com"\n• "Is this URL safe?"\n\n**Account:**\n• "What's my balance?"\n• "Show my history"`;
  }
  
  return "I'm here to help with payments and security checks. Try asking me to check a URL's trust score or make a payment! 🎯";
}

// Styles
const styles = `
.yuki-chat {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-height: 80vh;
  width: 100%;
  max-width: 420px;
  background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.yuki-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.yuki-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.yuki-avatar-icon {
  font-size: 24px;
}

.yuki-header-info {
  flex: 1;
}

.yuki-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.yuki-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.yuki-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
}

.yuki-header-badge {
  padding: 4px 10px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  font-size: 11px;
  color: #a78bfa;
  font-weight: 500;
}

.yuki-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.yuki-messages::-webkit-scrollbar {
  width: 6px;
}

.yuki-messages::-webkit-scrollbar-track {
  background: transparent;
}

.yuki-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.yuki-message {
  display: flex;
  gap: 10px;
  max-width: 85%;
  animation: messageIn 0.3s ease-out;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.yuki-message-user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.yuki-message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.yuki-message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.yuki-message-text {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  color: #ffffff;
}

.yuki-message-assistant .yuki-message-text {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px 18px 18px 4px;
}

.yuki-message-user .yuki-message-text {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-radius: 18px 18px 4px 18px;
}

.yuki-message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  padding: 0 4px;
}

.yuki-message-user .yuki-message-time {
  text-align: right;
}

.yuki-typing {
  display: flex;
  gap: 4px;
  padding: 16px;
}

.yuki-typing span {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.yuki-typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.yuki-typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

.yuki-quick-actions {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  overflow-x: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.yuki-quick-actions::-webkit-scrollbar {
  display: none;
}

.yuki-quick-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.yuki-quick-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.yuki-input-container {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.yuki-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.yuki-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.yuki-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.yuki-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.yuki-send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.yuki-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

export default YukiChat;
