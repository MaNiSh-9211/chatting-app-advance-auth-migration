import React from 'react';
import { GoogleIcon, GithubIcon } from './Icons';
import { api } from '../api/client';

interface OAuthButtonsProps {
    className?: string;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ className }) => (
    <div className={`flex flex-col gap-4 ${className || ''}`}>
        <a href={api.getGoogleAuthUrl(undefined, 'select_account')} className="oauth-btn">
            <GoogleIcon />
            <span>Continue with Google</span>
        </a>
        <a href={api.getGithubAuthUrl()} className="oauth-btn">
            <GithubIcon />
            <span>Continue with GitHub</span>
        </a>
    </div>
);

export const Divider: React.FC<{ text?: string }> = ({ text = 'or continue with' }) => (
    <div className="divider" style={{ margin: 'var(--spacing-6) 0' }}>
        {text}
    </div>
);
