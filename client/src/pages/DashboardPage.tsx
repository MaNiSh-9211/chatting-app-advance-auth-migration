import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon } from '../components/Icons';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { api } from '../api/client';
import './DashboardPage.css';

interface DiscoveredUser {
    _id: string;
    displayName: string;
    customDisplayName?: string;
    avatar?: string;
    customAvatar?: string;
    email: string;
    status?: string;
}

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [discoverUsers, setDiscoverUsers] = useState<DiscoveredUser[]>([]);
    const [loadingDiscover, setLoadingDiscover] = useState(true);

    useEffect(() => {
        loadDiscoverUsers();
    }, []);

    const loadDiscoverUsers = async () => {
        try {
            const response = await api.request('/user/discover', { method: 'GET' });
            if (response.success) {
                setDiscoverUsers(response.users);
            }
        } catch (error) {
            console.error('Failed to load discover users:', error);
        } finally {
            setLoadingDiscover(false);
        }
    };

    const startChat = async (userId: string) => {
        // Navigate with intent to create chat
        navigate(`/chat?userId=${userId}`);
    };

    if (!user) {
        return <div className="spinner" />;
    }

    return (
        <div className="social-dashboard">
            {/* Left Sidebar - Navigation */}
            <aside className="social-sidebar left">
                <div className="sidebar-brand">
                    <ShieldIcon size={28} />
                    <span>Between Us</span>
                </div>

                <nav className="social-nav">
                    <button className="nav-item active">
                        <span className="nav-icon">🏠</span> Home
                    </button>
                    <button onClick={() => navigate('/chat')} className="nav-item">
                        <span className="nav-icon">💬</span> Messages
                    </button>
                    <button onClick={() => navigate('/friends')} className="nav-item">
                        <span className="nav-icon">👥</span> Friends
                    </button>
                    <button onClick={() => navigate('/settings')} className="nav-item">
                        <span className="nav-icon">⚙️</span> Settings
                    </button>
                </nav>
            </aside>

            {/* Center - Feed / Content */}
            <main className="social-feed">
                <div className="feed-header">
                    <h2>Discover People</h2>
                </div>

                <div className="discover-grid">
                    {loadingDiscover ? (
                        <div className="spinner-container">
                            <div className="spinner" />
                        </div>
                    ) : discoverUsers.length === 0 ? (
                        <div className="empty-state">No users found to discover.</div>
                    ) : (
                        discoverUsers.map((u) => (
                            <div key={u._id} className="user-card-glass">
                                <div className="user-card-avatar">
                                    <img
                                        src={u.customAvatar || u.avatar || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                        alt={u.displayName}
                                    />
                                </div>
                                <div className="user-card-info">
                                    <h3>{u.customDisplayName || u.displayName}</h3>
                                    <p className="user-status">{u.status || 'No status'}</p>
                                </div>
                                <div className="user-card-actions">
                                    <button
                                        className="btn-primary-sm"
                                        onClick={() => startChat(u._id)}
                                    >
                                        Message
                                    </button>
                                    <button
                                        className="btn-secondary-sm"
                                        onClick={() => navigate(`/profile/${u._id}`)}
                                    >
                                        Profile
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Right Sidebar - Trending / User Status */}
            <aside className="social-sidebar right">
                <div className="trending-card">
                    <h3>Trending Topics</h3>
                    <div className="trend-item">#BetweenUsLaunch</div>
                    <div className="trend-item">#NewFeatures</div>
                    <div className="trend-item">#Community</div>
                </div>

                <div className="mini-profile-card">
                    <div className="mini-profile-header">
                        <img
                            src={user.customAvatar || user.avatar}
                            alt={user.displayName}
                        />
                        <div>
                            <h4>{user.displayName}</h4>
                            <span className="user-tag">@{user.displayId || 'user'}</span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};
