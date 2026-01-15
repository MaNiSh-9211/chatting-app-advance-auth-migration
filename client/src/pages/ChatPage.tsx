import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './ChatPage.css';

interface Chat {
    _id: string;
    type: 'personal' | 'group';
    participants: any[];
    name?: string;
    avatar?: string;
    lastMessage?: any;
    lastMessageAt?: string;
    unreadCount?: Record<string, number>;
}

interface Message {
    _id: string;
    sender: any;
    content: string;
    type: 'text' | 'image' | 'file';
    createdAt: string;
    reactions?: Record<string, string[]>;
}

export const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initial load and polling
    useEffect(() => {
        loadChats();
        const interval = setInterval(loadChats, 10000); // Poll chat list
        return () => clearInterval(interval);
    }, []);

    // Handle URL params and Chat Selection
    useEffect(() => {
        const userId = searchParams.get('userId');
        const chatId = searchParams.get('chatId');

        if (userId && user) {
            // Create or get personal chat with this user
            createOrGetPersonalChat(userId);
        } else if (chatId && chats.length > 0) {
            // Load specific chat if chats are loaded
            const chat = chats.find(c => c._id === chatId);
            if (chat) {
                if (selectedChat?._id !== chat._id) {
                    setSelectedChat(chat);
                }
            }
        }
    }, [searchParams, user, chats]);

    // Load messages when chat is selected
    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat._id);
            const interval = setInterval(() => {
                loadMessages(selectedChat._id);
            }, 3000); // Poll messages
            return () => clearInterval(interval);
        }
    }, [selectedChat?._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadChats = async () => {
        try {
            const response = await api.request('/chat/list', { method: 'GET' });
            if (response.success) {
                setChats(response.chats);
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    };

    const createOrGetPersonalChat = async (otherUserId: string) => {
        if (loading) return;

        try {
            setLoading(true);
            const response = await api.request('/chat/personal', {
                method: 'POST',
                body: JSON.stringify({ otherUserId }),
            });

            // Remove userId param to prevent infinite loop
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('userId');

            if (response.success) {
                await loadChats();
                const newChat = response.chat;
                // Navigate to chat ID
                navigate(`/chat?chatId=${newChat._id}`, { replace: true });
            } else {
                setSearchParams(newParams);
            }
        } catch (error) {
            console.error('Failed to create/get chat:', error);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('userId');
            setSearchParams(newParams);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            const response = await api.request(`/chat/${chatId}/messages`, { method: 'GET' });
            if (response.success) {
                setMessages(response.messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedChat) return;

        try {
            const content = messageInput.trim();
            setMessageInput('');
            setShowEmojiPicker(false);

            const response = await api.request(`/chat/${selectedChat._id}/messages`, {
                method: 'POST',
                body: JSON.stringify({
                    content,
                    chatId: selectedChat._id
                }),
            });

            if (response.success) {
                loadMessages(selectedChat._id);
                loadChats();
            } else {
                setMessageInput(content);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessageInput(messageInput);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getChatName = (chat: Chat): string => {
        if (chat.type === 'group') {
            return chat.name || 'Group Chat';
        }
        const otherParticipant = chat.participants.find(
            (p: any) => p._id !== user?._id
        );
        return otherParticipant?.customDisplayName || otherParticipant?.displayName || 'Unknown';
    };

    const getChatAvatar = (chat: Chat): string => {
        if (chat.type === 'group' && chat.avatar) {
            return chat.avatar;
        }
        const otherParticipant = chat.participants.find(
            (p: any) => p._id !== user?._id
        );
        return otherParticipant?.customAvatar || otherParticipant?.avatar || 'https://ui-avatars.com/api/?name=User';
    };

    // Filter chats based on search query
    const filteredChats = chats.filter(chat =>
        getChatName(chat).toLowerCase().includes(chatSearchQuery.toLowerCase())
    );

    return (
        <div className="chat-page">
            <div className={`chat-sidebar ${selectedChat ? 'mobile-hidden' : ''}`}>
                <div className="chat-sidebar-header">
                    <h2>Messages</h2>
                    <input
                        type="text"
                        placeholder="Search chats..."
                        className="chat-search-input"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            padding: '0.8rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                </div>
                <div className="chat-list">
                    {filteredChats.map((chat) => (
                        <div
                            key={chat._id}
                            className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedChat(chat);
                                navigate(`/chat?chatId=${chat._id}`, { replace: true });
                            }}
                        >
                            <div className="chat-item-avatar">
                                <img src={getChatAvatar(chat)} alt={getChatName(chat)} />
                            </div>
                            <div className="chat-item-info">
                                <div className="chat-item-name">{getChatName(chat)}</div>
                                {chat.lastMessage && (
                                    <div className="chat-item-preview">
                                        {chat.lastMessage.content}
                                    </div>
                                )}
                            </div>
                            {chat.unreadCount && chat.unreadCount[user?._id || ''] > 0 && (
                                <div className="chat-item-unread">
                                    {chat.unreadCount[user?._id || '']}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredChats.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            No chats found
                        </div>
                    )}
                </div>
            </div>

            <div className={`chat-main ${selectedChat ? 'mobile-visible' : ''}`}>
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <button
                                className="back-button mobile-back-btn"
                                onClick={() => {
                                    setSelectedChat(null);
                                    navigate('/chat');
                                }}
                                style={{
                                    display: 'none', // Overridden by media query if needed
                                    marginRight: '1rem',
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer'
                                }}
                            >
                                ←
                            </button>
                            <div className="chat-header-info">
                                <img
                                    src={getChatAvatar(selectedChat)}
                                    alt={getChatName(selectedChat)}
                                    className="chat-header-avatar"
                                    onClick={() => {
                                        if (selectedChat.type === 'personal') {
                                            const otherParticipant = selectedChat.participants.find(
                                                (p: any) => p._id !== user?._id
                                            );
                                            if (otherParticipant) {
                                                navigate(`/profile/${otherParticipant._id}`);
                                            }
                                        }
                                    }}
                                />
                                <div>
                                    <div className="chat-header-name">{getChatName(selectedChat)}</div>
                                    {selectedChat.type === 'group' && (
                                        <div className="chat-header-meta">
                                            {selectedChat.participants.length} members
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="chat-messages" ref={chatContainerRef}>
                            {messages.map((message) => {
                                // Handle both populated and unpopulated sender
                                const senderId = typeof message.sender === 'string'
                                    ? message.sender
                                    : (message.sender._id || message.sender.id);

                                const currentUserId = user?._id || user?.id;
                                const isOwn = String(senderId) === String(currentUserId);

                                // console.log('Message Debug:', { msgId: message._id, senderId, currentUserId, isOwn }); // For debugging if needed

                                return (
                                    <div
                                        key={message._id}
                                        className={`message ${isOwn ? 'message-own' : 'message-other'}`}
                                    >
                                        {!isOwn && (
                                            <img
                                                src={message.sender.customAvatar || message.sender.avatar || 'https://ui-avatars.com/api/?name=' + message.sender.displayName}
                                                alt={message.sender.displayName}
                                                className="message-avatar"
                                                onClick={() => navigate(`/profile/${message.sender._id}`)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        )}
                                        <div className="message-content">
                                            {!isOwn && (
                                                <div className="message-sender">
                                                    {message.sender.customDisplayName || message.sender.displayName}
                                                </div>
                                            )}
                                            <div className="message-bubble">{message.content}</div>
                                            <div className="message-time">
                                                {new Date(message.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-container">
                            <div className="chat-input-actions">
                                <button
                                    className="emoji-button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    😊
                                </button>
                                {showEmojiPicker && (
                                    <div className="emoji-picker-container">
                                        <EmojiPicker
                                            onEmojiClick={(emojiObject) => {
                                                setMessageInput(prev => prev + emojiObject.emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            width={300}
                                            height={400}
                                            theme={Theme.DARK}
                                        />
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Type a message..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                            />
                            <button
                                className="chat-send-button"
                                onClick={sendMessage}
                                disabled={!messageInput.trim()}
                            >
                                ➤
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">💬</div>
                        <h3>Select a chat to start messaging</h3>
                        <p>Choose a conversation from the sidebar or start a new one</p>
                    </div>
                )}
            </div>
        </div>
    );
};
