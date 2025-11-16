# Apple Sign-In Troubleshooting Guide

## ❌ "state_mismatch" Error

This error occurs when Apple's OAuth callback cannot verify the state parameter. Here's how to fix it:

### 🔍 Root Causes (in order of likelihood)

1. **Domain Mismatch (www vs non-www)** - **MOST COMMON IN PRODUCTION** ⚠️
2. **Redirect URI Mismatch**
3. **Cookie Configuration Issues**
4. **HTTP vs HTTPS Mismatch**
5. **Browser Security Settings**
6. **Expired JWT Client Secret**
7. **Trailing Slashes in URLs**

---

## 🔥 PRODUCTION "state_mismatch" Quick Fix

If you're getting `state_mismatch` in **production** (not localhost), here's the most common fix:

### ⚡ Fix #1: Domain Consistency (www vs non-www)

**Problem**: You're accessing via `www.yourdomain.com` but your env vars are set for `yourdomain.com` (or vice versa).

**Solution**: Make ALL of these match:

1. **The URL you're accessing in your browser**
2. **Your production environment variables:**

   ```env
   BETTER_AUTH_URL=https://yourdomain.com  # Must match what you type in browser
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple
   ```

3. **Apple Developer Console configuration:**
   - Domain: `yourdomain.com` (no www, no https://)
   - Redirect URI: `https://yourdomain.com/api/auth/callback/apple`

**If you use www:**

```env
BETTER_AUTH_URL=https://www.yourdomain.com
APPLE_REDIRECT_URI=https://www.yourdomain.com/api/auth/callback/apple
```

And in Apple Console:

- Domain: `www.yourdomain.com`
- Redirect URI: `https://www.yourdomain.com/api/auth/callback/apple`

**Best Practice**: Set up a redirect so both www and non-www go to the same version, then configure everything for that version.

### ⚡ Fix #2: Remove Trailing Slashes

**Problem**: Trailing slashes in `BETTER_AUTH_URL` can cause issues.

**Solution**:

```env
# ✅ Good - no trailing slash
BETTER_AUTH_URL=https://yourdomain.com

# ❌ Bad - has trailing slash
BETTER_AUTH_URL=https://yourdomain.com/
```

### ⚡ Fix #3: Check Server Logs

After deploying the updated code, check your production server logs. You should see:

```text
🍎 Apple Sign-In Configuration: {
  clientId: 'com.thomasscheiber.finance.si',
  hasSecret: true,
  secretLength: 1234,
  redirectUri: 'https://yourdomain.com/api/auth/callback/apple',
  baseURL: 'https://yourdomain.com',
  isProduction: true,
  cookieDomain: 'yourdomain.com'
}
```

Verify:

- [ ] `hasSecret` is `true`
- [ ] `redirectUri` matches your browser URL and Apple Console
- [ ] `baseURL` matches your browser URL
- [ ] `cookieDomain` is set correctly (without www)

### ⚡ Fix #4: Deploy the Updated Code

The code has been updated to automatically handle cookie domain issues. Deploy it:

```bash
git add .
git commit -m "Fix Apple Sign-In state_mismatch error"
git push
```

Wait for deployment to complete, then:

1. **Clear all browser cookies** (or use incognito)
2. **Visit your site** using the exact URL in your env vars
3. **Try Apple Sign-In**

---

## 🚀 Quick Fix - Production Testing (Recommended)

Since Apple doesn't support `localhost`, the **easiest solution** is to test in production:

### Prerequisites

- A deployed domain (e.g., `yourdomain.com`)
- Access to your hosting platform's environment variables
- Apple Developer account

### Quick Steps

1. **Set Production Environment Variables**

   In your hosting platform (Vercel, Railway, Hostinger, etc.), set:

   ```env
   APPLE_CLIENT_ID=com.thomasscheiber.finance.si
   APPLE_CLIENT_SECRET=your-jwt-token
   APPLE_APP_BUNDLE_IDENTIFIER=com.thomasscheiber.finance
   APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple
   BETTER_AUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars
   ```

2. **Configure Apple Developer Console**

   Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers):
   - Select your Service ID
   - Click "Configure" next to "Sign in with Apple"
   - **Domain**: `yourdomain.com` (no protocol, no www)
   - **Redirect URI**: `https://yourdomain.com/api/auth/callback/apple`
   - Click "Save"

3. **Update Cookie Settings for Production**

   In `lib/auth.ts`, ensure secure cookies are enabled:

   ```typescript
   advanced: {
     useSecureCookies: true,  // Must be true for HTTPS
     defaultCookieAttributes: {
       sameSite: "lax",
       path: "/",
       httpOnly: true,
       secure: true,  // Must be true for HTTPS
     },
   },
   ```

