import { UserRole } from '../../generated/prisma';

export interface JwtUser {
  id: number;
  userCode?: string | null;
  email?: string | null;
  role: UserRole;
  stationId?: string | null;
}
