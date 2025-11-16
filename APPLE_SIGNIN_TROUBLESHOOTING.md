# Apple Sign-In Troubleshooting Guide

## ❌ "state_mismatch" Error

This error occurs when Apple's OAuth callback cannot verify the state parameter. Here's how to fix it:

### 🔍 Root Causes

1. **Redirect URI Mismatch** (Most Common)
2. **Cookie Configuration Issues**
3. **HTTP vs HTTPS Mismatch**
4. **Browser Security Settings**
5. **Expired JWT Client Secret**

---

## ✅ Step-by-Step Fix

### 1. Verify Apple Developer Console Configuration

Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers) and check:

**For Local Development:**
- **Service ID (Identifier)**: `com.thomasscheiber.finance.si` (or your actual Service ID)
- **Redirect URI**: `http://localhost:3000/api/auth/callback/apple`
- **Domain**: `localhost:3000` (without http://)

**For Production:**
- **Redirect URI**: `https://yourdomain.com/api/auth/callback/apple`
- **Domain**: `yourdomain.com` (without https://)

⚠️ **IMPORTANT**: The redirect URI in Apple Developer Console MUST exactly match your environment:
- Local: `http://localhost:3000/api/auth/callback/apple`
- Production: `https://yourdomain.com/api/auth/callback/apple`

### 2. Update Your `.env.local` File

Add or update these variables:

```env
# Apple OAuth Configuration
APPLE_CLIENT_ID=com.thomasscheiber.finance.si
APPLE_CLIENT_SECRET=your-jwt-token-from-generate-script
APPLE_APP_BUNDLE_IDENTIFIER=com.thomasscheiber.finance
APPLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/apple

# Better Auth Configuration
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars

# Optional: For debugging
NODE_ENV=development
```

### 3. Regenerate Apple Client Secret (if needed)

The JWT token expires after 6 months. Regenerate it:

```bash
node scripts/generate-apple-secret.js
```

Copy the generated `APPLE_CLIENT_SECRET` to your `.env.local`.

### 4. Clear Browser Data

Apple Sign-In is sensitive to cookies. Clear:
- Cookies for `localhost:3000`
- Cookies for `appleid.apple.com`
- Browser cache

Or use **Incognito/Private mode** for testing.

### 5. Restart Your Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
bun run dev
```

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

