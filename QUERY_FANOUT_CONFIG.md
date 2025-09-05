# Query Fan-Out Configuration Guide

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Gemini AI API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Configuration (Optional)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Brief AI Configuration
VITE_BRIEF_AI_API_URL=https://api.briefai.com
VITE_QUERY_FANOUT_ENABLED=true
VITE_CONCURRENCY_LIMIT=10
VITE_CACHE_TTL=3600000

# Performance Settings
VITE_MAX_RETRIES=3
VITE_CIRCUIT_BREAKER_THRESHOLD=5
VITE_CIRCUIT_BREAKER_TIMEOUT=60000

# DataForSEO Configuration
VITE_DATAFORSEO_LOGIN=your_dataforseo_login
VITE_DATAFORSEO_PASSWORD=your_dataforseo_password

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Configuration Options

### Query Fan-Out Settings

- `VITE_QUERY_FANOUT_ENABLED`: Enable/disable Query Fan-Out functionality (default: true)
- `VITE_CONCURRENCY_LIMIT`: Maximum parallel queries (default: 10)
- `VITE_CACHE_TTL`: Cache time-to-live in milliseconds (default: 3600000 = 1 hour)

### Performance Settings

- `VITE_MAX_RETRIES`: Maximum retry attempts for failed requests (default: 3)
- `VITE_CIRCUIT_BREAKER_THRESHOLD`: Failure threshold for circuit breaker (default: 5)
- `VITE_CIRCUIT_BREAKER_TIMEOUT`: Circuit breaker timeout in milliseconds (default: 60000 = 1 minute)

### API Keys

1. **Gemini AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **OpenAI** (Optional): Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
3. **DataForSEO**: Get credentials from [DataForSEO](https://dataforseo.com/)
4. **Firebase**: Get configuration from [Firebase Console](https://console.firebase.google.com/)

## Usage

1. Copy the environment variables to your `.env` file
2. Replace placeholder values with your actual API keys
3. Restart the development server
4. Query Fan-Out functionality will be automatically enabled

## Features

### Enhanced Query Fan-Out Service
- Semantic query expansion
- Parallel processing with circuit breaker
- Intelligent caching
- Brief-specific analysis
- Content gap identification
- AI-powered content enhancement

### UI Components
- Interactive Query Fan-Out panel
- Real-time processing status
- Comprehensive results visualization
- Brief recommendations
- Content gap analysis

### Performance Optimizations
- Circuit breaker pattern for reliability
- Exponential backoff retry logic
- Intelligent caching system
- Parallel processing with rate limiting
- Fallback mechanisms

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all required API keys are properly set
2. **Rate Limiting**: Adjust `VITE_CONCURRENCY_LIMIT` if hitting rate limits
3. **Memory Issues**: Reduce `VITE_CACHE_TTL` for lower memory usage
4. **Timeout Errors**: Increase `VITE_CIRCUIT_BREAKER_TIMEOUT` for slower networks

### Debug Mode

Enable debug logging by setting:
```bash
VITE_DEBUG_MODE=true
```

This will provide detailed logs for troubleshooting Query Fan-Out operations.
