# 🔥 Apple Sign-In "state_mismatch" Production Fix

## Current Issue

You're getting a `state_mismatch` error when trying to sign in with Apple in production.

---

## ✅ Step-by-Step Checklist

### Step 1: Verify URL Consistency

**Check what URL you're accessing in your browser:**

Are you typing:
- [ ] `https://yourdomain.com` (no www)
- [ ] `https://www.yourdomain.com` (with www)

**⚠️ CRITICAL**: All configurations below must match this exact URL.

---

### Step 2: Check Production Environment Variables

Log into your hosting platform and verify these environment variables:

```env
# All three MUST match the URL you're accessing in the browser
BETTER_AUTH_URL=https://yourdomain.com       # ⚠️ NO trailing slash!
NEXT_PUBLIC_APP_URL=https://yourdomain.com
APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple

# Verify these are set
APPLE_CLIENT_ID=com.thomasscheiber.finance.si
APPLE_CLIENT_SECRET=eyJhbGciOi...  # Should start with "eyJ"
BETTER_AUTH_SECRET=your-random-secret-32-chars-min
```

**Common Mistakes:**
- ❌ `BETTER_AUTH_URL=https://yourdomain.com/` (trailing slash)
- ❌ `BETTER_AUTH_URL=http://yourdomain.com` (http instead of https)
- ❌ Mismatch: accessing `www.yourdomain.com` but env var is `yourdomain.com`

---

### Step 3: Verify Apple Developer Console

Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers):

1. Select your **Service ID**: `com.thomasscheiber.finance.si`
2. Click "Configure" next to "Sign in with Apple"
3. **Verify the configuration:**

**Domain:** (no protocol, no port, no path)
```
yourdomain.com
```
OR if using www:
```
www.yourdomain.com
```

**Return URLs:** (must match EXACTLY)
```
https://yourdomain.com/api/auth/callback/apple
```

**⚠️ Common Mistakes:**
- ❌ `https://yourdomain.com` in Domain field (should not have protocol)
- ❌ `www.yourdomain.com` in Domain but accessing `yourdomain.com` 
- ❌ `http://` instead of `https://` in Return URL
- ❌ Trailing slash: `https://yourdomain.com/api/auth/callback/apple/`

---

### Step 4: Deploy the Updated Code

I've updated your `lib/auth.ts` to automatically handle cookie domain issues.

Deploy the changes:

```bash
git add .
git commit -m "Fix Apple Sign-In state_mismatch - cookie domain fix"
git push
```

---

### Step 5: Check Server Logs After Deployment

After deploying, check your production logs (Vercel, Railway, etc.). You should see:

```
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

**Verify:**
- [ ] `hasSecret` is `true`
- [ ] `secretLength` is > 500 (valid JWT)
- [ ] `redirectUri` matches your browser URL
- [ ] `baseURL` matches your browser URL
- [ ] `cookieDomain` is set (without www)

---

### Step 6: Test Apple Sign-In

1. **Clear all browser cookies** or use **Incognito mode**
2. **Go to your production site** using the EXACT URL in your env vars:
   - If env var is `https://yourdomain.com`, visit `https://yourdomain.com`
   - If env var is `https://www.yourdomain.com`, visit `https://www.yourdomain.com`
3. **Click "Sign in with Apple"**
4. **Sign in with your Apple ID**
5. **Should redirect back successfully** ✅

---

## 🔧 Still Not Working?

### Additional Checks

#### A. JWT Token Expiry

Apple JWT tokens expire after 6 months. Regenerate:

```bash
node scripts/generate-apple-secret.js
```

Update the `APPLE_CLIENT_SECRET` in your production env vars.

#### B. Multiple Redirect URIs in Apple Console

If you have multiple redirect URIs configured in Apple Console:
- Make sure the production one is listed
- Try removing all others temporarily to test

#### C. Browser Console Errors

Open browser DevTools (F12) → Console tab. Look for:
- Cookie errors
- CORS errors
- Mixed content warnings

#### D. Test with Safari

Safari has the best Apple Sign-In integration:
- Try Safari (Private Window)
- Then try Chrome (Incognito)

#### E. Check Hosting Platform

Some hosting platforms have issues with cookies:
- **Vercel**: Should work fine
- **Railway**: Should work fine
- **Cloudflare Pages**: Check "Preserve query string" setting
- **Custom CDN**: May need to configure cookie forwarding

---

## 🎯 Most Likely Solution

**95% of the time**, it's one of these:

1. **www mismatch**: Accessing `www.yourdomain.com` but env vars are `yourdomain.com` (or vice versa)
2. **Trailing slash**: `BETTER_AUTH_URL=https://yourdomain.com/` (remove the `/`)
3. **Apple Console mismatch**: Redirect URI doesn't match exactly

**Fix**: Make sure these 3 match EXACTLY:
- URL in your browser
- `BETTER_AUTH_URL` and `APPLE_REDIRECT_URI` in env vars
- Redirect URI in Apple Developer Console

---

## 📝 What I Changed

I updated `lib/auth.ts` to:

1. **Automatically set cookie domain** to handle www/non-www issues
2. **Add debug logging** so you can see the configuration in server logs
3. **Ensure secure cookies** are properly configured in production

The cookie domain is now set to your base domain (without www), which allows cookies to work whether you access via `yourdomain.com` or `www.yourdomain.com`.

---

## 🆘 Last Resort

If nothing works, try this nuclear option:

1. **Remove the Service ID** from Apple Developer Console
2. **Create a NEW Service ID** with a different identifier
3. **Configure it** with your production domain and redirect URI
4. **Update `APPLE_CLIENT_ID`** in your env vars
5. **Regenerate the JWT token** with the new Service ID
6. **Deploy and test**

Sometimes Apple's cache gets stuck, and creating a new Service ID fixes it.

---

## ✅ Expected Result

After fixing, you should see:

1. Click "Sign in with Apple" button
2. Redirect to Apple ID login page
3. Sign in with your Apple ID
4. Apple asks permission to share email
5. **Redirect back to your app** (not the error page)
6. You're signed in successfully! ✅

---

## 💡 Pro Tip: Set Up URL Redirect

To avoid www/non-www confusion:

**Option A: Redirect www to non-www**
- Set up your hosting to redirect `www.yourdomain.com` → `yourdomain.com`
- Configure everything for `yourdomain.com`

**Option B: Redirect non-www to www**
- Set up your hosting to redirect `yourdomain.com` → `www.yourdomain.com`
- Configure everything for `www.yourdomain.com`

This ensures users always land on the same domain regardless of what they type.

---

## 📊 Quick Reference

| Config Location | Example Value |
|----------------|---------------|
| Browser URL | `https://yourdomain.com` |
| `BETTER_AUTH_URL` | `https://yourdomain.com` |
| `APPLE_REDIRECT_URI` | `https://yourdomain.com/api/auth/callback/apple` |
| Apple Console Domain | `yourdomain.com` |
| Apple Console Return URL | `https://yourdomain.com/api/auth/callback/apple` |

**All must match EXACTLY** (including www or non-www).

