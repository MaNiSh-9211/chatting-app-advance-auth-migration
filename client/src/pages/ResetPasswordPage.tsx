import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { LockIcon, XIcon } from '../components/Icons';
import { Spinner, Alert } from '../components/FormElements';
import { AuthLayout, AuthCard, AuthHeader } from '../components/AuthLayout';

export const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus({ type: 'error', message: 'Invalid or missing reset token.' });
        }
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setStatus(null);

        if (!token) return;

        // Validation
        const newErrors: Record<string, string> = {};
        if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.resetPassword(token, formData.password);
            if (response.success) {
                setStatus({ type: 'success', message: 'Password reset successfully! Redirecting...' });
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Failed to reset password' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <AuthLayout>
                <AuthCard>
                    <AuthHeader title="Invalid Link" subtitle="This password reset link is invalid or expired." />
                    <div className="text-center mt-4">
                        <Link to="/forgot-password" className="btn btn-secondary">Request New Link</Link>
                    </div>
                </AuthCard>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthCard>
                <AuthHeader title="Reset Password" subtitle="Create a new strong password" />

                {status && <Alert type={status.type}>{status.message}</Alert>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon"><LockIcon /></span>
                            <input
                                type="password"
                                name="password"
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Min. 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                        </div>
                        {errors.password && <span className="form-error"><XIcon /> {errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon"><LockIcon /></span>
                            <input
                                type="password"
                                name="confirmPassword"
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                        </div>
                        {errors.confirmPassword && <span className="form-error"><XIcon /> {errors.confirmPassword}</span>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Spinner /> : 'Reset Password'}
                    </button>
                </form>
            </AuthCard>
        </AuthLayout>
    );
};
