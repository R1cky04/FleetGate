import { UserRole } from '../../generated/prisma';

export interface JwtUser {
  id: number;
  userCode?: string | null;
  email?: string | null;
  role: UserRole;
  stationId?: number | null;
  tenantId?: number | null;
  companyCode?: string | null;
  tenantDbMode?: 'SHARED' | 'DEDICATED' | null;
}
