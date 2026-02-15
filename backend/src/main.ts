import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  
  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('FleetGate API')
    .setDescription('Fleet management system API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('vehicles', 'Vehicle management')
    .addTag('reservations', 'Reservation management')
    .addTag('contracts', 'Contract management')
    .addTag('stations', 'Station management')
    .addTag('payments', 'Payment management')
    .addTag('system-config', 'System configuration')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`\n\n🚀 FleetGate Backend is running on http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📚 Swagger API Documentation: http://localhost:${process.env.PORT ?? 3000}/api\n\n`);
}
bootstrap();
