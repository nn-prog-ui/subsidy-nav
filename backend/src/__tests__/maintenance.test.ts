// Prisma と cache をモックして maintenance ロジックを検証
const mockUpdateMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    subsidy: { updateMany: mockUpdateMany },
  })),
}));
jest.mock('../middleware/cache', () => ({ invalidateCache: jest.fn() }));

import { closeExpiredSubsidies, activateUpcomingSubsidies } from '../services/maintenance';
import { invalidateCache } from '../middleware/cache';

describe('maintenance', () => {
  beforeEach(() => {
    mockUpdateMany.mockReset();
    (invalidateCache as jest.Mock).mockReset();
  });

  it('closeExpiredSubsidies: 締切超過のactiveをclosedにする', async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });
    const now = new Date('2026-06-10T00:00:00Z');
    const n = await closeExpiredSubsidies(now);
    expect(n).toBe(3);
    const arg = mockUpdateMany.mock.calls[0][0];
    expect(arg.where.status).toBe('active');
    expect(arg.where.applicationEnd.lt).toEqual(now);
    expect(arg.data.status).toBe('closed');
    expect(invalidateCache).toHaveBeenCalledWith('/api/subsidies');
  });

  it('更新0件のときはキャッシュ無効化しない', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const n = await closeExpiredSubsidies(new Date());
    expect(n).toBe(0);
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it('activateUpcomingSubsidies: 開始到来のupcomingをactiveにする', async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });
    const now = new Date('2026-06-10T00:00:00Z');
    const n = await activateUpcomingSubsidies(now);
    expect(n).toBe(2);
    const arg = mockUpdateMany.mock.calls[0][0];
    expect(arg.where.status).toBe('upcoming');
    expect(arg.data.status).toBe('active');
  });
});
