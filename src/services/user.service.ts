import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { CreateUserPayload, NewUser, PublicUser, User } from '../models/user.model';
import { authService } from './auth.service';

export const userService = {
  // User Add
  createUser: async (userData: CreateUserPayload): Promise<PublicUser> => {
    const passwordHash = await authService.hashPassword(userData.password);
    const newUserValues: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'> = {
      username: userData.username,
      email: userData.email,
      passwordHash: passwordHash,
    };
    try {
      const result = await db.insert(users).values(newUserValues).returning({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
      if (!result || result.length === 0) {
        throw new Error('User creation failed, no data returned.');
      }
      return result[0];
    } catch (error: any) {
      console.error('Error during user creation:', error);
      if (error.message && error.message.toLowerCase().includes('unique constraint failed')) {
        if (error.message.includes('users.username')) {
          throw new Error('Username already exists.');
        } else if (error.message.includes('users.email')) {
          throw new Error('Email already exists.');
        }
        throw new Error('Username or email already exists.');
      }
      throw new Error('User creation failed due to a database error.');
    }
  },

  // Find User By Username
  findUserByUsername: async (username: string): Promise<User | null> => {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result.length > 0 ? result[0] : null;
  },

  // Find User By Email
  findUserByEmail: async (email: string): Promise<User | null> => {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result.length > 0 ? result[0] : null;
  },

  // Find User By ID
  findUserById: async (userId: string): Promise<PublicUser | null> => {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length) {
      const { passwordHash, ...publicUser } = user[0];
      return publicUser;
    }
    return null;
  },

  // Change Password
  changePassword: async (userId: string, oldPasswordPlain: string, newPasswordPlain: string): Promise<boolean> => {
    const userArray = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userArray.length) {
      throw new Error('User not found.');
    }
    const user = userArray[0];
    const isOldPasswordValid = await authService.comparePassword(oldPasswordPlain, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new Error('Invalid old password.');
    }
    const newPasswordHash = await authService.hashPassword(newPasswordPlain);
    await db.update(users).set({ passwordHash: newPasswordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  },
};
