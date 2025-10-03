// Test script for Meta Ads and Google Ads API
// Run this with: node test-ads-api.js

import axios from 'axios';

const API_BASE = 'http://localhost:8000/api'; // Adjust port if needed
const JWT_TOKEN = 'your-jwt-token-here'; // Get this from login

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`
  }
});

async function testAPIs() {
  console.log('🧪 Testing Meta Ads and Google Ads API Integration...\n');

  try {
    // Test Meta Ads API
    console.log('📘 Testing Meta Ads API Connection...');
    const metaResult = await api.get('/ads/test/meta');
    console.log('✅ Meta Ads API:', metaResult.data);
    console.log('');
  } catch (error) {
    console.log('❌ Meta Ads API Error:', error.response?.data || error.message);
    console.log('');
  }

  try {
    // Test Google Ads API
    console.log('🔍 Testing Google Ads API Connection...');
    const googleResult = await api.get('/ads/test/google');
    console.log('✅ Google Ads API:', googleResult.data);
    console.log('');
  } catch (error) {
    console.log('❌ Google Ads API Error:', error.response?.data || error.message);
    console.log('');
  }

  try {
    // Test keyword suggestions
    console.log('🔍 Testing Google Ads Keyword Suggestions...');
    const keywordResult = await api.post('/ads/google/keywords/suggestions', {
      targetAudience: 'Adults seeking therapy for anxiety and depression in Brazil'
    });
    console.log('✅ Keyword Suggestions:', keywordResult.data.data.slice(0, 5));
    console.log('');
  } catch (error) {
    console.log('❌ Keyword Suggestions Error:', error.response?.data || error.message);
    console.log('');
  }
}

// Run the tests
testAPIs().catch(console.error);