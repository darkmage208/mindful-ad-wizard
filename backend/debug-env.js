import dotenv from 'dotenv';

// Load env first
console.log('1. Loading dotenv...');
dotenv.config();
console.log('2. JWT_SECRET:', process.env.JWT_SECRET ? 'EXISTS' : 'MISSING');
console.log('3. JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'EXISTS' : 'MISSING');

// Now try importing auth
console.log('4. Importing auth module...');
try {
  const { hashPassword } = await import('./src/utils/auth.js');
  console.log('5. Auth module imported successfully!');
} catch (error) {
  console.error('5. Error importing auth module:', error.message);
}