import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findRoles: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      assignRole: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
    service = mockService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = {
    user: { id: '1' },
    ip: '127.0.0.1',
    get: jest.fn(() => 'test-agent'),
  };

  describe('findAll', () => {
    it('should call service findAll', () => {
      service.findAll.mockReturnValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } } as any);
      const result = controller.findAll({} as any, mockReq as any);
      expect(result).toEqual({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findRoles', () => {
    it('should call service findRoles', () => {
      service.findRoles.mockReturnValue([] as any);
      expect(controller.findRoles()).toEqual([]);
      expect(service.findRoles).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should call service findOne', () => {
      service.findOne.mockReturnValue({ id: '1', email: 'test@test.com', displayName: 'Test', status: 'ACTIVE', roles: [], createdAt: new Date(), updatedAt: new Date() } as any);
      const result = controller.findOne('1', mockReq as any);
      expect(result).toBeDefined();
      expect(service.findOne).toHaveBeenCalledWith('1', '1', expect.any(String), expect.any(String));
    });
  });

  describe('create', () => {
    it('should call service create', () => {
      service.create.mockReturnValue({ id: '1', email: 'test@test.com', displayName: 'Test', status: 'ACTIVE', roles: [], createdAt: new Date(), updatedAt: new Date() } as any);
      const dto = { email: 'test@test.com', password: 'SecurePass123!', displayName: 'Test', role: 'STAFF' } as any;
      const result = controller.create(dto, mockReq as any);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto, '1', expect.any(String), expect.any(String));
    });
  });

  describe('update', () => {
    it('should call service update', () => {
      service.update.mockReturnValue({ id: '1', email: 'test@test.com', displayName: 'Test', status: 'ACTIVE', roles: [], createdAt: new Date(), updatedAt: new Date() } as any);
      const dto = { displayName: 'Updated' } as any;
      const result = controller.update('1', dto, mockReq as any);
      expect(result).toBeDefined();
      expect(service.update).toHaveBeenCalledWith('1', dto, '1', expect.any(String), expect.any(String));
    });
  });

  describe('softDelete', () => {
    it('should call service softDelete', () => {
      service.softDelete.mockReturnValue({ message: 'User deleted successfully.' } as any);
      const result = controller.remove('1', mockReq as any);
      expect(result).toEqual({ message: 'User deleted successfully.' });
      expect(service.softDelete).toHaveBeenCalledWith('1', '1', expect.any(String), expect.any(String));
    });
  });

  describe('assignRole', () => {
    it('should call service assignRole', () => {
      service.assignRole.mockReturnValue({ id: '1', email: 'test@test.com', displayName: 'Test', status: 'ACTIVE', roles: [], createdAt: new Date(), updatedAt: new Date() } as any);
      const dto = { role: 'ADMINISTRATOR' } as any;
      const result = controller.assignRole('1', dto, mockReq as any);
      expect(result).toBeDefined();
      expect(service.assignRole).toHaveBeenCalledWith('1', 'ADMINISTRATOR', '1', expect.any(String), expect.any(String));
    });
  });
});
