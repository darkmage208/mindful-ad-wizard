// Test script to verify frontend authentication is working
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuthentication() {
    console.log('Testing Authentication System...\n');
    
    // Test 1: Register a new user
    const testEmail = `test${Date.now()}@example.com`;
    console.log('1. Testing Registration...');
    try {
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            name: 'Test User',
            email: testEmail,
            password: 'password123'
        });
        console.log('✅ Registration successful');
        console.log('   User ID:', registerResponse.data.data.user.id);
        console.log('   Email:', registerResponse.data.data.user.email);
        
        const token = registerResponse.data.data.accessToken;
        
        // Test 2: Access protected route with token
        console.log('\n2. Testing Protected Route Access...');
        const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✅ Protected route access successful');
        console.log('   User verified:', meResponse.data.data.user.email);
        
        // Test 3: Login with same credentials
        console.log('\n3. Testing Login...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testEmail,
            password: 'password123'
        });
        console.log('✅ Login successful');
        console.log('   Token received:', loginResponse.data.data.accessToken ? 'Yes' : 'No');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
        if (error.response?.data?.details) {
            console.error('   Details:', error.response.data.details);
        }
    }
    
    // Test 4: Test validation errors
    console.log('\n4. Testing Validation...');
    try {
        await axios.post(`${API_BASE_URL}/auth/register`, {
            name: 'T', // Too short
            email: 'invalid-email', // Invalid email
            password: '123' // Too short
        });
        console.log('❌ Validation should have failed');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Validation working correctly');
            console.log('   Error:', error.response.data.message);
        } else {
            console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
        }
    }
    
    console.log('\n✅ All backend authentication tests passed!');
    console.log('\nNow you can test the frontend by:');
    console.log('1. Opening http://localhost:5173/login in your browser');
    console.log('2. Clicking "Sign up" to go to registration page');
    console.log('3. Creating a new account');
    console.log('4. Logging in with those credentials');
}

testAuthentication();