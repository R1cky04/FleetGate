import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient({});

async function main() {
  console.log('🌱 Starting seed...');

  // Clean database
  console.log('🧹 Cleaning database...');
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.additionalDriver.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.vehicleGroup.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.station.deleteMany();
  await prisma.department.deleteMany();
  await prisma.damageType.deleteMany();

  // 1. Create Departments
  console.log('📁 Creating departments...');
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: 'IT',
        description: 'Tecnologia da Informação',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Operações',
        description: 'Gestão de Frota e Operações',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Atendimento',
        description: 'Atendimento ao Cliente',
      },
    }),
  ]);

  // 2. Create Stations
  console.log('🏢 Creating stations...');
  const lisbon = await prisma.station.create({
    data: {
      code: 'LIS-AIRPORT',
      name: 'Aeroporto de Lisboa',
      email: 'lisboa@fleetgate.pt',
      phone: '+351210000001',
      address: 'Aeroporto Humberto Delgado',
      city: 'Lisboa',
      postalCode: '1700-008',
      country: 'Portugal',
      latitude: 38.7813,
      longitude: -9.1357,
      isActive: true,
      isPickupPoint: true,
      isReturnPoint: true,
    },
  });

  const porto = await prisma.station.create({
    data: {
      code: 'OPO-AIRPORT',
      name: 'Aeroporto do Porto',
      email: 'porto@fleetgate.pt',
      phone: '+351220000001',
      address: 'Aeroporto Francisco Sá Carneiro',
      city: 'Porto',
      postalCode: '4470-558',
      country: 'Portugal',
      latitude: 41.2481,
      longitude: -8.6813,
      isActive: true,
      isPickupPoint: true,
      isReturnPoint: true,
    },
  });

  const faro = await prisma.station.create({
    data: {
      code: 'FAO-AIRPORT',
      name: 'Aeroporto de Faro',
      email: 'faro@fleetgate.pt',
      phone: '+351289000001',
      address: 'Aeroporto de Faro',
      city: 'Faro',
      postalCode: '8001-701',
      country: 'Portugal',
      latitude: 37.0194,
      longitude: -7.9658,
      isActive: true,
      isPickupPoint: true,
      isReturnPoint: true,
    },
  });

  // Estação fictícia para manutenção
  const maintenance = await prisma.station.create({
    data: {
      code: 'MAINTENANCE',
      name: 'Centro de Manutenção',
      email: 'manutencao@fleetgate.pt',
      phone: '+351210000099',
      address: 'Zona Industrial',
      city: 'Lisboa',
      postalCode: '1900-000',
      country: 'Portugal',
      isActive: true,
      isPickupPoint: false,
      isReturnPoint: false,
      isFictitious: true,
      purpose: 'MAINTENANCE',
    },
  });

  // Estação fictícia para roubados
  const stolen = await prisma.station.create({
    data: {
      code: 'STOLEN',
      name: 'Veículos Roubados',
      email: 'suporte@fleetgate.pt',
      phone: '+351210000099',
      address: 'N/A',
      city: 'N/A',
      postalCode: '0000-000',
      country: 'Portugal',
      isActive: false,
      isPickupPoint: false,
      isReturnPoint: false,
      isFictitious: true,
      purpose: 'STOLEN',
    },
  });

  // 3. Create Users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // IT User
  const itUser = await prisma.user.create({
    data: {
      email: 'it@fleetgate.pt',
      password: hashedPassword,
      role: 'IT',
      status: 'ACTIVE',
      firstName: 'Carlos',
      lastName: 'Silva',
      fullName: 'Carlos Silva',
      phone: '+351910000001',
      cpf: '11111111111',
      nif: '111111111',
      dateOfBirth: new Date('1985-01-15'),
      address: 'Rua IT, 1',
      city: 'Lisboa',
      postalCode: '1000-001',
      country: 'Portugal',
      employeeNumber: 'EMP001',
      hireDate: new Date('2020-01-01'),
      departmentId: departments[0].id,
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
    },
  });

  // Admin User - Lisboa
  const adminLisboa = await prisma.user.create({
    data: {
      email: 'admin.lisboa@fleetgate.pt',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      phone: '+351910000002',
      cpf: '22222222222',
      nif: '222222222',
      dateOfBirth: new Date('1988-05-20'),
      address: 'Rua Admin, 2',
      city: 'Lisboa',
      postalCode: '1000-002',
      country: 'Portugal',
      employeeNumber: 'EMP002',
      hireDate: new Date('2020-03-01'),
      departmentId: departments[1].id,
      stationId: lisbon.id,
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
    },
  });

  // Staff User - Lisboa
  const staffLisboa = await prisma.user.create({
    data: {
      email: 'staff.lisboa@fleetgate.pt',
      password: hashedPassword,
      role: 'STAFF',
      status: 'ACTIVE',
      firstName: 'João',
      lastName: 'Ferreira',
      fullName: 'João Ferreira',
      phone: '+351910000003',
      cpf: '33333333333',
      nif: '333333333',
      dateOfBirth: new Date('1992-08-10'),
      address: 'Rua Staff, 3',
      city: 'Lisboa',
      postalCode: '1000-003',
      country: 'Portugal',
      employeeNumber: 'EMP003',
      hireDate: new Date('2021-01-15'),
      departmentId: departments[2].id,
      stationId: lisbon.id,
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
    },
  });

  // Staff User - Porto
  const staffPorto = await prisma.user.create({
    data: {
      email: 'staff.porto@fleetgate.pt',
      password: hashedPassword,
      role: 'STAFF',
      status: 'ACTIVE',
      firstName: 'Ana',
      lastName: 'Costa',
      fullName: 'Ana Costa',
      phone: '+351910000004',
      cpf: '44444444444',
      nif: '444444444',
      dateOfBirth: new Date('1990-12-05'),
      address: 'Rua Staff, 4',
      city: 'Porto',
      postalCode: '4000-004',
      country: 'Portugal',
      employeeNumber: 'EMP004',
      hireDate: new Date('2021-06-01'),
      departmentId: departments[2].id,
      stationId: porto.id,
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
    },
  });

  // Fleet User - Faro
  const fleetFaro = await prisma.user.create({
    data: {
      email: 'fleet.faro@fleetgate.pt',
      password: hashedPassword,
      role: 'FLEET',
      status: 'ACTIVE',
      firstName: 'Pedro',
      lastName: 'Almeida',
      fullName: 'Pedro Almeida',
      phone: '+351910000005',
      cpf: '55555555555',
      nif: '555555555',
      dateOfBirth: new Date('1987-03-25'),
      address: 'Rua Fleet, 5',
      city: 'Faro',
      postalCode: '8000-005',
      country: 'Portugal',
      employeeNumber: 'EMP005',
      hireDate: new Date('2020-09-01'),
      departmentId: departments[1].id,
      stationId: faro.id,
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
    },
  });

  // Clients
  const client1 = await prisma.user.create({
    data: {
      role: 'CLIENT',
      status: 'ACTIVE',
      firstName: 'António',
      lastName: 'Oliveira',
      fullName: 'António Oliveira',
      email: 'antonio@example.com',
      phone: '+351920000001',
      cpf: '66666666666',
      nif: '666666666',
      dateOfBirth: new Date('1985-06-15'),
      address: 'Rua Cliente, 10',
      city: 'Lisboa',
      postalCode: '1100-010',
      country: 'Portugal',
      licenseNumber: 'L123456789',
      licenseExpiry: new Date('2027-06-15'),
      licenseIssueDate: new Date('2005-06-15'),
      licenseCountry: 'Portugal',
      idCardNumber: 'ID123456',
      idCardExpiry: new Date('2028-06-15'),
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
      clientRating: 4.8,
      totalRentals: 12,
    },
  });

  const client2 = await prisma.user.create({
    data: {
      role: 'CLIENT',
      status: 'ACTIVE',
      firstName: 'Sofia',
      lastName: 'Rodrigues',
      fullName: 'Sofia Rodrigues',
      email: 'sofia@example.com',
      phone: '+351920000002',
      cpf: '77777777777',
      nif: '777777777',
      dateOfBirth: new Date('1990-09-20'),
      address: 'Rua Cliente, 20',
      city: 'Porto',
      postalCode: '4200-020',
      country: 'Portugal',
      licenseNumber: 'L987654321',
      licenseExpiry: new Date('2029-09-20'),
      licenseIssueDate: new Date('2010-09-20'),
      licenseCountry: 'Portugal',
      idCardNumber: 'ID789012',
      idCardExpiry: new Date('2030-09-20'),
      emailVerified: true,
      phoneVerified: true,
      acceptedTerms: true,
      clientRating: 5.0,
      totalRentals: 5,
    },
  });

  // Cliente blacklisted
  const clientBlacklisted = await prisma.user.create({
    data: {
      role: 'CLIENT',
      status: 'SUSPENDED',
      firstName: 'Manuel',
      lastName: 'Problemas',
      fullName: 'Manuel Problemas',
      email: 'manuel@example.com',
      phone: '+351920000003',
      cpf: '88888888888',
      nif: '888888888',
      dateOfBirth: new Date('1980-01-01'),
      address: 'Rua Problema, 1',
      city: 'Lisboa',
      postalCode: '1000-100',
      country: 'Portugal',
      licenseNumber: 'L111111111',
      licenseExpiry: new Date('2026-01-01'),
      licenseIssueDate: new Date('2000-01-01'),
      licenseCountry: 'Portugal',
      emailVerified: true,
      acceptedTerms: true,
      isBlacklisted: true,
      blacklistReason: 'Múltiplos danos não reportados e atrasos frequentes',
      blacklistedAt: new Date('2025-12-01'),
      blacklistedBy: adminLisboa.id,
      clientRating: 1.5,
      totalRentals: 8,
    },
  });

  // 4. Create Vehicle Groups
  console.log('🚗 Creating vehicle groups...');
  const economico = await prisma.vehicleGroup.create({
    data: {
      code: 'ECO',
      name: 'Económico',
      description: 'Carros pequenos e eficientes para o dia a dia',
      category: 'Económico',
      seats: 5,
      doors: 4,
      transmission: 'Manual',
      fuelType: 'Gasolina',
      airConditioning: true,
      dailyRate: 25.00,
      weeklyRate: 150.00,
      monthlyRate: 500.00,
      depositAmount: 300.00,
      kmIncluded: 200,
      extraKmCost: 0.15,
      minRentalDays: 1,
      maxRentalDays: 90,
      minDriverAge: 21,
      minLicenseYears: 1,
      features: JSON.stringify(['Ar Condicionado', 'Rádio', 'USB']),
    },
  });

  const compacto = await prisma.vehicleGroup.create({
    data: {
      code: 'COM',
      name: 'Compacto',
      description: 'Carros confortáveis para viagens curtas',
      category: 'Compacto',
      seats: 5,
      doors: 4,
      transmission: 'Manual',
      fuelType: 'Diesel',
      airConditioning: true,
      dailyRate: 35.00,
      weeklyRate: 210.00,
      monthlyRate: 700.00,
      depositAmount: 400.00,
      kmIncluded: 250,
      extraKmCost: 0.18,
      minRentalDays: 1,
      maxRentalDays: 120,
      minDriverAge: 21,
      minLicenseYears: 1,
      features: JSON.stringify(['Ar Condicionado', 'Bluetooth', 'USB', 'Controlo de Cruzeiro']),
    },
  });

  const suv = await prisma.vehicleGroup.create({
    data: {
      code: 'SUV',
      name: 'SUV',
      description: 'Veículos espaçosos e confortáveis para família',
      category: 'SUV',
      seats: 5,
      doors: 5,
      transmission: 'Automático',
      fuelType: 'Diesel',
      airConditioning: true,
      dailyRate: 60.00,
      weeklyRate: 380.00,
      monthlyRate: 1400.00,
      depositAmount: 800.00,
      kmIncluded: 300,
      extraKmCost: 0.22,
      minRentalDays: 1,
      maxRentalDays: 180,
      minDriverAge: 23,
      minLicenseYears: 2,
      features: JSON.stringify(['Ar Condicionado', 'Bluetooth', 'GPS', 'Câmera de Ré', 'Sensores de Estacionamento', 'Controlo de Cruzeiro']),
    },
  });

  const premium = await prisma.vehicleGroup.create({
    data: {
      code: 'PREM',
      name: 'Premium',
      description: 'Carros de luxo para ocasiões especiais',
      category: 'Premium',
      seats: 5,
      doors: 4,
      transmission: 'Automático',
      fuelType: 'Híbrido',
      airConditioning: true,
      dailyRate: 120.00,
      weeklyRate: 750.00,
      monthlyRate: 2800.00,
      depositAmount: 1500.00,
      kmIncluded: 0,
      extraKmCost: 0.00,
      minRentalDays: 1,
      maxRentalDays: 60,
      minDriverAge: 25,
      minLicenseYears: 3,
      features: JSON.stringify(['Ar Condicionado', 'GPS', 'Bancos em Pele', 'Sistema de Som Premium', 'Teto Panorâmico', 'Assistente de Estacionamento']),
    },
  });

  // 5. Create Vehicles
  console.log('🚙 Creating vehicles...');
  
  // Económicos - Lisboa
  const veh1 = await prisma.vehicle.create({
    data: {
      groupId: economico.id,
      stationId: lisbon.id,
      licensePlate: '00-AA-00',
      vin: 'VIN001ECO2023',
      make: 'Renault',
      model: 'Clio',
      year: 2023,
      color: 'Branco',
      status: 'AVAILABLE',
      currentKm: 15000,
      lastServiceKm: 10000,
      nextServiceKm: 25000,
      registrationDate: new Date('2023-01-15'),
      registrationExpiry: new Date('2027-01-15'),
      insuranceNumber: 'INS001',
      insuranceExpiry: new Date('2026-06-30'),
      inspectionExpiry: new Date('2027-01-15'),
      notes: 'Carro em excelente estado',
    },
  });

  const veh2 = await prisma.vehicle.create({
    data: {
      groupId: economico.id,
      stationId: lisbon.id,
      licensePlate: '11-BB-11',
      vin: 'VIN002ECO2023',
      make: 'Peugeot',
      model: '208',
      year: 2023,
      color: 'Cinzento',
      status: 'AVAILABLE',
      currentKm: 12000,
      lastServiceKm: 10000,
      nextServiceKm: 20000,
      registrationDate: new Date('2023-03-10'),
      registrationExpiry: new Date('2027-03-10'),
      insuranceNumber: 'INS002',
      insuranceExpiry: new Date('2026-07-31'),
      inspectionExpiry: new Date('2027-03-10'),
    },
  });

  // Compactos - Lisboa e Porto
  const veh3 = await prisma.vehicle.create({
    data: {
      groupId: compacto.id,
      stationId: lisbon.id,
      licensePlate: '22-CC-22',
      vin: 'VIN003COM2023',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2023,
      color: 'Azul',
      status: 'RENTED',
      currentKm: 20000,
      lastServiceKm: 15000,
      nextServiceKm: 30000,
      registrationDate: new Date('2023-02-20'),
      registrationExpiry: new Date('2027-02-20'),
      insuranceNumber: 'INS003',
      insuranceExpiry: new Date('2026-08-31'),
      inspectionExpiry: new Date('2027-02-20'),
    },
  });

  const veh4 = await prisma.vehicle.create({
    data: {
      groupId: compacto.id,
      stationId: porto.id,
      licensePlate: '33-DD-33',
      vin: 'VIN004COM2022',
      make: 'Ford',
      model: 'Focus',
      year: 2022,
      color: 'Vermelho',
      status: 'AVAILABLE',
      currentKm: 35000,
      lastServiceKm: 30000,
      nextServiceKm: 45000,
      registrationDate: new Date('2022-06-15'),
      registrationExpiry: new Date('2026-06-15'),
      insuranceNumber: 'INS004',
      insuranceExpiry: new Date('2026-09-30'),
      inspectionExpiry: new Date('2026-06-15'),
    },
  });

  // SUVs - Porto e Faro
  const veh5 = await prisma.vehicle.create({
    data: {
      groupId: suv.id,
      stationId: porto.id,
      licensePlate: '44-EE-44',
      vin: 'VIN005SUV2023',
      make: 'Nissan',
      model: 'Qashqai',
      year: 2023,
      color: 'Preto',
      status: 'RESERVED',
      currentKm: 8000,
      lastServiceKm: 5000,
      nextServiceKm: 20000,
      registrationDate: new Date('2023-05-10'),
      registrationExpiry: new Date('2027-05-10'),
      insuranceNumber: 'INS005',
      insuranceExpiry: new Date('2026-10-31'),
      inspectionExpiry: new Date('2027-05-10'),
    },
  });

  const veh6 = await prisma.vehicle.create({
    data: {
      groupId: suv.id,
      stationId: faro.id,
      licensePlate: '55-FF-55',
      vin: 'VIN006SUV2024',
      make: 'Peugeot',
      model: '3008',
      year: 2024,
      color: 'Cinzento Escuro',
      status: 'AVAILABLE',
      currentKm: 3000,
      lastServiceKm: 0,
      nextServiceKm: 15000,
      registrationDate: new Date('2024-01-05'),
      registrationExpiry: new Date('2028-01-05'),
      insuranceNumber: 'INS006',
      insuranceExpiry: new Date('2026-12-31'),
      inspectionExpiry: new Date('2028-01-05'),
    },
  });

  // Premium - Lisboa
  const veh7 = await prisma.vehicle.create({
    data: {
      groupId: premium.id,
      stationId: lisbon.id,
      licensePlate: '66-GG-66',
      vin: 'VIN007PREM2024',
      make: 'BMW',
      model: '320d',
      year: 2024,
      color: 'Preto Brilhante',
      status: 'AVAILABLE',
      currentKm: 5000,
      lastServiceKm: 0,
      nextServiceKm: 15000,
      registrationDate: new Date('2024-02-01'),
      registrationExpiry: new Date('2028-02-01'),
      insuranceNumber: 'INS007',
      insuranceExpiry: new Date('2027-01-31'),
      inspectionExpiry: new Date('2028-02-01'),
      notes: 'Veículo premium com todos os extras',
    },
  });

  // Veículo em manutenção
  const veh8 = await prisma.vehicle.create({
    data: {
      groupId: economico.id,
      stationId: maintenance.id,
      licensePlate: '77-HH-77',
      vin: 'VIN008ECO2022',
      make: 'Opel',
      model: 'Corsa',
      year: 2022,
      color: 'Branco',
      status: 'MAINTENANCE',
      currentKm: 45000,
      lastServiceKm: 40000,
      nextServiceKm: 55000,
      registrationDate: new Date('2022-09-01'),
      registrationExpiry: new Date('2026-09-01'),
      insuranceNumber: 'INS008',
      insuranceExpiry: new Date('2026-08-31'),
      inspectionExpiry: new Date('2026-09-01'),
      notes: 'Em manutenção preventiva',
    },
  });

  // 6. Create Damage Types
  console.log('🔧 Creating damage types...');
  await Promise.all([
    prisma.damageType.create({
      data: {
        code: 'SCR-MIN',
        name: 'Arranhão Pequeno',
        description: 'Arranhões superficiais na pintura',
        category: 'EXTERIOR',
        severity: 'MINOR',
        estimatedCost: 50.00,
        minCost: 30.00,
        maxCost: 80.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'SCR-MAJ',
        name: 'Arranhão Profundo',
        description: 'Arranhões profundos que requerem repintura',
        category: 'EXTERIOR',
        severity: 'MODERATE',
        estimatedCost: 200.00,
        minCost: 150.00,
        maxCost: 350.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'DENT',
        name: 'Amolgadela',
        description: 'Amolgadelas na carroçaria',
        category: 'EXTERIOR',
        severity: 'MODERATE',
        estimatedCost: 150.00,
        minCost: 100.00,
        maxCost: 300.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'GLASS-CHIP',
        name: 'Pedra no Vidro',
        description: 'Pequena pedra no para-brisas',
        category: 'GLASS',
        severity: 'MINOR',
        estimatedCost: 80.00,
        minCost: 60.00,
        maxCost: 120.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'GLASS-CRACK',
        name: 'Fissura no Vidro',
        description: 'Fissura que requer substituição do vidro',
        category: 'GLASS',
        severity: 'MAJOR',
        estimatedCost: 350.00,
        minCost: 250.00,
        maxCost: 600.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'INT-BURN',
        name: 'Queimadura Interior',
        description: 'Queimaduras em bancos ou painéis',
        category: 'INTERIOR',
        severity: 'MODERATE',
        estimatedCost: 180.00,
        minCost: 120.00,
        maxCost: 300.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'INT-STAIN',
        name: 'Mancha Interior',
        description: 'Manchas em estofos',
        category: 'INTERIOR',
        severity: 'MINOR',
        estimatedCost: 60.00,
        minCost: 40.00,
        maxCost: 100.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'TIRE-FLAT',
        name: 'Pneu Furado',
        description: 'Pneu furado ou danificado',
        category: 'MECHANICAL',
        severity: 'MINOR',
        estimatedCost: 100.00,
        minCost: 80.00,
        maxCost: 150.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'BUMPER-DMG',
        name: 'Dano em Pára-choques',
        description: 'Danos significativos no pára-choques',
        category: 'EXTERIOR',
        severity: 'MAJOR',
        estimatedCost: 400.00,
        minCost: 300.00,
        maxCost: 700.00,
      },
    }),
    prisma.damageType.create({
      data: {
        code: 'MIRROR-BRK',
        name: 'Espelho Partido',
        description: 'Espelho retrovisor partido',
        category: 'EXTERIOR',
        severity: 'MODERATE',
        estimatedCost: 150.00,
        minCost: 100.00,
        maxCost: 250.00,
      },
    }),
  ]);

  // 7. Create Reservations
  console.log('📅 Creating reservations...');
  
  // Reserva confirmada
  const reservation1 = await prisma.reservation.create({
    data: {
      reservationNumber: 'RV2026000001',
      clientId: client1.id,
      vehicleId: veh5.id,
      vehicleGroupId: suv.id,
      pickupStationId: porto.id,
      returnStationId: porto.id,
      pickupDate: new Date('2026-03-01T10:00:00Z'),
      returnDate: new Date('2026-03-08T10:00:00Z'),
      status: 'CONFIRMED',
      dailyRate: 60.00,
      totalDays: 7,
      estimatedTotal: 490.00,
      depositPaid: 200.00,
      includeInsurance: true,
      insuranceCost: 70.00,
      additionalDrivers: 0,
      extras: JSON.stringify(['GPS', 'Cadeira de Bebé']),
      stationNotes: 'Cliente prefere SUV por viagem em família',
      createdById: staffPorto.id,
      confirmedAt: new Date(),
    },
  });

  // Reserva pendente
  const reservation2 = await prisma.reservation.create({
    data: {
      reservationNumber: 'RV2026000002',
      clientId: client2.id,
      vehicleGroupId: economico.id,
      pickupStationId: lisbon.id,
      returnStationId: lisbon.id,
      pickupDate: new Date('2026-02-25T14:00:00Z'),
      returnDate: new Date('2026-02-28T14:00:00Z'),
      status: 'PENDING',
      dailyRate: 25.00,
      totalDays: 3,
      estimatedTotal: 75.00,
      depositPaid: 0.00,
      includeInsurance: false,
      stationNotes: 'Reserva online aguardando confirmação\n[BROKER] Ref: BK-2026-12345',
      createdById: client2.id,
    },
  });

  // Reserva de broker
  const reservation3 = await prisma.reservation.create({
    data: {
      reservationNumber: 'RV2026000003',
      clientId: client1.id,
      vehicleGroupId: compacto.id,
      pickupStationId: faro.id,
      returnStationId: faro.id,
      pickupDate: new Date('2026-04-15T09:00:00Z'),
      returnDate: new Date('2026-04-22T09:00:00Z'),
      status: 'PENDING',
      dailyRate: 35.00,
      totalDays: 7,
      estimatedTotal: 315.00,
      depositPaid: 100.00,
      includeInsurance: true,
      insuranceCost: 70.00,
      stationNotes: 'Reserva via Booking.com\n[BROKER] Ref: BOOKING-789456123',
      createdById: client1.id,
    },
  });

  // 8. Create Contracts
  console.log('📝 Creating contracts...');
  
  // Contrato ativo sem upgrade
  const contract1 = await prisma.contract.create({
    data: {
      contractNumber: 'CT2026000001',
      clientId: client1.id,
      vehicleId: veh3.id,
      pickupStationId: lisbon.id,
      returnStationId: lisbon.id,
      pickupDate: new Date('2026-02-10T10:00:00Z'),
      plannedReturnDate: new Date('2026-02-17T10:00:00Z'),
      actualPickupDate: new Date('2026-02-10T10:30:00Z'),
      status: 'ACTIVE',
      kmOut: 20000,
      kmIncluded: 250 * 7,
      fuelLevelOut: 'Full',
      dailyRate: 35.00,
      totalDays: 7,
      subtotal: 245.00,
      insuranceCost: 0.00,
      extrasCost: 0.00,
      totalAmount: 245.00,
      depositAmount: 400.00,
      paidAmount: 100.00,
      balanceDue: 145.00,
      stationNotes: 'Cliente regular, sem problemas anteriores',
      createdById: staffLisboa.id,
    },
  });

  // Contrato com upgrade aprovado por admin
  const contract2 = await prisma.contract.create({
    data: {
      contractNumber: 'CT2026000002',
      reservationId: reservation1.id,
      clientId: client1.id,
      vehicleId: veh7.id, // BMW Premium (upgrade de SUV)
      originalVehicleGroupId: suv.id,
      upgradeApprovedBy: adminLisboa.id,
      upgradeReason: 'Cliente VIP, upgrade cortesia por fidelidade',
      upgradeApprovedAt: new Date(),
      upgradeCost: 0.00, // Upgrade gratuito
      pickupStationId: porto.id,
      returnStationId: porto.id,
      pickupDate: new Date('2026-03-01T10:00:00Z'),
      plannedReturnDate: new Date('2026-03-08T10:00:00Z'),
      status: 'DRAFT',
      kmOut: 5000,
      kmIncluded: 0, // Ilimitado no premium
      fuelLevelOut: 'Full',
      dailyRate: 120.00,
      totalDays: 7,
      subtotal: 840.00,
      insuranceCost: 70.00,
      extrasCost: 0.00,
      totalAmount: 910.00,
      depositAmount: 1500.00,
      depositReturned: false,
      paidAmount: 200.00,
      balanceDue: 710.00,
      clientNotes: 'Upgrade aprovado - Cliente VIP',
      stationNotes: 'Upgrade de SUV para Premium aprovado por gestor',
      createdById: staffPorto.id,
    },
  });

  // Contrato completado com danos
  const contract3 = await prisma.contract.create({
    data: {
      contractNumber: 'CT2026000003',
      clientId: client2.id,
      vehicleId: veh4.id,
      pickupStationId: porto.id,
      returnStationId: porto.id,
      pickupDate: new Date('2026-01-15T14:00:00Z'),
      plannedReturnDate: new Date('2026-01-20T14:00:00Z'),
      actualPickupDate: new Date('2026-01-15T14:15:00Z'),
      actualReturnDate: new Date('2026-01-20T13:45:00Z'),
      status: 'COMPLETED',
      kmOut: 34500,
      kmIn: 35250,
      kmIncluded: 250 * 5,
      extraKm: 0,
      extraKmCost: 0.00,
      fuelLevelOut: 'Full',
      fuelLevelIn: 'Full',
      fuelCharge: 0.00,
      dailyRate: 35.00,
      totalDays: 5,
      subtotal: 175.00,
      insuranceCost: 50.00,
      extrasCost: 0.00,
      damageCost: 150.00, // Amolgadela no pára-choques
      totalAmount: 375.00,
      depositAmount: 400.00,
      depositReturned: true,
      depositReturnedAt: new Date('2026-01-20T15:00:00Z'),
      paidAmount: 375.00,
      balanceDue: 0.00,
      damagesOut: JSON.stringify([]),
      damagesIn: JSON.stringify([
        {
          type: 'DENT',
          description: 'Amolgadela pequena no pára-choques traseiro',
          location: 'Pára-choques traseiro direito',
          cost: 150.00,
        },
      ]),
      damageOnReturn: 'Amolgadela pequena no pára-choques traseiro',
      stationNotes: 'Cliente responsável, pequeno dano reportado',
      completedAt: new Date('2026-01-20T15:00:00Z'),
      createdById: staffPorto.id,
    },
  });

  // 9. Create Additional Drivers
  console.log('👥 Creating additional drivers...');
  await prisma.additionalDriver.create({
    data: {
      contractId: contract1.id,
      driverId: client2.id,
      fullName: client2.fullName,
      email: client2.email,
      phone: client2.phone,
      cpf: client2.cpf,
      nif: client2.nif,
      dateOfBirth: client2.dateOfBirth!,
      licenseNumber: client2.licenseNumber!,
      licenseExpiry: client2.licenseExpiry!,
      licenseIssueDate: client2.licenseIssueDate!,
      licenseCountry: client2.licenseCountry!,
      idCardNumber: client2.idCardNumber!,
      idCardExpiry: client2.idCardExpiry!,
      address: client2.address,
      city: client2.city,
      postalCode: client2.postalCode,
      dailyCost: 5.00,
      totalCost: 35.00,
    },
  });

  // Condutor adicional sem conta no sistema
  await prisma.additionalDriver.create({
    data: {
      contractId: contract2.id,
      fullName: 'Ricardo Marques',
      email: 'ricardo@example.com',
      phone: '+351930000001',
      cpf: '99999999999',
      nif: '999999999',
      dateOfBirth: new Date('1992-07-20'),
      licenseNumber: 'L555555555',
      licenseExpiry: new Date('2028-07-20'),
      licenseIssueDate: new Date('2012-07-20'),
      licenseCountry: 'Portugal',
      idCardNumber: 'ID999999',
      idCardExpiry: new Date('2029-07-20'),
      address: 'Rua Condutor, 50',
      city: 'Lisboa',
      postalCode: '1200-050',
      dailyCost: 10.00,
      totalCost: 70.00,
      notes: 'Amigo do cliente principal',
    },
  });

  // 10. Create Payments
  console.log('💳 Creating payments...');
  
  // Pagamento de depósito
  await prisma.payment.create({
    data: {
      contractId: contract1.id,
      clientId: client1.id,
      amount: 100.00,
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      paymentType: 'Depósito Inicial',
      transactionId: 'TXN001',
      reference: 'REF001',
      processedBy: staffLisboa.email!,
      processedAt: new Date('2026-02-10T10:00:00Z'),
    },
  });

  // Pagamento parcial do contrato 2
  await prisma.payment.create({
    data: {
      contractId: contract2.id,
      clientId: client1.id,
      amount: 200.00,
      paymentMethod: 'MB_WAY',
      status: 'PAID',
      paymentType: 'Depósito Parcial',
      transactionId: 'TXN002',
      reference: 'REF002',
      processedBy: staffPorto.email!,
      processedAt: new Date(),
    },
  });

  // Pagamento total do contrato 3
  await prisma.payment.create({
    data: {
      contractId: contract3.id,
      clientId: client2.id,
      amount: 375.00,
      paymentMethod: 'DEBIT_CARD',
      status: 'PAID',
      paymentType: 'Pagamento Total',
      transactionId: 'TXN003',
      reference: 'REF003',
      notes: 'Inclui taxa de danos (€150)',
      processedBy: staffPorto.email!,
      processedAt: new Date('2026-01-20T14:00:00Z'),
    },
  });

  // 11. Create Maintenances
  console.log('🔧 Creating maintenances...');
  
  // Manutenção preventiva em curso
  await prisma.maintenance.create({
    data: {
      vehicleId: veh8.id,
      type: 'PREVENTIVE',
      status: 'IN_PROGRESS',
      scheduledDate: new Date('2026-02-14T09:00:00Z'),
      startedAt: new Date('2026-02-14T09:15:00Z'),
      description: 'Revisão dos 45.000 km',
      notes: 'Troca de óleo, filtros e verificação de travões',
      cost: 250.00,
      currentKm: 45000,
      nextServiceKm: 60000,
      provider: 'Oficina AutoServiço Lda',
      invoiceNumber: 'INV2026-001',
      performedBy: fleetFaro.fullName,
    },
  });

  // Manutenção corretiva agendada
  await prisma.maintenance.create({
    data: {
      vehicleId: veh4.id,
      type: 'CORRECTIVE',
      status: 'SCHEDULED',
      scheduledDate: new Date('2026-02-20T14:00:00Z'),
      description: 'Reparação de amolgadela no pára-choques',
      notes: 'Dano do contrato CT2026000003',
      cost: 150.00,
      currentKm: 35250,
      provider: 'Chaparia Porto',
      performedBy: staffPorto.fullName,
    },
  });

  // Inspeção completada
  await prisma.maintenance.create({
    data: {
      vehicleId: veh7.id,
      type: 'INSPECTION',
      status: 'COMPLETED',
      scheduledDate: new Date('2026-02-01T10:00:00Z'),
      startedAt: new Date('2026-02-01T10:00:00Z'),
      completedAt: new Date('2026-02-01T11:30:00Z'),
      description: 'Inspeção periódica obrigatória',
      notes: 'Veículo aprovado sem observações',
      cost: 50.00,
      currentKm: 5000,
      provider: 'Centro de Inspeções Automóveis',
      invoiceNumber: 'INV2026-002',
      performedBy: fleetFaro.fullName,
    },
  });

  // 12. Create Notifications
  console.log('🔔 Creating notifications...');
  
  // Notificação de reserva confirmada
  await prisma.notification.create({
    data: {
      userId: client1.id,
      type: 'RESERVATION_CONFIRMED',
      status: 'READ',
      title: 'Reserva Confirmada',
      message: 'A sua reserva RV2026000001 foi confirmada. Veículo: Nissan Qashqai.',
      entityType: 'Reservation',
      entityId: reservation1.id.toString(),
      actionUrl: '/reservations/RV2026000001',
      actionLabel: 'Ver Reserva',
      readAt: new Date(),
    },
  });

  // Notificação de upgrade aprovado
  await prisma.notification.create({
    data: {
      userId: staffPorto.id,
      type: 'VEHICLE_UPGRADE',
      status: 'UNREAD',
      title: 'Upgrade Aprovado',
      message: 'Upgrade do contrato CT2026000002 foi aprovado pelo gestor. Cliente recebeu BMW 320d.',
      entityType: 'Contract',
      entityId: contract2.id.toString(),
      actionUrl: '/contracts/CT2026000002',
      actionLabel: 'Ver Contrato',
    },
  });

  // Notificação de manutenção devida
  await prisma.notification.create({
    data: {
      userId: fleetFaro.id,
      type: 'MAINTENANCE_DUE',
      status: 'UNREAD',
      title: 'Manutenção Agendada',
      message: 'Veículo 77-HH-77 tem manutenção preventiva agendada para 20/02/2026.',
      entityType: 'Vehicle',
      entityId: veh8.id.toString(),
      actionUrl: '/vehicles/8/maintenance',
      actionLabel: 'Ver Veículo',
    },
  });

  // Notificação de pagamento recebido
  await prisma.notification.create({
    data: {
      userId: staffLisboa.id,
      type: 'PAYMENT_RECEIVED',
      status: 'READ',
      title: 'Pagamento Recebido',
      message: 'Pagamento de €100,00 recebido para o contrato CT2026000001.',
      entityType: 'Contract',
      entityId: contract1.id.toString(),
      actionUrl: '/contracts/CT2026000001/payments',
      actionLabel: 'Ver Pagamentos',
      readAt: new Date(),
    },
  });

  // 13. Create Activity Logs
  console.log('📋 Creating activity logs...');
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: adminLisboa.id,
        action: 'contract.upgrade.approved',
        entityType: 'Contract',
        entityId: contract2.id.toString(),
        details: JSON.stringify({
          contractNumber: 'CT2026000002',
          from: 'SUV',
          to: 'Premium',
          reason: 'Cliente VIP',
        }),
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: staffLisboa.id,
        action: 'contract.created',
        entityType: 'Contract',
        entityId: contract1.id.toString(),
        details: JSON.stringify({
          contractNumber: 'CT2026000001',
          clientName: client1.fullName,
          vehicle: '22-CC-22',
        }),
        ipAddress: '192.168.1.20',
        userAgent: 'Mozilla/5.0',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: itUser.id,
        action: 'user.blacklisted',
        entityType: 'User',
        entityId: clientBlacklisted.id.toString(),
        details: JSON.stringify({
          reason: 'Múltiplos danos não reportados e atrasos frequentes',
          blacklistedBy: adminLisboa.fullName,
        }),
        ipAddress: '192.168.1.5',
        userAgent: 'Mozilla/5.0',
      },
    }),
  ]);

  // 14. Create User Permissions
  console.log('🔐 Creating user permissions...');
  await Promise.all([
    prisma.userPermission.create({
      data: {
        userId: staffLisboa.id,
        permission: 'vehicle.upgrade.request',
        grantedBy: adminLisboa.id,
        isActive: true,
      },
    }),
    prisma.userPermission.create({
      data: {
        userId: adminLisboa.id,
        permission: 'vehicle.upgrade.approve',
        grantedBy: itUser.id,
        isActive: true,
      },
    }),
    prisma.userPermission.create({
      data: {
        userId: adminLisboa.id,
        permission: 'staff.move',
        grantedBy: itUser.id,
        isActive: true,
      },
    }),
    prisma.userPermission.create({
      data: {
        userId: adminLisboa.id,
        permission: 'user.blacklist',
        grantedBy: itUser.id,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Departments: 3`);
  console.log(`- Stations: 5 (3 active + 2 fictitious)`);
  console.log(`- Users: 8 (5 staff + 3 clients, 1 blacklisted)`);
  console.log(`- Vehicle Groups: 4`);
  console.log(`- Vehicles: 8`);
  console.log(`- Damage Types: 10`);
  console.log(`- Reservations: 3`);
  console.log(`- Contracts: 3 (1 active, 1 draft with upgrade, 1 completed)`);
  console.log(`- Additional Drivers: 2`);
  console.log(`- Payments: 3`);
  console.log(`- Maintenances: 3`);
  console.log(`- Notifications: 4`);
  console.log(`- Activity Logs: 3`);
  console.log(`- User Permissions: 4`);
  console.log('\n🔑 Test Credentials:');
  console.log('IT: it@fleetgate.pt / Password123!');
  console.log('Admin Lisboa: admin.lisboa@fleetgate.pt / Password123!');
  console.log('Staff Lisboa: staff.lisboa@fleetgate.pt / Password123!');
  console.log('Staff Porto: staff.porto@fleetgate.pt / Password123!');
  console.log('Fleet Faro: fleet.faro@fleetgate.pt / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
