import { prisma } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const username = process.argv[2] || 'admin'
  const password = process.argv[3] || 'admin123'

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      isAdmin: true
    },
    create: {
      username,
      password: hashedPassword,
      isAdmin: true
    }
  })

  console.log(`Admin user created/updated:`)
  console.log(`  Username: ${user.username}`)
  console.log(`  Password: ${password}`)
  console.log(`  Admin: ${user.isAdmin}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
