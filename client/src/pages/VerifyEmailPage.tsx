import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircleIcon, XCircleIcon } from '../components/Icons';
import { Spinner } from '../components/FormElements';
import { AuthLayout, AuthCard, AuthHeader } from '../components/AuthLayout';

export const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setUserFromOAuth } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        // Case 1: Token is present - Perform immediate verification
        if (token) {
            const verifyEmail = async () => {
                try {
                    const response = await api.verifyEmail(token);
                    if (response.success) {
                        setStatus('success');
                        setMessage('Your email has been verified successfully! Redirecting...');

                        if (response.accessToken && response.refreshToken) {
                            await setUserFromOAuth(response.accessToken, response.refreshToken);
                            setTimeout(() => navigate('/dashboard'), 2000);
                        }
                    } else {
                        setStatus('error');
                        setMessage(response.message || 'Verification failed');
                    }
                } catch (error: any) {
                    setStatus('error');
                    setMessage(error.message || 'Verification failed');
                }
            };
            verifyEmail();
            return;
        }

        // Case 2: No token but email is present - Start polling
        if (email) {
            setStatus('loading');
            const pollInterval = setInterval(async () => {
                try {
                    const { verified } = await api.getVerificationStatus(email);
                    if (verified) {
                        clearInterval(pollInterval);
                        setStatus('success');
                        setMessage('Email verified! Redirecting to login...');
                        setTimeout(() => navigate('/login'), 2500);
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, 3000);

            return () => clearInterval(pollInterval);
        }

        // Case 3: Neither - Fallback to error if neither token nor email
        if (!token && !email) {
            setStatus('error');
            setMessage('Invalid verification state');
        }
    }, [searchParams, setUserFromOAuth, navigate]);

    const [cooldown, setCooldown] = useState(0);
    const emailToVerify = searchParams.get('email');

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResend = async () => {
        if (!emailToVerify) return;
        try {
            await api.resendVerification(emailToVerify);
            setMessage('Verification code resent! Please check your email.');
            setCooldown(30); // 30 seconds cooldown
        } catch (error) {
            setMessage('Failed to resend verification code.');
        }
    };

    return (
        <AuthLayout>
            <AuthCard>
                <AuthHeader title="Email Verification" />

                <div className="text-center">
                    {status === 'loading' && (
                        <div>
                            <Spinner size="lg" />
                            <p style={{ marginTop: 'var(--spacing-4)' }}>Verifying your email...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <div style={{ color: 'var(--color-success)', display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)' }}>
                                <CheckCircleIcon size={64} />
                            </div>
                            <p style={{ marginBottom: 'var(--spacing-6)' }}>{message}</p>
                            <Link to="/login" className="btn btn-primary btn-full">
                                Continue to Login
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <div style={{ color: 'var(--color-error)', display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)' }}>
                                <XCircleIcon />
                            </div>
                            <p style={{ marginBottom: 'var(--spacing-6)' }}>{message}</p>

                            {emailToVerify && (
                                <button
                                    onClick={handleResend}
                                    disabled={cooldown > 0}
                                    className="btn btn-secondary btn-full"
                                    style={{ marginBottom: 'var(--spacing-4)' }}
                                >
                                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
                                </button>
                            )}

                            <Link to="/register" className="btn btn-ghost btn-full">
                                Back to Registration
                            </Link>
                        </div>
                    )}
                </div>
            </AuthCard>
        </AuthLayout>
    );
};
