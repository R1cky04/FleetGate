import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '../../generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(userCode: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { userCode: userCode.toUpperCase() },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.userCode, dto.password);
    const payload = {
      sub: user.id,
      userCode: user.userCode,
      email: user.email,
      role: user.role,
      stationId: user.stationId,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { password, ...safeUser } = user;
    return {
      accessToken,
      user: safeUser,
    };
  }
}
