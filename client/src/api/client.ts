const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse {
    success: boolean;
    message?: string;
    errors?: Array<{ field: string; message: string }>;
    [key: string]: unknown;
}

interface AuthResponse extends ApiResponse {
    user?: {
        id: string;
        _id: string; // Add MongoDB ID
        email: string;
        displayName: string;
        customDisplayName?: string;
        avatar?: string;
        customAvatar?: string;
        bio?: string;
        status?: string;
        displayId?: string;
        isEmailVerified: boolean;
        provider?: string;
        createdAt?: string;
    };
    accessToken?: string;
    refreshToken?: string;
}

interface EmailCheckResponse extends ApiResponse {
    available: boolean;
}

class ApiClient {
    private accessToken: string | null = null;

    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
    }

    setTokens(accessToken: string, refreshToken: string): void {
        this.accessToken = accessToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    }

    clearTokens(): void {
        this.accessToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    public async request<T = any>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            ...(options.headers || {}),
        };

        // Don't set Content-Type for FormData, let browser set it with boundary
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (this.accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            // Throw the entire response data so components can check for codes like PROVIDER_MISMATCH
            throw data;
        }

        return data;
    }

    // Auth endpoints
    async checkEmail(email: string): Promise<EmailCheckResponse> {
        return this.request<EmailCheckResponse>('/auth/check-email', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async register(email: string, password: string, displayName: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, displayName }),
        });
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (response.accessToken && response.refreshToken) {
            this.setTokens(response.accessToken, response.refreshToken);
        }

        return response;
    }

    async verifyEmail(token: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    }

    async resendVerification(email: string): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async getVerificationStatus(email: string): Promise<{ verified: boolean }> {
        return this.request<{ verified: boolean }>(`/auth/verification-status?email=${encodeURIComponent(email)}`);
    }

    async forgotPassword(email: string): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async resetPassword(token: string, password: string): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password }),
        });
    }

    async refreshToken(): Promise<AuthResponse> {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token');
        }

        const response = await this.request<AuthResponse>('/auth/refresh-token', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });

        if (response.accessToken && response.refreshToken) {
            this.setTokens(response.accessToken, response.refreshToken);
        }

        return response;
    }

    async logout(): Promise<void> {
        const refreshToken = localStorage.getItem('refreshToken');
        try {
            await this.request<ApiResponse>('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
            });
        } catch {
            // Ignore logout errors
        }
        this.clearTokens();
    }

    async getMe(): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/me');
    }

    // Migration Endpoints
    async initiateMigration(password: string, newEmail: string, confirmOverride: boolean = false): Promise<ApiResponse & { code?: string; requiresConfirmation?: boolean; warning?: string; existingAccountInfo?: any }> {
        return this.request<ApiResponse & { code?: string; requiresConfirmation?: boolean; warning?: string; existingAccountInfo?: any }>('/auth/migrate/init', {
            method: 'POST',
            body: JSON.stringify({ password, newEmail, confirmOverride: confirmOverride ? 'true' : undefined }),
        });
    }

    async verifyCurrentEmail(token: string): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/migrate/verify-current', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    }

    async verifyNewEmail(token: string): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/migrate/verify-new', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    }

    async getMigrationStatus(): Promise<{
        success: boolean;
        hasPendingMigration: boolean;
        currentEmail: string;
        newEmail: string | null;
        currentEmailVerified: boolean;
        newEmailVerified: boolean;
        migrationExpiry: string | null;
        cooldownRemaining: number;
    }> {
        return this.request('/auth/migrate/status');
    }

    async resendMigrationEmails(): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/migrate/resend', {
            method: 'POST',
        });
    }

    async getMigrationHistory(): Promise<{
        success: boolean;
        history: Array<{
            fromEmail: string;
            toEmail: string;
            status: 'success' | 'failed' | 'pending' | 'reverted';
            initiatedAt: string;
            completedAt?: string;
            revertedAt?: string;
        }>;
    }> {
        return this.request('/auth/migrate/history');
    }

    async updateBio(bio: string): Promise<ApiResponse> {
        return this.request<ApiResponse>('/auth/profile/bio', {
            method: 'PUT',
            body: JSON.stringify({ bio }),
        });
    }

    // User Search
    async searchUserById(userId: string): Promise<ApiResponse & { user: any }> {
        return this.request<ApiResponse & { user: any }>(`/users/id/${userId}`);
    }

    async searchUsers(query: string): Promise<ApiResponse & { users: any[] }> {
        return this.request<ApiResponse & { users: any[] }>(`/users/search?query=${encodeURIComponent(query)}`);
    }

    // OAuth URLs
    getGoogleAuthUrl(email?: string, prompt?: string): string {
        const params = new URLSearchParams();
        if (email) params.append('login_hint', email);
        if (prompt) params.append('prompt', prompt);

        const queryString = params.toString();
        return `${API_BASE_URL}/auth/google${queryString ? `?${queryString}` : ''}`;
    }

    getGithubAuthUrl(): string {
        return `${API_BASE_URL}/auth/github`;
    }
}

export const api = new ApiClient();
export type { AuthResponse, EmailCheckResponse, ApiResponse };
