import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { users } from '../db/schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type PublicUser = Omit<User, 'passwordHash'>;
export type CreateUserPayload = Omit<NewUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & {
  password: string;
};
