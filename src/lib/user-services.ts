import { User } from '@/lib/types';

// Mock user data - in production this would come from database
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    fullName: 'مدير النظام',
    email: 'admin@etiopathic.com',
    role: 'admin',
    isActive: true,
    lastActive: new Date().toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '2',
    username: 'manager1',
    fullName: 'أحمد محمد',
    email: 'ahmed@etiopathic.com',
    role: 'manager',
    isActive: true,
    lastActive: new Date().toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '3',
    username: 'rep1',
    fullName: 'محمد عبدالله',
    email: 'mohamed@etiopathic.com',
    role: 'representative',
    isActive: true,
    lastActive: new Date().toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
  }
];

export async function getUsers(): Promise<User[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockUsers;
}

export async function getUserById(id: string): Promise<User | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockUsers.find(user => user.id === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockUsers.find(user => user.username === username) || null;
}

export async function createUser(userData: Partial<User>): Promise<User> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const newUser: User = {
    id: Math.random().toString(36).substring(7),
    username: userData.username || '',
    fullName: userData.fullName || '',
    email: userData.email || '',
    role: userData.role || 'representative',
    isActive: userData.isActive ?? true,
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...userData
  };
  
  mockUsers.push(newUser);
  return newUser;
}

export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const userIndex = mockUsers.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...userData,
  };
  
  return mockUsers[userIndex];
}

export async function deleteUser(id: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const userIndex = mockUsers.findIndex(user => user.id === id);
  if (userIndex === -1) return false;
  
  mockUsers.splice(userIndex, 1);
  return true;
}