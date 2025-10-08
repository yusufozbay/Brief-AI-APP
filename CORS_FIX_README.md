# CORS Fix for DataForSEO API Integration

## Problem
The DataForSEO API was causing CORS (Cross-Origin Resource Sharing) errors when called directly from the browser. The error message was:
```
Access to XMLHttpRequest at 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced' from origin 'https://briefai.mosanta.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution
Implemented a Netlify serverless function that acts as a proxy between the frontend and the DataForSEO API. This approach:

1. **Eliminates CORS issues** - Serverless functions run on the server, not in the browser
2. **Keeps credentials secure** - API credentials are stored as environment variables, not exposed to the client
3. **Maintains functionality** - All existing DataForSEO features continue to work

## Files Changed

### 1. New Serverless Function
- **File**: `netlify/functions/dataforseo-proxy.js`
- **Purpose**: Proxies requests from frontend to DataForSEO API
- **Features**: 
  - Handles CORS preflight requests
  - Manages authentication using environment variables
  - Returns proper error responses

### 2. Updated DataForSEO Service
- **File**: `src/services/dataForSEO.ts`
- **Changes**:
  - Removed hardcoded credentials
  - Changed API endpoint from direct DataForSEO API to serverless function
  - Simplified authentication headers

### 3. Updated Netlify Configuration
- **File**: `netlify.toml`
- **Changes**: Added `functions = "netlify/functions"` to build configuration

### 4. Updated Documentation
- **File**: `NETLIFY_ENV_VARS.md`
- **Changes**: Added notes about serverless function and CORS resolution

## Environment Variables Required

Make sure these environment variables are set in your Netlify project:

```bash
VITE_DATAFORSEO_LOGIN=your_dataforseo_login
VITE_DATAFORSEO_PASSWORD=your_dataforseo_password
```

## How It Works

1. **Frontend Request**: The React app makes a request to `/.netlify/functions/dataforseo-proxy`
2. **Serverless Function**: The function receives the request, adds authentication headers using environment variables
3. **DataForSEO API**: The function makes the actual API call to DataForSEO
4. **Response**: The function returns the response back to the frontend with proper CORS headers

## Testing

### Local Testing
1. Run `npm run build` to ensure the build works
2. The serverless function will only work when deployed to Netlify (not in local development)

### Production Testing
1. Deploy to Netlify with the environment variables set
2. Check browser console - CORS errors should be gone
3. Test the competitor selection feature to verify DataForSEO integration works

## Benefits

- ✅ **CORS Issues Resolved**: No more cross-origin request errors
- ✅ **Security Improved**: API credentials are server-side only
- ✅ **No Breaking Changes**: All existing functionality preserved
- ✅ **Scalable**: Uses Netlify's serverless infrastructure
- ✅ **Cost Effective**: Serverless functions only run when needed

## Deployment Steps

1. Ensure environment variables are set in Netlify dashboard
2. Deploy the updated code to Netlify
3. The serverless function will be automatically deployed with the site
4. Test the competitor selection feature to verify the fix

## Troubleshooting

### If you still see CORS errors:
- Verify the serverless function deployed correctly
- Check that `netlify.toml` includes the functions directory
- Ensure environment variables are set in Netlify

### If DataForSEO calls fail:
- Verify `VITE_DATAFORSEO_LOGIN` and `VITE_DATAFORSEO_PASSWORD` are correct
- Check Netlify function logs for authentication errors
- Ensure your DataForSEO account has sufficient credits

### If the app falls back to mock data:
- This is expected behavior when the API fails
- Check the browser console and Netlify function logs for specific error messages
