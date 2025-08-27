import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    console.log('Running test query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Test query successful:', result);
    
    console.log('Checking tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Available tables:', tables);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

testConnection();