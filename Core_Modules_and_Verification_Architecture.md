# Internal Technical Breakdown: OAuth, Mailing & Verification

This document provides an exhaustive explanation of the core modules used for authentication and mailing, including the internal code logic and the complete lifecycle of email verification.

---

## 1. OAuth & Identity: The `passport` ecosystem

We use **Passport.js** as our authentication middleware. It is the industry standard for Node.js because of its modular "Strategy" approach.

### Key Packages
- **`passport`**: The core middleware that handles session management and authentication flow.
- **`passport-google-oauth20`**: A specific strategy for Google’s OAuth 2.0 API.
- **`passport-github2`**: A specific strategy for GitHub’s OAuth 2.0 API.

### Why these packages?
OAuth is extremely complex to implement manually (handling state, exchange codes, token refreshes, profile normalization). Passport abstracts this away, allowing us to focus on what happens *after* a user is identified.

### Code Deep Dive: `passport.ts`
We use the `Strategy` constructor from these packages. 

**Main Functions Used:**
1. **`passport.use()`**: Registers a strategy.
   - We pass a configuration object (`clientID`, `clientSecret`, `callbackURL`).
   - We provide a **Verify Callback** function: `async (accessToken, refreshToken, profile, done) => { ... }`.
2. **`profile` Object**: Normalize data from different providers. We extract `profile.emails[0].value` and `profile.photos[0].value`.
3. **`done(err, user)`**: Called when our internal logic (finding or creating the user in MongoDB) is complete.

---

## 2. Mailing: The `nodemailer` system

For sending emails (verification, password resets, migration alerts), we use **Nodemailer**.

### Key Package
- **`nodemailer`**: The most popular and reliable SMTP client for Node.js.

### Implementation: `email.service.ts`
We wrap the package in a service to keep the rest of the app clean.

**Main Functions Used:**
1. **`nodemailer.createTransport()`**: Configures the connection to the SMTP server (e.g., Hostinger, Gmail).
   - We use `host`, `port`, and `auth` (user/pass) from our `.env`.
2. **`transporter.sendMail()`**: The core function that executes the delivery.
   - It takes an object containing `from`, `to`, `subject`, and `html`.

**Why Nodemailer?**
It supports high-security features like TLS/SSL, handles attachments, and allows for complex HTML templates which we use to make our emails look premium.

---

## 3. Deep Dive: Email Verification Lifecycle

This is exactly what happens from the moment a user clicks "Register" to the moment they are verified.

### Step 1: Token Generation (Server)
When a user registers at `/api/auth/register`:
1. **Uniqueness**: We use `crypto.randomBytes(32).toString('hex')` to create a 64-character random string.
2. **Security**: We never store the plain token. We hash it using SHA-256 before saving to the database:
   ```typescript
   const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
   ```
3. **Storage**: The `hashedToken` and an `expiry` (24 hours) are saved to the user's document in MongoDB.

### Step 2: Delivery (Server -> Mail Server -> User)
1. The `sendVerificationEmail` function is called.
2. It constructs a URL: `http://localhost:5173/verify-email?token={PLAIN_TOKEN}`.
3. Note: We send the **plain token** in the email so the user can click it.

### Step 3: The Click (User Interaction)
1. User clicks the button in their inbox.
2. The browser opens the Frontend: `VerifyEmailPage.tsx`.
3. The Frontend extracts the `token` from the URL.

### Step 4: Verification Request (Browser -> Server)
1. The Frontend sends a POST request to `/api/auth/verify-email` with the plain token in the body.
2. **Server Logic**:
   - The server receives the plain token.
   - It re-hashes it using the same SHA-256 algorithm.
   - It searches MongoDB for a user who has this `hashedToken` AND whose `expiry` is greater than `now()`.
   ```typescript
   const user = await User.findOne({ 
       emailVerificationToken: hashedToken, 
       emailVerificationExpires: { $gt: new Date() } 
   });
   ```

### Step 5: Finalization (Server)
1. If no user is found, it returns an error.
2. If found:
   - Sets `isEmailVerified = true`.
   - Clears `emailVerificationToken` and `emailVerificationExpires` (so it can't be used again).
   - Generates a **new JWT token pair** (Access + Refresh) so the user is logged in automatically.
3. Database is saved.

### Step 6: Confirmation (Browser)
1. The server returns the success response with the user data and JWTs.
2. The Frontend shows a success message ("Email verified!").
3. The user is redirected to the Dashboard.

---

## 4. Real-time Status Polling (The "Magic" UX)

We added a feature where the page "detects" verification even if the user verifies in another tab.

1. **Frontend**: If the user is on the verification page without a token (just after registration), it starts a 3-second `setInterval`.
2. **API**: It calls `/api/auth/verification-status?email=user@email.com`.
3. **Server**: Simply checks `user.isEmailVerified` in the DB and returns `true/false`.
4. **Instant Redirect**: As soon as the user clicks the link in their email (in another tab), the backend updates the DB. On the next 3-second poll, the original tab sees `verified: true` and redirects the user to the dashboard automatically.
