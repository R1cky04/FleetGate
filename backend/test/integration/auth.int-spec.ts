import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../../src/auth/auth.module';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma.service';

describe('AuthService (integration)', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  const email = `int-${Date.now()}@example.com`;
  const userCode = `INT${Date.now()}`;
  const password = 'Password123!';
  let userId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    authService = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        userCode,
        role: 'STAFF',
        status: 'ACTIVE',
        firstName: 'Integration',
        lastName: 'User',
        fullName: 'Integration User',
        email,
        password: hashedPassword,
        phone: '+351910000222',
        acceptedTerms: true,
      },
    });

    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('logs in with valid credentials', async () => {
    const result = await authService.login({ userCode, password });

    expect(result.accessToken).toBeDefined();
    expect(result.user.userCode).toBe(userCode);
    expect(result.user.password).toBeUndefined();
  });
});
