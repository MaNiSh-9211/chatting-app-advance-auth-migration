# Deep Dive: Recent Accounts & One-Click OAuth Flow

This document provides an exhaustive, step-by-step breakdown of how the "Recent Accounts" feature works, covering both the **Browser (Frontend)** and **Server (Backend)** responsibilities.

---

## 1. High-Level Architecture
The system uses a hybrid approach:
- **Persistence (Browser)**: `localStorage` is used to remember which accounts have successfully logged in. This survives browser restarts and logout.
- **Auto-Selection (Server/OAuth Provider)**: The backend uses the `login_hint` OpenID Connect parameter to tell Google exactly which account to authorize, skipping the user interface (account picker).

---

## 2. The Browser Side (Frontend)

### A. Data Persistence (`localStorage`)
When you log in, the frontend executes a utility function `saveRecentAccount`. 

**What is stored?**
The browser stores a JSON array in the entry `recent_accounts`. Each entry contains:
- `email`: The unique identifier.
- `displayName`: For the UI.
- `avatar`: URL to the profile picture.
- `provider`: (e.g., 'google', 'github', or 'local').
- `lastUsed`: A timestamp used for sorting (Latest on top).

**Lifecycle:**
1. **Login Success**: `AuthContext.tsx` detects a successful login and calls `saveRecentAccount`.
2. **Logout**: `api.logout()` clears the `accessToken` and `refreshToken` (Auth state), but **does NOT** clear `recent_accounts`. This is intentional so the user can see their previous accounts after logging out.
3. **Removal**: The user can manually click the "X" button on the UI, which calls `removeRecentAccount`, deleting that specific entry from `localStorage`.

### B. The "Resume" Logic in `LoginPage.tsx`
When the Login Page loads, it reads the `recent_accounts` array from `localStorage`.

**The Click Action (`handleRecentClick`):**
When you click a recent Google account:
1. It retrieves the stored `email`.
2. It calls `api.getGoogleAuthUrl(account.email)`.
3. It performs a full page redirect to the backend OAuth route.

---

## 3. The Backend Side (Server)

### A. Dynamic Route Handling (`auth.routes.ts`)
We modified the `/auth/google` route from a static Passport call to a dynamic handler.

```typescript
router.get('/google', (req, res, next) => {
    const { login_hint, prompt } = req.query;
    const options: any = { scope: ['profile', 'email'], session: false };

    if (login_hint) {
        // This is the magic!
        options.loginHint = login_hint as string;
    }

    // Logic: Skip prompt if we have a hint AND no explicit 'select_account' request
    if (prompt === 'select_account' || (!login_hint && !prompt)) {
        options.prompt = 'select_account';
    }
    // Result: If login_hint exists and prompt is omitted, prompt is undefined/none.
    
    passport.authenticate('google', options)(req, res, next);
});
```

### B. The Google Handshake
The server constructs a URL to Google's authorization server. 

**Parameters sent to Google:**
- `client_id`: Identifies our app.
- `redirect_uri`: Where Google sends the code back.
- `login_hint`: (Optional) The email address we got from the browser.
- `prompt`: (Optional) If we send `prompt: 'select_account'`, Google **must** show the list. If we **omit** it and send `login_hint`, Google checks if the browser has an active session for that specific email.

---

## 4. The Step-by-Step "One-Click" Flow

### Phase 1: Recognition
1. User logs out. The `accessToken` is gone. User is on `/login`.
2. Browser reads `localStorage`. It sees `user@gmail.com` in the "Recent" list.
3. User clicks the card for `user@gmail.com`.

### Phase 2: Hinting
4. Frontend redirects to: `http://localhost:5000/api/auth/google?login_hint=user@gmail.com`.
5. Backend receives the request. Because `login_hint` is present, it **omits** the `prompt: 'select_account'` parameter in the Passport options.
6. Backend redirects the user's browser to Google's OAuth URL.

### Phase 3: Silent Authorization
7. Google receives the request. It sees `login_hint=user@gmail.com`.
8. Google looks at the browser's cookies. It finds a Google session for `user@gmail.com`.
9. **The Optimization**: Since the app asked for a specific account and the user is already signed into it, and the user has previously approved the app, Google skips the "Choose an account" screen.
10. Google immediately redirects back to `http://localhost:5000/api/auth/google/callback` with an auth code.

### Phase 4: Session Restoration
11. Backend exchanges the code for a profile.
12. Backend finds the user in the database.
13. Backend generates **new** JWT tokens (`accessToken`, `refreshToken`).
14. Backend redirects back to the frontend: `http://localhost:5173/oauth-callback?accessToken=...`.
15. Frontend saves the new tokens. Use is now in the Dashboard.

---

## 5. Security Analysis

### Is it safe to skip the account picker?
**Yes.** This is a standard OpenID Connect feature. 
- **Ownership Verification**: Google only skips the screen if the user has an active, valid session (cookie) for that specific email. If the user is NOT logged into that account, Google will prompt for a password.
- **No Private Info Leak**: The `login_hint` is public (it's just an email). The actual authentication still happens on Google's secure servers.
- **Permission Scope**: This only works because the user has already granted permission to the app in the past. If it were a brand new app, Google would still show the consent screen.

### Why does "Continue with Google" still show the picker?
We explicitly pass `prompt=select_account` for the main button. This is crucial for **Account Switching**. Without this, if a user wanted to log into a *different* Google account, they would be stuck in a loop with their default account. 

---

## 6. Summary Table

| Action | Frontend Responsibility | Backend Responsibility | Google Responsibility |
| :--- | :--- | :--- | :--- |
| **Initial Login** | Save tokens + User info to `localStorage`. | Create user + Provide tokens. | Verify credentials. |
| **Logout** | Clear tokens. Keep `recent_accounts`. | Revoke Refresh Token in database/Redis. | N/A |
| **Recent Card Click** | Send `login_hint` in URL. | Pass `loginHint` to Passport; Omit `prompt`. | Match Cookie to Hint; Skip UI. |
| **OAuth Callback** | Catch tokens; Save to `localStorage`. | Verify logic; Link accounts; Issue JWTs. | Provide Auth Code. |

---

## 7. Configuration Details
- **Max Accounts**: 5 (Configured in `recentAccounts.ts`).
- **Storage Strategy**: Least Recently Used (LRU) - When a new account logs in, if there are already 5, the oldest one is dropped.
- **Provider Support**: Currently Google is optimized with `login_hint`. GitHub also supports similar parameters if needed, but Google is the most common use case for multi-account switching.
