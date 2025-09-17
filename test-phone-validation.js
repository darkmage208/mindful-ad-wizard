import Joi from 'joi';

// Same phone validation logic from the backend
const phoneSchema = Joi.string().custom((value, helpers) => {
  // Remove all non-digit characters except + at start
  const cleaned = value.replace(/[^\d+]/g, '');

  // Check if it's a valid phone number
  // Must have 7-15 digits, optionally starting with +
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return helpers.error('any.invalid');
  }

  // If it starts with +, must have at least 8 digits total
  if (cleaned.startsWith('+') && cleaned.length < 9) {
    return helpers.error('any.invalid');
  }

  return value; // Return original value to preserve formatting
}).message('Invalid phone number format');

// Test cases
const testCases = [
  '+1 (518) 760-9790',
  '(518) 760-9790',
  '518-760-9790',
  '518.760.9790',
  '5187609790',
  '+15187609790',
  '518 760 9790',
  '+1-518-760-9790',
  // Invalid cases
  '123', // too short
  '++123456789', // multiple plus signs
  'abc-def-ghij', // no digits
];

console.log('Testing phone validation:');
console.log('=========================');

testCases.forEach(phone => {
  const { error } = phoneSchema.validate(phone);
  const status = error ? '❌ INVALID' : '✅ VALID';
  console.log(`${status}: "${phone}"`);
  if (error) {
    console.log(`   Error: ${error.message}`);
  }
});