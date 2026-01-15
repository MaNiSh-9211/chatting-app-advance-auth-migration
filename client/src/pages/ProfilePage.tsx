import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './ProfilePage.css';

interface ProfilePost {
    _id: string;
    image: string;
    caption?: string;
    likes: any[];
    comments: Array<{
        _id: string;
        user: any;
        content: string;
        likes: any[];
        replies?: any[];
        createdAt: string;
    }>;
    createdAt: string;
}

interface UserProfile {
    _id: string;
    displayName: string;
    customDisplayName?: string;
    avatar?: string;
    customAvatar?: string;
    email: string;
    bio?: string;
    status?: string;
    isProfilePublic: boolean;
}

export const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<ProfilePost[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newPostImage, setNewPostImage] = useState<File | null>(null);
    const [newPostCaption, setNewPostCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isOwnProfile = userId === currentUser?._id || !userId;

    useEffect(() => {
        loadProfile();
        loadPosts();
    }, [userId]);

    const loadProfile = async () => {
        try {
            const targetUserId = userId || currentUser?._id;
            if (!targetUserId) return;

            const response = await api.request(`/auth/profile/${targetUserId}`, { method: 'GET' });
            if (response.success) {
                setProfile(response.user);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async () => {
        try {
            const targetUserId = userId || currentUser?._id;
            if (!targetUserId) return;

            const response = await api.request(`/posts/user/${targetUserId}`, { method: 'GET' });
            if (response.success) {
                setPosts(response.posts);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert('Image size must be less than 10MB');
                return;
            }
            setNewPostImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.request('/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.success) {
            // If URL is already full, use it; otherwise prepend origin
            if (response.url.startsWith('http')) {
                return response.url;
            }
            return `${window.location.origin}${response.url}`;
        }
        throw new Error('Failed to upload image');
    };

    const createPost = async () => {
        if (!newPostImage) return;

        try {
            setUploading(true);
            const imageUrl = await uploadImage(newPostImage);

            const response = await api.request('/posts', {
                method: 'POST',
                body: JSON.stringify({
                    image: imageUrl,
                    caption: newPostCaption || undefined,
                }),
            });

            if (response.success) {
                setShowUploadModal(false);
                setNewPostImage(null);
                setNewPostCaption('');
                setPreviewUrl(null);
                loadPosts();
            }
        } catch (error: any) {
            alert(error.message || 'Failed to create post');
        } finally {
            setUploading(false);
        }
    };

    const toggleLike = async (postId: string) => {
        try {
            const response = await api.request(`/posts/${postId}/like`, { method: 'POST' });
            if (response.success) {
                loadPosts();
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    };

    const addComment = async (postId: string, content: string) => {
        try {
            const response = await api.request(`/posts/${postId}/comment`, {
                method: 'POST',
                body: JSON.stringify({ content }),
            });
            if (response.success) {
                loadPosts();
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    const getDisplayName = (user: any): string => {
        return user?.customDisplayName || user?.displayName || 'Unknown';
    };

    const getAvatar = (user: any): string => {
        return user?.customAvatar || user?.avatar || '';
    };

    if (loading) {
        return (
            <div className="profile-page-loading">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-page-error">
                <h2>Profile not found</h2>
                <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar-container">
                    <img
                        src={getAvatar(profile)}
                        alt={getDisplayName(profile)}
                        className="profile-avatar-large"
                    />
                    {isOwnProfile && (
                        <button
                            className="profile-avatar-edit"
                            onClick={() => navigate('/account')}
                        >
                            Edit
                        </button>
                    )}
                </div>
                <div className="profile-info">
                    <h1 className="profile-name">{getDisplayName(profile)}</h1>
                    <p className="profile-email">{profile.email}</p>
                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                    <div className="profile-stats">
                        <div className="profile-stat">
                            <span className="stat-value">{posts.length}</span>
                            <span className="stat-label">Posts</span>
                        </div>
                    </div>
                </div>
            </div>

            {isOwnProfile && (
                <div className="profile-actions">
                    <button
                        className="btn-primary"
                        onClick={() => setShowUploadModal(true)}
                    >
                        📸 Upload Post
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/account')}
                    >
                        ⚙️ Edit Profile
                    </button>
                </div>
            )}

            <div className="profile-posts-grid">
                {posts.length === 0 ? (
                    <div className="profile-empty-posts">
                        <div className="empty-icon">📷</div>
                        <h3>No posts yet</h3>
                        {isOwnProfile && (
                            <p>Share your first moment by uploading a post!</p>
                        )}
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post._id} className="profile-post-card">
                            <img src={post.image} alt={post.caption || 'Post'} />
                            <div className="post-overlay">
                                <div className="post-stats">
                                    <span>❤️ {post.likes.length}</span>
                                    <span>💬 {post.comments.length}</span>
                                </div>
                            </div>
                            <div className="post-details">
                                {post.caption && <p className="post-caption">{post.caption}</p>}
                                <div className="post-actions">
                                    <button
                                        onClick={() => toggleLike(post._id)}
                                        className={`like-button ${post.likes.some((l: any) => l._id === currentUser?._id) ? 'liked' : ''}`}
                                    >
                                        ❤️ {post.likes.length}
                                    </button>
                                    <button className="comment-button">
                                        💬 {post.comments.length}
                                    </button>
                                </div>
                                {post.comments.length > 0 && (
                                    <div className="post-comments-preview">
                                        {post.comments.slice(0, 2).map((comment) => (
                                            <div key={comment._id} className="comment-preview">
                                                <strong>{getDisplayName(comment.user)}:</strong> {comment.content}
                                            </div>
                                        ))}
                                        {post.comments.length > 2 && (
                                            <div className="view-all-comments">
                                                View all {post.comments.length} comments
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showUploadModal && (
                <div className="upload-modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Upload New Post</h2>
                        <div className="upload-preview">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" />
                            ) : (
                                <div className="upload-placeholder">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="select-image-button"
                                    >
                                        Select Image
                                    </button>
                                </div>
                            )}
                        </div>
                        <textarea
                            className="upload-caption"
                            placeholder="Write a caption..."
                            value={newPostCaption}
                            onChange={(e) => setNewPostCaption(e.target.value)}
                            maxLength={1000}
                        />
                        <div className="upload-actions">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setNewPostImage(null);
                                    setPreviewUrl(null);
                                    setNewPostCaption('');
                                }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPost}
                                disabled={!newPostImage || uploading}
                                className="btn-primary"
                            >
                                {uploading ? 'Uploading...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

