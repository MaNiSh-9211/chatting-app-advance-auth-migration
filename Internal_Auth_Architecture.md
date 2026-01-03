# Internal Authentication Architecture & Logic

This document provides a deep dive into how authentication works in the **AuthAdvance** project, covering both local login and Google OAuth, as well as the email verification process.

---

## 1. Traditional Email & Password Authentication
**Files involved:** 
- [`auth.controller.ts:login`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/server/src/controllers/auth.controller.ts)
- [`User.ts`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/server/src/models/User.ts) (Schema & Password Hashing)

### The Process:
1.  **Submission:** The user sends their email and password via a POST request to `/api/auth/login`.
2.  **Lookup:** The server searches for the user in MongoDB using the provided email.
3.  **Password Verification:** 
    -   The system retrieves the **hashed** password from the database.
    -   It uses `bcrypt.compare()` (in `User.ts`) to check if the entered password matches the stored hash.
    -   *Why hash?* We never store plain passwords. Even if the DB is leaked, the passwords remain encrypted.
4.  **Security Checks:** 
    -   **isEmailVerified:** If the user hasn't kliked the verification link, login is blocked with an `EMAIL_NOT_VERIFIED` error.
    -   **Provider Check:** If the account was created with Google (`provider !== 'local'`), login is blocked with `PROVIDER_MISMATCH` (our recent change).
5.  **Session Creation:** If all checks pass, the server generates a **JWT Access Token** and a **Refresh Token** via `token.service.ts` and returns them to the frontend.

---

## 2. "Continue with Google" (OAuth 2.0)
**Files involved:**
- [`passport.ts`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/server/src/config/passport.ts) (OAuth Strategy)
- [`auth.routes.ts`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/server/src/routes/auth.routes.ts) (Redirects)

### Step-by-Step Flow:
1.  **Initiation:** The user clicks "Continue with Google". This hits `/api/auth/google`.
2.  **The Redirect:** The server responds with a redirect to **Google's Authorization Server**.
3.  **User Approval:** The user logs into Google and clicks "Allow".
4.  **The Code:** Google redirects the user back to our server at `/api/auth/google/callback` with a temporary **Authorization Code**.
5.  **Exchange:** Our server (handled by `passport-google-oauth20`) sends that code back to Google over a secure channel in exchange for the user's **Profile** (Name, Email, Profile Picture).
6.  **Account Linking (The Magic):** 
    -   Inside `passport.ts` (Lines 27-49), we check: *Does this email exist in our DB?*
    -   **If YES:** We "link" the account. We set `user.provider = 'google'`, store the `googleId`, and mark it as **verified** (since Google already verified their email).
    -   **If NO:** We create a brand new user record with `provider: 'google'`.
7.  **Finalize:** The user is redirected to the frontend dashboard with their new authentication tokens.

### *Why can I login with Google if I used a password before?*
In `passport.ts`, we prioritize security through trust. If Google says "I have verified this person is user@example.com", our server trusts Google. We then update the account to use Google as the primary provider. 

---

## 3. Email Verification Flow
**Files involved:**
- [`email.service.ts`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/server/src/services/email.service.ts) (Sending)
- [`auth.controller.ts:verifyEmail`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/server/src/controllers/auth.controller.ts) (Server processing)
- [`VerifyEmailPage.tsx`](file:///c:/Users/at381/OneDrive/Desktop/auth-advance/client/src/pages/VerifyEmailPage.tsx) (Frontend handler)

### How it works:
1.  **Token Generation:** During registration, we generate a random string (a "token") using `crypto.randomBytes(32)`.
2.  **Hashing:** We store a **SHA-256 hash** of this token in the `User` model (`emailVerificationToken`) and set an expiry of 24 hours.
3.  **Sending:** We send an email with a link: `http://localhost:5173/verify-email?token=RAW_TOKEN`.
4.  **Frontend Capture:** When the user clicks the link, the browser opens our React app. The `VerifyEmailPage.tsx` component sees the `token` in the URL.
5.  **API Call:** The frontend sends that `RAW_TOKEN` to our server at `/api/auth/verify-email`.
6.  **Server Matching:** 
    -   The server hashes the token provided by the user.
    -   It looks in the database for a user where `emailVerificationToken === HASHED_TOKEN`.
    -   If found and not expired, it sets `isEmailVerified: true` and deletes the token.

### *How does the server know it was clicked?*
The server doesn't know the "click" happened in the mail app. It only knows that a valid, secret token (that only the email recipient could see) was just presented to the API. This proves the user has access to that inbox.
