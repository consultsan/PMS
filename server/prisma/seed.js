const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create superadmin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@true.com' },
    update: {},
    create: {
      email: 'admin@true.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true
    },
  });

  console.log({ superadmin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 