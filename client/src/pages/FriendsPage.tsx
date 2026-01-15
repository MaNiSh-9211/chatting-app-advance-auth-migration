import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './FriendsPage.css';

interface Friend {
    _id: string;
    displayName: string;
    customDisplayName?: string;
    avatar?: string;
    customAvatar?: string;
    email: string;
    status?: 'online' | 'offline' | 'away' | 'busy';
}

interface FriendRequest {
    _id: string;
    from: Friend;
    to: Friend;
    message?: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

export const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'email' | 'id'>('email');
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setSearchResults([]);
        try {
            if (searchType === 'id') {
                const response = await api.searchUserById(searchQuery.trim());
                if (response.success && response.user) {
                    setSearchResults([response.user]);
                }
            } else {
                const response = await api.searchUsers(searchQuery.trim());
                if (response.success && response.users) {
                    setSearchResults(response.users);
                }
            }
        } catch (error: any) {
            console.error('Search failed:', error);
            // Optionally show error to user
            if (error.message) alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'friends') {
            loadFriends();
        } else if (activeTab === 'requests') {
            loadFriendRequests();
        }
    }, [activeTab]);

    const loadFriends = async () => {
        try {
            const response = await api.request('/friends/list', { method: 'GET' });
            if (response.success) {
                setFriends(response.friends);
            }
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    };

    const loadFriendRequests = async () => {
        try {
            const response = await api.request('/friends/requests?type=received', { method: 'GET' });
            if (response.success) {
                setFriendRequests(response.friendRequests);
            }
        } catch (error) {
            console.error('Failed to load friend requests:', error);
        }
    };

    const sendFriendRequest = async (userId: string) => {
        try {
            setLoading(true);
            const response = await api.request('/friends/request', {
                method: 'POST',
                body: JSON.stringify({ toUserId: userId }),
            });
            if (response.success) {
                alert('Friend request sent!');
            }
        } catch (error: any) {
            alert(error.message || 'Failed to send friend request');
        } finally {
            setLoading(false);
        }
    };

    const acceptRequest = async (requestId: string) => {
        try {
            setLoading(true);
            const response = await api.request(`/friends/request/${requestId}/accept`, {
                method: 'POST',
            });
            if (response.success) {
                loadFriendRequests();
                loadFriends();
            }
        } catch (error) {
            console.error('Failed to accept request:', error);
        } finally {
            setLoading(false);
        }
    };

    const rejectRequest = async (requestId: string) => {
        try {
            setLoading(true);
            const response = await api.request(`/friends/request/${requestId}/reject`, {
                method: 'POST',
            });
            if (response.success) {
                loadFriendRequests();
            }
        } catch (error) {
            console.error('Failed to reject request:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDisplayName = (friend: Friend): string => {
        return friend.customDisplayName || friend.displayName;
    };

    const getAvatar = (friend: Friend): string => {
        return friend.customAvatar || friend.avatar || '';
    };

    const getStatusColor = (status?: string): string => {
        switch (status) {
            case 'online':
                return '#10b981';
            case 'away':
                return '#f59e0b';
            case 'busy':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    return (
        <div className="friends-page">
            <div className="friends-header">
                <h1>Friends</h1>
                <div className="friends-tabs">
                    <button
                        className={activeTab === 'friends' ? 'active' : ''}
                        onClick={() => setActiveTab('friends')}
                    >
                        Friends ({friends.length})
                    </button>
                    <button
                        className={activeTab === 'requests' ? 'active' : ''}
                        onClick={() => setActiveTab('requests')}
                    >
                        Requests ({friendRequests.length})
                    </button>
                    <button
                        className={activeTab === 'search' ? 'active' : ''}
                        onClick={() => setActiveTab('search')}
                    >
                        Find Friends
                    </button>
                </div>
            </div>

            <div className="friends-content">
                {activeTab === 'friends' && (
                    <div className="friends-list">
                        {friends.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">👥</div>
                                <h3>No friends yet</h3>
                                <p>Start by searching for friends or accepting friend requests</p>
                            </div>
                        ) : (
                            friends.map((friend) => (
                                <div key={friend._id} className="friend-card">
                                    <div className="friend-avatar-container">
                                        <img src={getAvatar(friend)} alt={getDisplayName(friend)} />
                                        <div
                                            className="friend-status"
                                            style={{ backgroundColor: getStatusColor(friend.status) }}
                                        />
                                    </div>
                                    <div className="friend-info">
                                        <div className="friend-name">{getDisplayName(friend)}</div>
                                        <div className="friend-email">{friend.email}</div>
                                    </div>
                                    <button
                                        className="friend-action-button"
                                        onClick={() => navigate(`/profile/${friend._id}`)}
                                    >
                                        View Profile
                                    </button>
                                    <button
                                        className="friend-action-button"
                                        onClick={async () => {
                                            // Create or get personal chat
                                            try {
                                                const response = await api.request('/chat/personal', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ otherUserId: friend._id }),
                                                });
                                                if (response.success) {
                                                    navigate(`/chat?chatId=${response.chat._id}`);
                                                }
                                            } catch (error) {
                                                console.error('Failed to start chat:', error);
                                            }
                                        }}
                                    >
                                        Message
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="friend-requests-list">
                        {friendRequests.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📬</div>
                                <h3>No pending requests</h3>
                                <p>Friend requests will appear here</p>
                            </div>
                        ) : (
                            friendRequests.map((request) => (
                                <div key={request._id} className="friend-request-card">
                                    <div className="friend-avatar-container">
                                        <img
                                            src={getAvatar(request.from)}
                                            alt={getDisplayName(request.from)}
                                        />
                                    </div>
                                    <div className="friend-request-info">
                                        <div className="friend-name">{getDisplayName(request.from)}</div>
                                        <div className="friend-email">{request.from.email}</div>
                                        {request.message && (
                                            <div className="friend-request-message">"{request.message}"</div>
                                        )}
                                    </div>
                                    <div className="friend-request-actions">
                                        <button
                                            className="accept-button"
                                            onClick={() => acceptRequest(request._id)}
                                            disabled={loading}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            className="reject-button"
                                            onClick={() => rejectRequest(request._id)}
                                            disabled={loading}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="friends-search">
                        <div className="search-type-selector" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="searchType"
                                    checked={searchType === 'email'}
                                    onChange={() => setSearchType('email')}
                                />
                                Search by Email
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="searchType"
                                    checked={searchType === 'id'}
                                    onChange={() => setSearchType('id')}
                                />
                                Search by User ID
                            </label>
                        </div>
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder={searchType === 'email' ? "Search by email..." : "Enter User ID..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button onClick={handleSearch} disabled={loading}>
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {searchResults.length > 0 ? (
                            <div className="search-results" style={{ marginTop: '2rem' }}>
                                <h3>Search Results</h3>
                                <div className="friends-list">
                                    {searchResults.map((user) => (
                                        <div key={user._id} className="friend-card">
                                            <div className="friend-avatar-container">
                                                <img src={getAvatar(user)} alt={getDisplayName(user)} />
                                                <div
                                                    className="friend-status"
                                                    style={{ backgroundColor: getStatusColor(user.status) }}
                                                />
                                            </div>
                                            <div className="friend-info">
                                                <div className="friend-name">{getDisplayName(user)}</div>
                                                <div className="friend-email">{user.email}</div>
                                                {searchType === 'id' && <div className="friend-id" style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: {user._id}</div>}
                                            </div>
                                            <button
                                                className="friend-action-button"
                                                onClick={() => sendFriendRequest(user._id)}
                                                disabled={loading}
                                            >
                                                Add Friend
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : searchQuery && !loading && (
                            <p className="search-hint">
                                {searchType === 'email'
                                    ? 'Enter an email address to find and send friend requests'
                                    : 'Enter a unique user ID to find a specific user'}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

