# Vercel Deployment Guide for tracktove

## Prerequisites
- Vercel account (https://vercel.com)
- Git repository linked to Vercel
- eBay OAuth credentials from developer.ebay.com

## Environment Variables Required in Vercel

Go to your Vercel project settings and add these environment variables:

```
EBAY_CLIENT_ID=BharathM-tracktove-PRD-87b75c3f4-a6504f71
EBAY_CLIENT_SECRET=[your_production_client_secret_from_ebay_dev]
EBAY_VERIFICATION_TOKEN=[your_verification_token_from_ebay]
```

## Deployment Steps

### Option 1: Deploy with Git Push
1. Make sure all changes are committed:
   ```
   git add .
   git commit -m "Replace eBay scraper with OAuth API integration"
   git push origin main
   ```
2. Vercel automatically deploys on git push to main

### Option 2: Deploy with Vercel CLI
```
npm i -g vercel
vercel --prod
```

## Verify Deployment

1. Go to your Vercel project dashboard
2. Check the deployment logs for any errors
3. Visit your deployed app URL
4. Try a search to verify eBay API integration works

## API Endpoints

After deployment:
- `https://your-app.vercel.app/api/ebay/search?q=watch` - Search listings
- `https://your-app.vercel.app/api/ebay/notifications?challenge_code=xxx` - Verification endpoint

## Troubleshooting

### OAuth Token Error
- Verify `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` are correct
- Check that credentials are in production environment

### Search Returns No Results
- Verify eBay API credentials are for production (not sandbox)
- Check browser console for error details
- Verify network requests in DevTools

### Webhook Verification Fails
- Double-check `EBAY_VERIFICATION_TOKEN` matches what's in eBay portal
- Make sure your Vercel URL is publicly accessible
