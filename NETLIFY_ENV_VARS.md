# Environment Variables for Netlify Deployment

## Required Environment Variables

To deploy Brief AI to Netlify, you need to configure the following environment variables in your Netlify project settings:

### 1. Gemini AI Configuration (REQUIRED)
```
VITE_GEMINI_API_KEY=AIzaSyASpxSW2hfE5L39449DcrlfHQwqr211EdU
```
**Description**: Google Gemini AI API key for dynamic content generation
**Required**: YES - Without this, the app will fall back to static templates

### 2. DataForSEO Configuration (REQUIRED)
```
VITE_DATAFORSEO_LOGIN=your_dataforseo_login
VITE_DATAFORSEO_PASSWORD=your_dataforseo_password
```
**Description**: DataForSEO API credentials for competitor analysis and SERP data (used by serverless function)
**Required**: YES - For competitor selection and analysis features
**Note**: These credentials are securely handled by the serverless function to avoid CORS issues

### 3. Firebase Configuration (OPTIONAL - for sharing functionality)
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=1:your_sender_id:web:your_app_id
```
**Description**: Firebase configuration for brief sharing functionality
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
- All environment variables starting with `VITE_` are exposed to the client
- Firebase configuration is safe to expose as it's designed for client-side use
- Keep your DataForSEO and Gemini API keys secure

## Deployment URL

Your app will be available at: https://content-brief-ai-app.netlify.app/

## Features Status

- ✅ **Dynamic Content Generation**: Requires `VITE_GEMINI_API_KEY`
- ✅ **Competitor Analysis**: Requires `VITE_DATAFORSEO_LOGIN` and `VITE_DATAFORSEO_PASSWORD`
- ✅ **Brief Sharing**: Requires Firebase configuration (optional)
- ✅ **NOINDEX for Shared Briefs**: Automatic (no configuration needed)
- ✅ **2025 Content Updates**: Automatic (no configuration needed)

## Troubleshooting

### Static Template Content
If you see generic content like "Detaylı yanıt" instead of AI-generated content:
- Check that `VITE_GEMINI_API_KEY` is correctly set
- Verify the API key is valid and has quota
- Check browser console for Gemini AI errors

### Sharing Not Working
If the "Briefi Paylaş" button doesn't work:
- Ensure all Firebase environment variables are set
- Check that Firebase project exists and is configured
- Verify Firestore is enabled in your Firebase project

### Competitor Selection Issues
If competitor selection doesn't work:
- Verify `VITE_DATAFORSEO_LOGIN` and `VITE_DATAFORSEO_PASSWORD` are correct
- Check that your DataForSEO account has sufficient credits
- Ensure the credentials have API access permissions
- Check browser console for CORS errors (should be resolved with serverless function)

### CORS Errors (RESOLVED)
If you see CORS errors in the browser console:
- This has been resolved by implementing a Netlify serverless function
- The function acts as a proxy between your frontend and DataForSEO API
- No client-side configuration needed - the serverless function handles authentication securely
