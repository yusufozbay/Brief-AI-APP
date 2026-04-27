# Environment Variables for Netlify Deployment

## Required Environment Variables

To deploy Brief AI to Netlify, you need to configure the following environment variables in your Netlify project settings:

### 1. Cloudflare Worker Bridge URL (REQUIRED)
```
WORKER_BRIDGE_URL=https://briefai.ysfzby.workers.dev
```
**Description**: Cloudflare Worker bridge endpoint used for Gemini and DataForSEO API calls
**Required**: YES - Without this, app will fall back to Netlify function for DataForSEO and static templates for Gemini

### 2. DataForSEO Configuration (Worker Secret)
```
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password
```
**Description**: DataForSEO credentials used by Cloudflare Worker
**Required**: YES - For competitor selection and analysis features
**Note**: Keep these as server-side secrets.

### 3. Gemini Configuration (Worker Secret)
```
GEMINI_API_KEY=your_gemini_api_key
```
**Description**: Gemini API key used by Cloudflare Worker
**Required**: YES - For AI-generated content strategy
**Note**: Keep this as a server-side secret.

### 4. Firebase Configuration (OPTIONAL - for sharing functionality)
```
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=1:your_sender_id:web:your_app_id
```
**Description**: Firebase web config for brief sharing, referral, and token usage features
**Required**: NO - App will work without sharing if not configured

## How to Set Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your Brief AI project
3. Navigate to **Site settings** → **Environment variables**
4. Click **Add variable** for each environment variable
5. Enter the **Key** and **Value** for each variable
6. Click **Save**
7. Redeploy your site

## Build Settings

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18 or higher

## Security Notes

- Never commit API keys to your repository
- Client-exposed environment variables should be treated as public
- Firebase web configuration is safe to expose as it's designed for client-side use
- Keep Gemini and DataForSEO credentials only in Cloudflare Worker Secrets

## Deployment URL

Your app will be available at: https://content-brief-ai-app.netlify.app/

## Features Status

- ✅ **Dynamic Content Generation**: Requires Worker `GEMINI_API_KEY` + Netlify `WORKER_BRIDGE_URL`
- ✅ **Competitor Analysis**: Requires Worker `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` + Netlify `WORKER_BRIDGE_URL`
- ✅ **Brief Sharing**: Requires Firebase configuration (optional)
- ✅ **NOINDEX for Shared Briefs**: Automatic (no configuration needed)
- ✅ **2025 Content Updates**: Automatic (no configuration needed)

## Troubleshooting

### Static Template Content
If you see generic content like "Detaylı yanıt" instead of AI-generated content:
- Check that `WORKER_BRIDGE_URL` is correctly set
- Verify Worker `GEMINI_API_KEY` secret is valid and has quota
- Check Worker logs for `/api/gemini/content-strategy` errors

### Sharing Not Working
If the "Briefi Paylaş" button doesn't work:
- Ensure all Firebase environment variables are set
- Check that Firebase project exists and is configured
- Verify Firestore is enabled in your Firebase project

### Competitor Selection Issues
If competitor selection doesn't work:
- Verify Worker `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` secrets are correct
- Check that your DataForSEO account has sufficient credits
- Ensure the credentials have API access permissions
- Check Worker logs for `/api/dataforseo/serp` errors

### CORS Errors (RESOLVED)
If you see CORS errors in the browser console:
- This is handled by the Cloudflare Worker bridge
- Verify your app domain is included in Worker `ALLOWED_ORIGINS`
- Verify `WORKER_BRIDGE_URL` points to the active Worker deployment
