/**
 * 用户相关Mock数据
 * 支持企业级用户管理测试
 */

import { User, UserStatus } from '@platform/types';
import { faker } from '@faker-js/faker';

export const mockUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  username: faker.internet.userName(),
  passwordHash: '$2b$12$mockhashedpassword',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: faker.phone.number(),
  avatar: faker.image.avatar(),
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  lastLoginAt: faker.date.recent(),
  passwordChangedAt: faker.date.recent(),
  failedLoginAttempts: 0,
  lockedUntil: null,
  preferences: {
    timezone: 'UTC',
    locale: 'en',
    theme: 'light',
    notifications: {
      email: true,
      sms: false,
      push: true,
      marketing: false,
    },
  },
  metadata: {},
  tenantId: faker.string.uuid(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  deletedAt: null,
  createdBy: faker.string.uuid(),
  updatedBy: faker.string.uuid(),
  deletedBy: null,
  ...overrides,
});

export const mockUsers = (count: number = 10): User[] => {
  return Array.from({ length: count }, () => mockUser());
};

export const mockActiveUser = (): User => mockUser({ status: UserStatus.ACTIVE });
export const mockInactiveUser = (): User => mockUser({ status: UserStatus.INACTIVE });
export const mockSuspendedUser = (): User => mockUser({ status: UserStatus.SUSPENDED });

export const mockUserWithRole = (roleId: string): User => 
  mockUser({ 
    metadata: { roles: [roleId] }
  });

export const mockAdminUser = (): User => 
  mockUser({ 
    email: 'admin@example.com',
    username: 'admin',
    metadata: { roles: ['admin'] }
  });

export const mockTestUser = (): User => 
  mockUser({
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
  });