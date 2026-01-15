import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LogoutIcon, MailIcon, EditIcon, CheckIcon, XIcon } from '../components/Icons';
import { Spinner, Alert } from '../components/FormElements';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bio, setBio] = useState(user?.bio || '');
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    const handleSaveBio = async () => {
        if (bio.length > 500) {
            setStatus({ loading: false, error: 'Bio must be 500 characters or less', success: '' });
            return;
        }

        setStatus({ loading: true, error: '', success: '' });
        try {
            const result = await api.updateBio(bio);
            if (result.success) {
                setStatus({ loading: false, error: '', success: 'Bio updated successfully!' });
                setIsEditingBio(false);
                await refreshUser();
            } else {
                setStatus({ loading: false, error: result.message || 'Failed to update bio', success: '' });
            }
        } catch (error: any) {
            setStatus({ loading: false, error: error.message || 'Failed to update bio', success: '' });
        }
    };

    const handleCancelEdit = () => {
        setBio(user.bio || '');
        setIsEditingBio(false);
        setStatus({ loading: false, error: '', success: '' });
    };

    return (
        <div className="settings-page">
            <div className="settings-container">
                <header className="settings-header">
                    <h1>Account Settings</h1>
                    <p>Manage your account preferences and session.</p>
                </header>

                <div className="settings-section">
                    <h2>Profile</h2>
                    <div className="settings-profile-info">
                        <img
                            src={user.customAvatar || user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                            alt={user.displayName}
                            className="settings-avatar"
                        />
                        <div className="settings-details">
                            <h3>{user.customDisplayName || user.displayName}</h3>
                            <p>{user.email}</p>
                            <span className="user-badge">@{user.displayId || 'user'}</span>
                        </div>
                    </div>
                </div>

                {status.error && <Alert type="error">{status.error}</Alert>}
                {status.success && <Alert type="success">{status.success}</Alert>}

                <div className="settings-section">
                    <div className="account-section-header">
                        <h2 className="account-section-title">
                            <EditIcon size={20} />
                            Bio
                        </h2>
                        {!isEditingBio && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setIsEditingBio(true)}
                            >
                                <EditIcon size={16} />
                                Edit Bio
                            </button>
                        )}
                    </div>

                    {isEditingBio ? (
                        <div className="bio-edit-container">
                            <textarea
                                className="bio-textarea"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about yourself..."
                                maxLength={500}
                                rows={6}
                                style={{ width: '100%', marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            <div className="bio-edit-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                <span className="bio-character-count" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                    {bio.length}/500 characters
                                </span>
                                <div className="bio-edit-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleCancelEdit}
                                        disabled={status.loading}
                                    >
                                        <XIcon size={16} />
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveBio}
                                        disabled={status.loading}
                                    >
                                        {status.loading ? (
                                            <Spinner size="sm" />
                                        ) : (
                                            <>
                                                <CheckIcon size={16} />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bio-display" style={{ marginTop: '1rem', color: '#cbd5e1' }}>
                            {user.bio ? (
                                <p className="bio-text">"{user.bio}"</p>
                            ) : (
                                <p className="bio-placeholder" style={{ fontStyle: 'italic', color: '#94a3b8' }}>No bio added yet. Click "Edit Bio" to add one.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="settings-section">
                    <div className="account-section-header">
                        <h2 className="account-section-title">
                            <MailIcon size={20} />
                            Account Migration
                        </h2>
                    </div>
                    <div className="account-actions" style={{ marginTop: '1rem' }}>
                        <button onClick={() => navigate('/migrate')} className="btn btn-primary" style={{ width: '100%', padding: '1rem', background: '#7c3aed', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                            Migrate Account
                        </button>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center' }}>
                            Change your email address and transfer your account data
                        </p>
                    </div>
                </div>

                <div className="settings-section danger-zone">
                    <h2>Session</h2>
                    <p>Sign out of your account on this device.</p>
                    <button className="btn-danger" onClick={handleLogout}>
                        <LogoutIcon size={20} />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};
