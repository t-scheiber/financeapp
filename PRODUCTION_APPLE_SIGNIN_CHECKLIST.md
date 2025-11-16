# ✅ Apple Sign-In Production Checklist

Use this checklist to configure Apple Sign-In for your production environment.

---

## 📋 Before You Start

- [ ] You have a deployed domain (e.g., `yourdomain.com`)
- [ ] Your site is running on HTTPS
- [ ] You have access to [Apple Developer Portal](https://developer.apple.com/account)
- [ ] You have your `.p8` key file for generating the JWT secret

---

## Step 1: Generate Apple Client Secret

Run the script to generate your JWT token:

```bash
node scripts/generate-apple-secret.js
```

**Copy the output** - you'll need this for your environment variables.

⏰ **Remember**: This token expires in 6 months. Set a reminder to regenerate it.

---

## Step 2: Configure Apple Developer Console

Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers)

### A. Find/Create Your Service ID

1. Click on "Identifiers" in the left sidebar
2. Click the "+" button (or select existing Service ID)
3. Select "Services IDs" and click "Continue"
4. **Identifier**: `com.thomasscheiber.finance.si` (or your chosen identifier)
5. **Description**: "Finance App Web Sign In"
6. Click "Continue" and "Register"

### B. Configure Sign In with Apple

1. Select your Service ID from the list
2. Check the box for "Sign in with Apple"
3. Click "Configure"
4. **Primary App ID**: Select your App ID (e.g., `com.thomasscheiber.finance`)
5. Click "+"  next to "Website URLs"
6. Add your production domain:

   **Domain and Subdomain:**

   ```text
   yourdomain.com
   ```

   ⚠️ **No protocol** (`https://`), **no port**, **no path**

   **Return URLs:**

   ```text
   https://yourdomain.com/api/auth/callback/apple
   ```

   ⚠️ **Must include** `https://`, **must be exact** path

7. Click "Next", "Done", "Continue", and "Save"

### C. Verify Configuration

- [ ] Domain is added without protocol (e.g., `yourdomain.com`)
- [ ] Return URL is exact: `https://yourdomain.com/api/auth/callback/apple`
- [ ] Service ID shows "Active" status
- [ ] "Sign in with Apple" is enabled and configured

---

## Step 3: Set Production Environment Variables

In your hosting platform (Vercel, Railway, Hostinger, Netlify, etc.):

```env
# Apple OAuth
APPLE_CLIENT_ID=com.thomasscheiber.finance.si
APPLE_CLIENT_SECRET=eyJhbGci... (the JWT from Step 1)
APPLE_APP_BUNDLE_IDENTIFIER=com.thomasscheiber.finance
APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple

# Better Auth URLs
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Auth Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-random-secret-at-least-32-characters

# Optional: Email Allowlist (recommended for production)
ALLOWED_EMAILS=your-email@example.com,another@example.com

# Database
DATABASE_URL=mysql://user:password@host:port/database

# Other API keys as needed
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

### Verification Checklist

- [ ] `APPLE_CLIENT_ID` matches your Service ID
- [ ] `APPLE_CLIENT_SECRET` is the JWT token (not the `.p8` file content)
- [ ] `APPLE_REDIRECT_URI` matches exactly what's in Apple Developer Console
- [ ] `BETTER_AUTH_URL` is your production HTTPS URL (no trailing slash)
- [ ] `NEXT_PUBLIC_APP_URL` is your production HTTPS URL (no trailing slash)
- [ ] All URLs use `https://` (not `http://`)

---

## Step 4: Deploy Your Code

The code is already configured to automatically detect production:

```typescript
// lib/auth.ts automatically enables secure cookies in production
const isProduction = process.env.NODE_ENV === "production" || 
                     process.env.BETTER_AUTH_URL?.startsWith("https://")
```

**Deploy your latest code:**

```bash
git add .
git commit -m "Configure Apple Sign-In for production"
git push origin main
```

Your hosting platform should automatically deploy.

---

## Step 5: Test Apple Sign-In

1. **Visit your production site**: `https://yourdomain.com`

2. **Clear browser cookies** (or use Incognito mode)

3. **Click "Sign in"**