4. **Deploy and Test**
   - Deploy your changes
   - Visit `https://yourdomain.com`
   - Try Apple Sign-In
   - Check browser console and server logs for errors

---

## ✅ Detailed Step-by-Step Fix

### 1. Verify Apple Developer Console Configuration

Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers) and check:

**For Local Development:**

- **Service ID (Identifier)**: `com.thomasscheiber.finance.si` (or your actual Service ID)
- **Redirect URI**: Use one of these approaches:
  - **Option A**: Use your production domain (e.g., `https://yourdomain.com/api/auth/callback/apple`)
  - **Option B**: Use ngrok/tunneling (e.g., `https://abc123.ngrok.io/api/auth/callback/apple`)
  - **Option C**: Use a staging domain (e.g., `https://dev.yourdomain.com/api/auth/callback/apple`)
- **Domain**: A valid domain you own (e.g., `yourdomain.com`)

⚠️ **IMPORTANT**: Apple does NOT accept `localhost` as a domain. See options below.

**For Production:**

- **Redirect URI**: `https://yourdomain.com/api/auth/callback/apple`
- **Domain**: `yourdomain.com` (without https://)

⚠️ **IMPORTANT**: Apple does NOT accept `localhost` domains. For local development, see the workarounds below.

---

## 🚨 Apple Sign-In Local Development Workarounds

Since Apple **does NOT accept `localhost`** domains, you have three options:

### **Option A: Test in Production (Recommended - Simplest)**

Test Apple Sign-In directly on your deployed production environment. This is the **easiest and most reliable** approach:

```env
# Production environment variables
APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

✅ **Pros**: No extra setup, real domain, no tunneling needed  
❌ **Cons**: Requires deployment to test changes

💡 **Tip**: Use Google Sign-In for local development testing, and only test Apple Sign-In in production.

---

### **Option B: Use ngrok (For Local Development)**

Use a tunneling service to get a temporary HTTPS domain:

1. **Install ngrok**:

   ```bash
   # Windows (with Chocolatey)
   choco install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your Next.js app**:

   ```bash
   bun run dev
   ```

3. **In another terminal, start ngrok**:

   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update Apple Developer Console**:
   - Domain: `abc123.ngrok.io`
   - Redirect URI: `https://abc123.ngrok.io/api/auth/callback/apple`

6. **Update your `.env.local`**:

   ```env
   APPLE_REDIRECT_URI=https://abc123.ngrok.io/api/auth/callback/apple
   BETTER_AUTH_URL=https://abc123.ngrok.io
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

7. **Restart your Next.js app** and access via `https://abc123.ngrok.io`

✅ **Pros**: Can develop locally with real Apple Sign-In  
❌ **Cons**: URL changes each time (free tier), need to update Apple Console

💡 **Tip**: Use ngrok's paid plan for a persistent domain, or use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) (free alternative).

---

### **Option C: Use a Custom Test Domain**

Set up a subdomain pointing to localhost:

1. **Create a subdomain** like `dev.yourdomain.com`

2. **Point it to your local IP** or use a reverse proxy

3. **Set up SSL certificate** (Let's Encrypt)

4. **Configure Apple Developer Console**:
   - Domain: `dev.yourdomain.com`
   - Redirect URI: `https://dev.yourdomain.com/api/auth/callback/apple`

5. **Update `.env.local`**:

   ```env
   APPLE_REDIRECT_URI=https://dev.yourdomain.com/api/auth/callback/apple
   BETTER_AUTH_URL=https://dev.yourdomain.com
   NEXT_PUBLIC_APP_URL=https://dev.yourdomain.com
   ```

✅ **Pros**: Persistent domain, professional setup  
❌ **Cons**: Requires DNS/SSL setup, more complex

---

### 2. Update Your `.env.local` File

**For ngrok (Recommended):**

```env
# Apple OAuth Configuration
APPLE_CLIENT_ID=com.thomasscheiber.finance.si
APPLE_CLIENT_SECRET=your-jwt-token-from-generate-script
APPLE_APP_BUNDLE_IDENTIFIER=com.thomasscheiber.finance
APPLE_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/auth/callback/apple

# Better Auth Configuration
BETTER_AUTH_URL=https://your-ngrok-url.ngrok.io
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars
```

**For Production:**

```env
# Apple OAuth Configuration
APPLE_CLIENT_ID=com.thomasscheiber.finance.si
APPLE_CLIENT_SECRET=your-jwt-token-from-generate-script
APPLE_APP_BUNDLE_IDENTIFIER=com.thomasscheiber.finance
APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple

# Better Auth Configuration
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars
```

### 3. Regenerate Apple Client Secret (if needed)

The JWT token expires after 6 months. Regenerate it:

```bash
node scripts/generate-apple-secret.js
```

Copy the generated `APPLE_CLIENT_SECRET` to your `.env.local`.

### 4. Configure Apple Developer Console with Your Domain

Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers):

1. Select your Service ID
2. Click "Configure" next to "Sign in with Apple"
3. Add your domain and redirect URI:
   - **Domain**: `your-ngrok-url.ngrok.io` (or `yourdomain.com` for production)
   - **Redirect URI**: `https://your-ngrok-url.ngrok.io/api/auth/callback/apple`
4. Click "Save"

### 5. Clear Browser Data

Apple Sign-In is sensitive to cookies. Clear:

- Cookies for your domain
- Cookies for `appleid.apple.com`
- Browser cache

Or use **Incognito/Private mode** for testing.

### 6. Restart Your Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
bun run dev
```

### 7. Access via Your Configured Domain

- **If using ngrok**: Access via `https://your-ngrok-url.ngrok.io`
- **If using production**: Access via `https://yourdomain.com`
- ❌ **DO NOT** access via `localhost:3000` when testing Apple Sign-In

---

## 🔧 Advanced Debugging

### Check Cookie Settings

The current configuration (`lib/auth.ts`) uses:

- `sameSite: "lax"` - Works for most OAuth flows
- `secure: false` - Required for HTTP (localhost)
- `httpOnly: true` - Security best practice

### Test with Different Browsers

Sometimes Safari/Chrome handle Apple Sign-In cookies differently:

- ✅ Try Safari (best Apple integration)
- ✅ Try Chrome Incognito
- ✅ Try Firefox Private Window

### Enable Debug Logging

Add this to your `.env.local`:

```env
DEBUG=better-auth:*
```

Then check your terminal for detailed auth flow logs.

### Verify Environment Variables are Loaded

Add a temporary console log to `lib/auth.ts`:

```typescript
console.log("Apple Config:", {
  clientId: process.env.APPLE_CLIENT_ID,
  hasSecret: !!process.env.APPLE_CLIENT_SECRET,
  redirectUri: process.env.APPLE_REDIRECT_URI,
  baseURL: process.env.BETTER_AUTH_URL,
});
```

---

## 🌐 Production Deployment

When deploying to production:

1. Update Apple Developer Console:
   - Add production redirect URI: `https://yourdomain.com/api/auth/callback/apple`
   - Add production domain: `yourdomain.com`

2. Update environment variables:

   ```env
   APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple
   BETTER_AUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. Enable secure cookies in `lib/auth.ts`:

   ```typescript
   advanced: {
     useSecureCookies: true,  // Change to true for HTTPS
     defaultCookieAttributes: {
       sameSite: "lax",
       path: "/",
       httpOnly: true,
       secure: true,  // Change to true for HTTPS
     },
   },
   ```

---

## ✅ Checklist

Before testing Apple Sign-In, verify:

- [ ] Apple Service ID is correct in `.env.local`
- [ ] Apple Client Secret (JWT) is valid and not expired
- [ ] Redirect URI in Apple Developer Console matches exactly
- [ ] Domain is registered in Apple Developer Console
- [ ] `BETTER_AUTH_URL` matches your current environment
- [ ] `APPLE_REDIRECT_URI` is set in `.env.local`
- [ ] Development server has been restarted
- [ ] Browser cookies have been cleared or using Incognito
- [ ] Apple Developer Portal shows the Service ID is "Active"

---

## 🆘 Still Having Issues?

### Check Better Auth Documentation

- [Better Auth Apple Provider](https://better-auth.com/docs/guides/social-providers/apple)
- [Better Auth Error Handling](https://better-auth.com/docs/concepts/error-handling)

### Common Mistakes

1. **Using wrong Client ID**: Should be the **Service ID**, not App ID or Team ID
2. **Expired JWT**: Regenerate every 6 months
3. **Wrong redirect protocol**: `http://` for local, `https://` for production
4. **Port mismatch**: Make sure it's `:3000` if that's your dev server port
5. **Multiple redirect URIs**: You need separate configs for development and production in Apple Console

### Test Google Sign-In First

If Google Sign-In works but Apple doesn't, it confirms the issue is Apple-specific configuration.

```bash
# Test with Google first to verify Better Auth is working
# Then tackle Apple-specific issues
```

---

## 📝 Quick Reference

**Better Auth Callback Endpoints:**

- Google: `{baseURL}/api/auth/callback/google`
- Apple: `{baseURL}/api/auth/callback/apple`

**Where `{baseURL}` is:**

- Local: `http://localhost:3000`
- Production: `https://yourdomain.com`
