import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

jest.setTimeout(30000);

describe('Full system (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const testTag = `TST${Date.now()}`;
  const emailSuffix = `${testTag.toLowerCase()}@example.com`;
  const itEmail = `it-${emailSuffix}`;
  const itUserCode = `IT${Date.now()}`;
  const itPassword = 'Password123!';

  let testStationId: string;
  let destinationStationId: string;
  let lisbonStationId: string;
  let testGroupId: string;
  let testVehicleId: number;
  let transferVehicleId: number;
  let testClientId: number;
  let testStaffId: number;
  let reservationId: number;
  let contractId: number;
  let paymentId: string;
  let transferId: string;
  let itUserId: number;
  let authToken: string;

  let originalConfig: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    jwtService = moduleFixture.get(JwtService);

    const hashedPassword = await bcrypt.hash(itPassword, 10);
    const itUser = await prisma.user.create({
      data: {
        userCode: itUserCode,
        role: 'IT',
        status: 'ACTIVE',
        firstName: 'Test',
        lastName: 'IT',
        fullName: `Test IT ${testTag}`,
        email: itEmail,
        password: hashedPassword,
        phone: '+351910000111',
        acceptedTerms: true,
      },
    });
    itUserId = itUser.id;

    authToken = jwtService.sign({
      sub: itUser.id,
      userCode: itUser.userCode,
      email: itUser.email,
      role: itUser.role,
      stationId: itUser.stationId,
    });

    const lisbon = await prisma.station.findUnique({ where: { code: 'LISAL' } });
    lisbonStationId = lisbon?.id || '';

    const station = await prisma.station.create({
      data: {
        code: `ST${testTag}`,
        name: `Test Station ${testTag}`,
        email: `station-${emailSuffix}`,
        phone: '+351210000999',
        address: 'Test Address',
        city: 'Lisbon',
        postalCode: '1000-000',
        country: 'Portugal',
        isActive: true,
        isPickupPoint: true,
        isReturnPoint: true,
      },
    });
    testStationId = station.id;

    const destinationStation = await prisma.station.create({
      data: {
        code: `DST${testTag}`,
        name: `Destination Station ${testTag}`,
        email: `dest-${emailSuffix}`,
        phone: '+351210000997',
        address: 'Destination Address',
        city: 'Lisbon',
        postalCode: '1000-001',
        country: 'Portugal',
        isActive: true,
        isPickupPoint: true,
        isReturnPoint: true,
      },
    });
    destinationStationId = destinationStation.id;

    const group = await prisma.vehicleGroup.create({
      data: {
        code: `GRP${testTag}`,
        name: `Group ${testTag}`,
        description: 'Test group',
        category: 'Test',
        seats: 5,
        doors: 4,
        transmission: 'Manual',
        fuelType: 'Gasoline',
        airConditioning: true,
        dailyRate: 50.0,
        weeklyRate: 300.0,
        monthlyRate: 1000.0,
        depositAmount: 200.0,
        kmIncluded: 0,
        extraKmCost: 0.25,
        minRentalDays: 1,
        maxRentalDays: 365,
        minDriverAge: 21,
        minLicenseYears: 1,
        isActive: true,
      },
    });
    testGroupId = group.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        groupId: testGroupId,
        stationId: testStationId,
        licensePlate: `ZZ-${testTag}`,
        vin: `VIN-${testTag}`,
        make: 'Test',
        model: 'Car',
        year: 2024,
        color: 'White',
        status: 'AVAILABLE',
        currentKm: 1000,
        lastServiceKm: 500,
      },
    });
    testVehicleId = vehicle.id;

    const transferVehicle = await prisma.vehicle.create({
      data: {
        groupId: testGroupId,
        stationId: testStationId,
        licensePlate: `TR-${testTag}`,
        vin: `VIN-TR-${testTag}`,
        make: 'Test',
        model: 'Transfer',
        year: 2024,
        color: 'Black',
        status: 'AVAILABLE',
        currentKm: 2000,
        lastServiceKm: 1500,
      },
    });
    transferVehicleId = transferVehicle.id;

    const client = await prisma.user.create({
      data: {
        userCode: `CL${Date.now()}`,
        role: 'CLIENT',
        status: 'ACTIVE',
        customerType: 'COMPANY',
        companyName: `Company ${testTag}`,
        companyTaxId: `PT${testTag}`,
        firstName: 'Test',
        lastName: 'Client',
        fullName: `Test Client ${testTag}`,
        email: `client-${emailSuffix}`,
        phone: '+351910000999',
        nif: `9${Math.floor(Math.random() * 1e8)}`,
        cpf: `9${Math.floor(Math.random() * 1e8)}`,
      },
    });
    testClientId = client.id;

    const staff = await prisma.user.create({
      data: {
        userCode: `STF${Date.now()}`,
        role: 'STAFF',
        status: 'ACTIVE',
        firstName: 'Test',
        lastName: 'Staff',
        fullName: `Test Staff ${testTag}`,
        email: `staff-${emailSuffix}`,
        phone: '+351910000998',
        stationId: testStationId,
      },
    });
    testStaffId = staff.id;
  });

  afterAll(async () => {
    if (transferId) {
      await prisma.vehicleTransfer.delete({ where: { id: transferId } });
    }
    if (contractId) {
      await prisma.contract.delete({ where: { id: contractId } });
    }
    if (reservationId) {
      await prisma.reservation.delete({ where: { id: reservationId } });
    }

    await prisma.reservation.deleteMany({
      where: {
        OR: [
          { createdById: itUserId },
          { clientId: testClientId },
        ],
      },
    });

    await prisma.vehicle.deleteMany({ where: { id: { in: [testVehicleId, transferVehicleId] } } });
    await prisma.vehicleGroup.delete({ where: { id: testGroupId } });
    await prisma.user.deleteMany({
      where: { id: { in: [testClientId, testStaffId, itUserId] } },
    });
    await prisma.station.delete({ where: { id: testStationId } });
    await prisma.station.delete({ where: { id: destinationStationId } });

    await prisma.$disconnect();
    await app.close();
  });

  it('reads and updates system config with sync', async () => {
    const getRes = await request(app.getHttpServer())
      .get('/system-config')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    originalConfig = getRes.body;

    const updatedConfig = {
      ...originalConfig,
      version: `${originalConfig.version}-test`,
    };

    const updateRes = await request(app.getHttpServer())
      .put('/system-config')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedConfig)
      .expect(200);

    expect(updateRes.body.version).toBe(`${originalConfig.version}-test`);

    await request(app.getHttpServer())
      .put('/system-config')
      .set('Authorization', `Bearer ${authToken}`)
      .send(originalConfig)
      .expect(200);
  });

  it('rejects invalid system config updates', async () => {
    const invalidConfig = {
      ...originalConfig,
    };

    delete invalidConfig.version;

    await request(app.getHttpServer())
      .put('/system-config')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidConfig)
      .expect(400);
  });

  it('rejects reservation with insurance cost below default', async () => {
    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: testClientId,
        vehicleGroupId: testGroupId,
        pickupStationId: testStationId,
        returnStationId: testStationId,
        pickupDate: '2026-03-18T10:00:00Z',
        returnDate: '2026-03-19T10:00:00Z',
        dailyRate: 50.0,
        totalDays: 1,
        estimatedTotal: 50.0,
        includeInsurance: true,
        insuranceType: 'BASIC',
        insuranceCost: 5.0,
      })
      .expect(400);
  });

  it('rejects reservation with invalid insurance type', async () => {
    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: testClientId,
        vehicleGroupId: testGroupId,
        pickupStationId: testStationId,
        returnStationId: testStationId,
        pickupDate: '2026-03-21T10:00:00Z',
        returnDate: '2026-03-22T10:00:00Z',
        dailyRate: 50.0,
        totalDays: 1,
        estimatedTotal: 50.0,
        includeInsurance: true,
        insuranceType: 'INVALID',
        insuranceCost: 20.0,
      })
      .expect(400);
  });

  it('rejects reservation with deposit below minimum', async () => {
    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: testClientId,
        vehicleGroupId: testGroupId,
        pickupStationId: testStationId,
        returnStationId: testStationId,
        pickupDate: '2026-03-19T10:00:00Z',
        returnDate: '2026-03-20T10:00:00Z',
        dailyRate: 50.0,
        totalDays: 1,
        estimatedTotal: 50.0,
        depositPaid: 10.0,
      })
      .expect(400);
  });

  it('creates reservation with VAT breakdown and allows search filters', async () => {
    const createReservation = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: testClientId,
        vehicleGroupId: testGroupId,
        pickupStationId: testStationId,
        returnStationId: testStationId,
        pickupDate: '2026-03-10T10:00:00Z',
        returnDate: '2026-03-12T10:00:00Z',
        dailyRate: 50.0,
        totalDays: 2,
        estimatedTotal: 100.0,
        depositPaid: 150.0,
        includeInsurance: true,
        insuranceType: 'BASIC',
        insuranceCost: 40.0,
        additionalDrivers: 1,
        additionalDriverCost: 10.0,
        extras: ['GPS'],
        clientNotes: 'Client note',
        stationNotes: 'Station note',
      })
      .expect(201);

    reservationId = createReservation.body.id;
    expect(createReservation.body.vehicleAmount).toBeDefined();
    expect(createReservation.body.taxRate).toBeDefined();

    const searchRes = await request(app.getHttpServer())
      .get(`/reservations?search=${createReservation.body.reservationNumber}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(searchRes.body.data.length).toBeGreaterThan(0);
  });

  it('rejects child seat reservation when stock exceeded at LISAL', async () => {
    if (!lisbonStationId) {
      return;
    }

    const extras = Array.from({ length: 25 }).map(() => 'CHILD_SEAT');

    await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: testClientId,
        vehicleGroupId: testGroupId,
        pickupStationId: lisbonStationId,
        returnStationId: lisbonStationId,
        pickupDate: '2026-03-15T10:00:00Z',
        returnDate: '2026-03-16T10:00:00Z',
        dailyRate: 50.0,
        totalDays: 1,
        estimatedTotal: 50.0,
        extras,
      })
      .expect(400);
  });

  it('creates contract from reservation, pre-closes, pays, and completes with damage calculation', async () => {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });

    const createContract = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reservationId,
        clientId: testClientId,
        vehicleId: testVehicleId,
        pickupStationId: testStationId,
        returnStationId: testStationId,
        pickupDate: reservation?.pickupDate.toISOString(),
        plannedReturnDate: reservation?.returnDate.toISOString(),
        kmOut: 1000,
        fuelLevelOut: 'Full',
        dailyRate: 50.0,
        totalDays: 2,
        subtotal: 100.0,
        insuranceCost: 40.0,
        insuranceType: 'BASIC',
        extrasCost: 5.0,
        totalAmount: 145.0,
        depositAmount: 100.0,
        kmIncluded: 0,
        extraKmCost: 0.0,
        extras: ['GPS'],
        damagesOut: [
          {
            area: 'front-bumper',
            x: 0.4,
            y: 0.2,
            damageType: 'Arranhões Pequenos',
            notes: 'Checkout scratch',
          },
        ],
        clientNotes: 'Client note',
        stationNotes: 'Station note',
        termsSignature: 'terms-signed',
        termsAcceptedAt: new Date().toISOString(),
      })
      .expect(201);

    contractId = createContract.body.id;
    expect(createContract.body.extrasAmount).toBeDefined();

    await request(app.getHttpServer())
      .post(`/contracts/${contractId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const completeRes = await request(app.getHttpServer())
      .post(`/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        actualReturnDate: '2026-03-12T10:00:00Z',
        kmIn: 1100,
        fuelLevelIn: 'Full',
        closeClientSignature: 'close-client',
        closeStaffSignature: 'close-staff',
        confirmPaymentReceived: true,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/contracts/${contractId}/pre-close`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        damageOnReturn: 'Minor scratch',
        damagesIn: [
          {
            area: 'left-door',
            x: 0.25,
            y: 0.5,
            damageType: 'Arranhões Pequenos',
            notes: 'Return scratch',
          },
        ],
        preCloseClientSignature: 'preclose-client',
        preCloseStaffSignature: 'preclose-staff',
        stationNotes: 'Pre-close inspection',
      })
      .expect(201);

    const createPayment = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        contractId,
        amount: 45,
        paymentMethod: 'CASH',
        paymentType: 'FINAL',
        notes: 'Final payment',
      })
      .expect(201);

    paymentId = createPayment.body.id;

    await request(app.getHttpServer())
      .post(`/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        actualReturnDate: '2026-03-12T10:00:00Z',
        kmIn: 1100,
        fuelLevelIn: 'Full',
        damagesIn: [
          {
            area: 'left-door',
            x: 0.25,
            y: 0.5,
            damageType: 'Arranhões Pequenos',
            notes: 'Return scratch',
          },
        ],
        closeClientSignature: 'close-client',
        closeStaffSignature: 'close-staff',
        confirmPaymentReceived: true,
      })
      .expect(201);

    const completedContract = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(completedContract.body.damageCost).toBeGreaterThan(0);

    const refundRes = await request(app.getHttpServer())
      .post(`/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 45,
        reason: 'Adjustment',
      })
      .expect(201);

    expect(refundRes.body.status).toBe('REFUNDED');

    const searchContracts = await request(app.getHttpServer())
      .get(`/contracts?search=${createContract.body.contractNumber}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(searchContracts.body.data.length).toBeGreaterThan(0);
  });

  it('creates and searches vehicle transfers', async () => {
    const createTransfer = await request(app.getHttpServer())
      .post('/vehicle-transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vehicleId: transferVehicleId,
        fromStationId: testStationId,
        toStationId: lisbonStationId || destinationStationId,
        driverId: testStaffId,
        scheduledDate: '2026-03-20T10:00:00Z',
        reason: 'Fleet balancing',
        stationNotes: 'Move to LIS',
      })
      .expect(201);

    transferId = createTransfer.body.id;

    const searchTransfers = await request(app.getHttpServer())
      .get(`/vehicle-transfers?search=${createTransfer.body.transferNumber}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(searchTransfers.body.data.length).toBeGreaterThan(0);
  });

  it('filters users by company and customer type', async () => {
    const usersByCompany = await request(app.getHttpServer())
      .get(`/users?companyName=${encodeURIComponent(`Company ${testTag}`)}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(usersByCompany.body.length).toBeGreaterThan(0);

    const usersByType = await request(app.getHttpServer())
      .get('/users?customerType=COMPANY')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(usersByType.body.length).toBeGreaterThan(0);
  });
});
