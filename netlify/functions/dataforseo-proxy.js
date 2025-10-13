exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get credentials from environment variables
    const login = process.env.VITE_DATAFORSEO_LOGIN;
    const password = process.env.VITE_DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'DataForSEO credentials not configured' 
        }),
      };
    }

    // Parse request body
    const requestData = JSON.parse(event.body);

    // Create authorization header
    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Make request to DataForSEO API using native fetch (available in Node.js 18+)
    const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataForSEO API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'DataForSEO API error',
          status: response.status,
          details: errorText
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('DataForSEO Proxy Error:', error);
    
    // Provide more detailed error information for debugging
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      hasCredentials: !!(process.env.VITE_DATAFORSEO_LOGIN && process.env.VITE_DATAFORSEO_PASSWORD)
    };
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: errorDetails
      }),
    };
  }
};
