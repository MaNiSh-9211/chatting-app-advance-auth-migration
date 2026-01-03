import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/FormElements';
import { AuthLayout, AuthCard } from '../components/AuthLayout';

export const OAuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUserFromOAuth } = useAuth();

    useEffect(() => {
        const handleCallback = async () => {
            const accessToken = searchParams.get('accessToken');
            const refreshToken = searchParams.get('refreshToken');
            const error = searchParams.get('error');

            if (error) {
                navigate('/login?error=' + error);
                return;
            }

            if (accessToken && refreshToken) {
                await setUserFromOAuth(accessToken, refreshToken);
                navigate('/dashboard');
            } else {
                navigate('/login?error=oauth_failed');
            }
        };

        handleCallback();
    }, [searchParams, navigate, setUserFromOAuth]);

    return (
        <AuthLayout>
            <AuthCard>
                <div className="text-center">
                    <Spinner size="lg" />
                    <p style={{ marginTop: 'var(--spacing-4)' }}>Completing authentication...</p>
                </div>
            </AuthCard>
        </AuthLayout>
    );
};
