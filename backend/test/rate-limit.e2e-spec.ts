import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '../generated/prisma';

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const userCode = `RATE${Date.now()}`;
  const password = 'Password123!';
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        userCode,
        role: 'STAFF',
        status: 'ACTIVE',
        firstName: 'Rate',
        lastName: 'Limit',
        fullName: 'Rate Limit',
        email: `rate-${Date.now()}@example.com`,
        password: hashedPassword,
        phone: '+351910000333',
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
    await app.close();
  });

  it('blocks excessive login attempts', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ userCode, password })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ userCode, password })
      .expect(429);
  });
});
