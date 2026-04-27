# Query Fan-Out Configuration Guide

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Gemini AI API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Configuration (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Brief AI Configuration
BRIEF_AI_API_URL=https://api.briefai.com
QUERY_FANOUT_ENABLED=true
CONCURRENCY_LIMIT=10
CACHE_TTL=3600000

# Performance Settings
MAX_RETRIES=3
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000

# DataForSEO Configuration
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Configuration Options

### Query Fan-Out Settings

- `QUERY_FANOUT_ENABLED`: Enable/disable Query Fan-Out functionality (default: true)
- `CONCURRENCY_LIMIT`: Maximum parallel queries (default: 10)
- `CACHE_TTL`: Cache time-to-live in milliseconds (default: 3600000 = 1 hour)

### Performance Settings

- `MAX_RETRIES`: Maximum retry attempts for failed requests (default: 3)
- `CIRCUIT_BREAKER_THRESHOLD`: Failure threshold for circuit breaker (default: 5)
- `CIRCUIT_BREAKER_TIMEOUT`: Circuit breaker timeout in milliseconds (default: 60000 = 1 minute)

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
2. **Rate Limiting**: Adjust `CONCURRENCY_LIMIT` if hitting rate limits
3. **Memory Issues**: Reduce `CACHE_TTL` for lower memory usage
4. **Timeout Errors**: Increase `CIRCUIT_BREAKER_TIMEOUT` for slower networks

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG_MODE=true
```

This will provide detailed logs for troubleshooting Query Fan-Out operations.