4. **Click "Sign in with Apple"**

5. **Expected flow:**
   - Redirects to Apple ID login
   - You sign in with your Apple ID
   - Apple asks permission to share email
   - Redirects back to your app
   - You're signed in! ✅

---

## 🐛 Troubleshooting

### Still Getting "state_mismatch" Error?

Check these common issues:

#### 1. Redirect URI Mismatch

```bash
# In Apple Console, it should be:
https://yourdomain.com/api/auth/callback/apple

# NOT:
https://www.yourdomain.com/api/auth/callback/apple
http://yourdomain.com/api/auth/callback/apple
https://yourdomain.com/api/auth/callback/apple/
```

#### 2. Environment Variables Not Loaded

- Restart your production app after setting environment variables
- Verify variables are set: add temporary console.log in `lib/auth.ts`

#### 3. Domain Not Verified in Apple Console

- Wait a few minutes after saving Apple Console changes
- Verify domain shows in the list (no "Pending" status)

#### 4. Cookie Issues

- Check browser console for cookie errors
- Verify you're accessing via HTTPS
- Clear browser cookies and try again

#### 5. JWT Token Expired

- Apple Client Secret (JWT) expires after 6 months
- Regenerate using `node scripts/generate-apple-secret.js`
- Update `APPLE_CLIENT_SECRET` in your environment variables

### Enable Debug Logging

Add to your environment variables:

```env
DEBUG=better-auth:*
```

Check your server logs for detailed auth flow information.

### Check Server Logs

Look for errors like:

- `Invalid client_id`
- `Invalid redirect_uri`
- `Invalid client_secret`
- `State parameter mismatch`

These indicate configuration issues in Apple Developer Console or environment variables.

---

## ✅ Success Criteria

- [ ] Can access site via `https://yourdomain.com`
- [ ] "Sign in with Apple" button appears
- [ ] Clicking button redirects to Apple ID login
- [ ] After signing in with Apple, redirects back to app
- [ ] User is signed in and sees their dashboard
- [ ] Email allowlist works (if configured)
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## 📝 For Local Development

**Important**: Apple Sign-In will **NOT work** on `localhost`.

**Options:**

1. **Use Google Sign-In** for local development
2. **Test Apple Sign-In** only in production/staging
3. **Use ngrok** for temporary local testing (see `APPLE_SIGNIN_TROUBLESHOOTING.md`)

**Recommended workflow:**

```bash
# Develop locally with Google Sign-In
bun run dev
# Access: http://localhost:3000
# Test: Google Sign-In ✅, Apple Sign-In ❌

# Deploy to production to test Apple Sign-In
git push
# Access: https://yourdomain.com
# Test: Google Sign-In ✅, Apple Sign-In ✅
```

---

## 🔄 Maintenance

### JWT Token Expiration (Every 6 Months)

1. Run the generation script:

   ```bash
   node scripts/generate-apple-secret.js
   ```

2. Update `APPLE_CLIENT_SECRET` in production environment variables

3. Restart your production app

4. Test Apple Sign-In to confirm it works

### Changing Domains

If you change your production domain:

1. Update Apple Developer Console with new domain and redirect URI
2. Update environment variables:
   - `APPLE_REDIRECT_URI`
   - `BETTER_AUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
3. Deploy changes
4. Test Apple Sign-In

---

## 📚 Additional Resources

- [Apple Sign In with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Better Auth Apple Provider Guide](https://better-auth.com/docs/guides/social-providers/apple)
- See `APPLE_SIGNIN_TROUBLESHOOTING.md` for detailed troubleshooting

---

## 🆘 Need Help?

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| "state_mismatch" error | Check redirect URI matches exactly in Apple Console |
| "Invalid client_id" | Verify `APPLE_CLIENT_ID` matches your Service ID |
| "Invalid redirect_uri" | Must be HTTPS, exact path, no trailing slash |
| Cookies not working | Ensure site is HTTPS, cookies are secure |
| JWT expired | Regenerate client secret, update env var |
| Domain not verified | Wait a few minutes, check Apple Console for status |

Still stuck? Check `APPLE_SIGNIN_TROUBLESHOOTING.md` for more detailed debugging steps.
