const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createITUser() {
  try {
    const hashedPassword = await bcrypt.hash('it1234', 10);
    
    const user = await prisma.user.create({
      data: {
        userCode: 'IT',
        email: 'it@fleetgate.com',
        password: hashedPassword,
        role: 'IT',
        status: 'ACTIVE',
        firstName: 'System',
        lastName: 'Administrator',
        fullName: 'System Administrator',
        phone: '000000000',
        country: 'Portugal'
      }
    });
    
    console.log('✅ IT User created successfully:');
    console.log('  Username:', user.userCode);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  ID:', user.id);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createITUser();
