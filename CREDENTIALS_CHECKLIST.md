# Quick Reference: eBay Credentials Checklist

## ✅ What You Need

### From eBay Developer Portal
Get these from: https://developer.ebay.com/my/applications

**Your Application: "tracktove" (Production)**

- [ ] **Client ID (App ID)**
  - Value: `BharathM-tracktove-PRD-87b75c3f4-a6504f71`
  - Location: Keys tab → App ID
  - Status: ✅ Already in code

- [ ] **Client Secret**
  - Value: `_______________________` ← FILL THIS IN
  - Location: Keys tab → Client Secret
  - Status: ⏳ NEEDED for `.env.local`
  - **⚠️ Keep this secret! Never commit to git.**

- [ ] **Verification Token**
  - Value: `_______________________` ← FILL THIS IN
  - Location: Alerts & Notifications → Verification token
  - Status: ⏳ NEEDED for `.env.local`
  - Used for: Webhook challenge-response

- [ ] **Cert ID** (optional, for other integrations)
  - Value: `BharathM-tracktove-PRD-[...]`
  - Location: Keys tab → Cert ID
  - Used by: Legacy eBay XML API (not needed now)

## 📍 Where to Put These Values

### Local Development
File: `d:\Projects\trove_clone\tracktove\.env.local`

```env
EBAY_CLIENT_SECRET=<paste_client_secret_here>
EBAY_VERIFICATION_TOKEN=<paste_verification_token_here>
```

### Production (Vercel)
1. Go to: https://vercel.com/dashboard
2. Select: `tracktove` project
3. Settings → Environment Variables
4. Add these 3 variables:
   - `EBAY_CLIENT_ID` = `BharathM-tracktove-PRD-87b75c3f4-a6504f71`
   - `EBAY_CLIENT_SECRET` = `<your_client_secret>`
   - `EBAY_VERIFICATION_TOKEN` = `<your_verification_token>`

## 🔗 Links

- eBay Developer Account: https://developer.ebay.com/account/signin
- My Applications: https://developer.ebay.com/my/applications
- API Documentation: https://developer.ebay.com/api-docs/

## 🚀 Getting Started

1. Copy your Client Secret from eBay
2. Paste into `.env.local` and `.vercel` environment
3. Copy your Verification Token from eBay
4. Paste into `.env.local` and `.vercel` environment
5. Run `pnpm dev` to test locally
6. Run `git push` to deploy to Vercel
7. Done! ✅

## ⚠️ Security Notes

- **Never** commit `.env.local` to git (it's in `.gitignore`)
- **Never** share `EBAY_CLIENT_SECRET` in messages/screenshots
- **Never** hardcode secrets in source code
- Always use environment variables in Vercel
- Rotate your Client Secret periodically in eBay dev portal
