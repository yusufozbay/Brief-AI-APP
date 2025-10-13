#!/usr/bin/env node

/**
 * Test script to debug DataForSEO API connectivity
 * Run with: node test-dataforseo.js
 */

const https = require('https');

// You can test with your actual credentials or use these placeholders
const LOGIN = process.env.VITE_DATAFORSEO_LOGIN || 'your_login';
const PASSWORD = process.env.VITE_DATAFORSEO_PASSWORD || 'your_password';

console.log('Testing DataForSEO API connectivity...');
console.log('Login:', LOGIN);
console.log('Password:', PASSWORD ? '***' : 'NOT SET');

if (LOGIN === 'your_login' || PASSWORD === 'your_password') {
  console.log('\n❌ Please set VITE_DATAFORSEO_LOGIN and VITE_DATAFORSEO_PASSWORD environment variables');
  console.log('Example: VITE_DATAFORSEO_LOGIN=your_login VITE_DATAFORSEO_PASSWORD=your_password node test-dataforseo.js');
  process.exit(1);
}

const auth = Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

const requestData = [{
  keyword: 'test keyword',
  location_code: 2792, // Turkey
  language_code: 'tr',
  device: 'mobile',
  os: 'android'
}];

const postData = JSON.stringify(requestData);

const options = {
  hostname: 'api.dataforseo.com',
  port: 443,
  path: '/v3/serp/google/organic/live/advanced',
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('\nMaking request to DataForSEO API...');

const req = https.request(options, (res) => {
  console.log(`\nResponse Status: ${res.statusCode} ${res.statusMessage}`);
  console.log('Response Headers:', res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const responseData = JSON.parse(data);
      console.log('\n✅ API Response:');
      console.log(JSON.stringify(responseData, null, 2));
      
      if (responseData.status_code === 20000) {
        console.log('\n✅ DataForSEO API is working correctly!');
      } else {
        console.log('\n❌ API returned error:', responseData.status_message);
      }
    } catch (error) {
      console.log('\n❌ Failed to parse response as JSON:');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('\n❌ Request failed:', error.message);
});

req.write(postData);
req.end();
