// Quick script to test your DATABASE_URL format
// Run with: node test-connection.js

require('dotenv').config();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('Testing DATABASE_URL format...\n');
console.log('Your DATABASE_URL (password hidden):');
console.log(url.replace(/:([^:@]+)@/, ':****@'));

// Parse the URL
try {
  const urlObj = new URL(url);
  console.log('\n✅ URL parsed successfully!');
  console.log('Protocol:', urlObj.protocol);
  console.log('Username:', urlObj.username);
  console.log('Host:', urlObj.hostname);
  console.log('Port:', urlObj.port || 'default (5432)');
  console.log('Database:', urlObj.pathname.replace('/', ''));
  console.log('Search params:', urlObj.search);
  
  // Check for common issues
  if (!urlObj.port && urlObj.hostname !== 'localhost') {
    console.log('\n⚠️  Warning: No port specified, using default 5432');
  }
  
  if (urlObj.password && urlObj.password.includes('@')) {
    console.log('\n❌ ERROR: Password contains @ symbol that should be encoded as %40');
  }
  
  if (urlObj.password && urlObj.password.includes(':')) {
    console.log('\n❌ ERROR: Password contains : symbol that should be encoded as %3A');
  }
  
} catch (error) {
  console.error('\n❌ ERROR: Invalid URL format');
  console.error('Error:', error.message);
  console.log('\nExpected format:');
  console.log('postgresql://username:password@host:port/database?schema=public');
  console.log('\nCommon issues:');
  console.log('1. Missing quotes around the URL in .env file');
  console.log('2. Special characters in password not encoded');
  console.log('3. Missing port number');
  console.log('4. Incorrect protocol (should be postgresql://)');
}
