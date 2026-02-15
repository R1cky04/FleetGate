import { SystemConfigService } from './system-config.service';
import { UserRole } from '../../generated/prisma';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    },
  };
});

const fs = require('fs').promises;

describe('SystemConfigService (unit)', () => {
  const itUser = { id: 1, role: UserRole.IT };
  let prisma: any;
  let service: SystemConfigService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(itUser),
      },
      systemConfig: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    service = new SystemConfigService(prisma);
    jest.clearAllMocks();
  });

  it('returns file config and syncs to DB when DB is empty', async () => {
    const fileConfig = { version: '1.0.0', lastUpdated: '2026-02-14T10:00:00Z' };

    prisma.systemConfig.findFirst.mockResolvedValue(null);
    fs.readFile.mockResolvedValue(JSON.stringify(fileConfig));

    const result = await service.getConfig(itUser.id);

    expect(result).toEqual(fileConfig);
    expect(prisma.systemConfig.create).toHaveBeenCalled();
  });

  it('returns DB config and updates file when DB is newer', async () => {
    const fileConfig = { version: '1.0.0', lastUpdated: '2026-02-14T10:00:00Z' };
    const dbConfig = { version: '2.0.0', lastUpdated: '2026-02-14T12:00:00Z' };

    fs.readFile.mockResolvedValue(JSON.stringify(fileConfig));
    prisma.systemConfig.findFirst.mockResolvedValue({
      id: 'cfg-1',
      configJson: JSON.stringify(dbConfig),
    });

    const result = await service.getConfig(itUser.id);

    expect(result).toEqual(dbConfig);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('updates config and syncs file + DB', async () => {
    const updated = await service.updateConfig(itUser.id, { version: '3.0.0' });

    expect(updated.version).toBe('3.0.0');
    expect(fs.writeFile).toHaveBeenCalled();
    expect(prisma.systemConfig.create).toHaveBeenCalled();
  });
});
