export enum UserRole {
  CLIENT = 'CLIENT',
  FLEET = 'FLEET',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  IT = 'IT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

// Hierarquia de permissões
export const ROLE_HIERARCHY = {
  [UserRole.CLIENT]: [],
  [UserRole.FLEET]: [UserRole.CLIENT],
  [UserRole.STAFF]: [UserRole.FLEET, UserRole.CLIENT],
  [UserRole.ADMIN]: [UserRole.STAFF, UserRole.FLEET, UserRole.CLIENT],
  [UserRole.IT]: [UserRole.ADMIN, UserRole.STAFF, UserRole.FLEET, UserRole.CLIENT],
};

// Permissões do sistema
export enum Permission {
  // Vehicles
  VEHICLE_VIEW = 'vehicle.view',
  VEHICLE_CREATE = 'vehicle.create',
  VEHICLE_UPDATE = 'vehicle.update',
  VEHICLE_DELETE = 'vehicle.delete',
  VEHICLE_UPGRADE = 'vehicle.upgrade',
  VEHICLE_MAINTENANCE = 'vehicle.maintenance',
  
  // Vehicle Groups
  VEHICLE_GROUP_MANAGE = 'vehicle_group.manage',
  
  // Reservations
  RESERVATION_VIEW = 'reservation.view',
  RESERVATION_CREATE = 'reservation.create',
  RESERVATION_UPDATE = 'reservation.update',
  RESERVATION_CANCEL = 'reservation.cancel',
  RESERVATION_CONFIRM = 'reservation.confirm',
  
  // Contracts
  CONTRACT_VIEW = 'contract.view',
  CONTRACT_CREATE = 'contract.create',
  CONTRACT_UPDATE = 'contract.update',
  CONTRACT_CHECKOUT = 'contract.checkout',
  CONTRACT_CHECKIN = 'contract.checkin',
  CONTRACT_CANCEL = 'contract.cancel',
  
  // Payments
  PAYMENT_VIEW = 'payment.view',
  PAYMENT_PROCESS = 'payment.process',
  PAYMENT_REFUND = 'payment.refund',
  
  // Users
  USER_VIEW = 'user.view',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_MANAGE_PERMISSIONS = 'user.manage_permissions',
  
  // Staff
  STAFF_VIEW = 'staff.view',
  STAFF_MOVE = 'staff.move',
  STAFF_ASSIGN = 'staff.assign',
  
  // Stations
  STATION_VIEW = 'station.view',
  STATION_CREATE = 'station.create',
  STATION_UPDATE = 'station.update',
  STATION_DELETE = 'station.delete',
  STATION_MANAGE = 'station.manage',
  
  // Reports
  REPORT_VIEW = 'report.view',
  REPORT_EXPORT = 'report.export',
  REPORT_FINANCIAL = 'report.financial',
  
  // System
  SYSTEM_SETTINGS = 'system.settings',
  SYSTEM_LOGS = 'system.logs',
  SYSTEM_BACKUP = 'system.backup',
}

// Permissões padrão por role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CLIENT]: [],
  
  [UserRole.FLEET]: [
    Permission.VEHICLE_VIEW,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_MAINTENANCE,
  ],
  
  [UserRole.STAFF]: [
    // Herda FLEET
    Permission.VEHICLE_VIEW,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_MAINTENANCE,
    // Próprias - apenas na SUA estação
    Permission.RESERVATION_VIEW,
    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_UPDATE,
    Permission.RESERVATION_CONFIRM,
    Permission.CONTRACT_VIEW,
    Permission.CONTRACT_CREATE,
    Permission.CONTRACT_UPDATE,
    Permission.CONTRACT_CHECKOUT,
    Permission.CONTRACT_CHECKIN,
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.USER_VIEW,
  ],
  
  [UserRole.ADMIN]: [
    // Herda STAFF + FLEET
    Permission.VEHICLE_VIEW,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_DELETE,
    Permission.VEHICLE_UPGRADE,
    Permission.VEHICLE_MAINTENANCE,
    Permission.RESERVATION_VIEW,
    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_UPDATE,
    Permission.RESERVATION_CANCEL,
    Permission.RESERVATION_CONFIRM,
    Permission.CONTRACT_VIEW,
    Permission.CONTRACT_CREATE,
    Permission.CONTRACT_UPDATE,
    Permission.CONTRACT_CHECKOUT,
    Permission.CONTRACT_CHECKIN,
    Permission.CONTRACT_CANCEL,
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_REFUND,
    // Próprias - gestão de SUA estação
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_MANAGE_PERMISSIONS,
    Permission.STAFF_VIEW,
    Permission.STAFF_MOVE,    // Apenas ADMIN pode mover staff
    Permission.STAFF_ASSIGN,
    Permission.STATION_VIEW,
    Permission.STATION_UPDATE,
    Permission.STATION_MANAGE, // Apenas sua estação
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_FINANCIAL,
  ],
  
  [UserRole.IT]: [
    // Todas as permissões - acesso global
    ...Object.values(Permission),
  ],
};
