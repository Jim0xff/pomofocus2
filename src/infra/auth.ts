import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request as ExpressRequest } from 'express';
import { ADMIN_AUTH_TOKEN } from './constants.js';

export type UserInfo = {
  id: string;
  role: 'admin';
};

export interface RequestContext {
  req: ExpressRequest;
  user?: UserInfo | null;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export async function auth(token: string): Promise<UserInfo | null> {
  if (token !== ADMIN_AUTH_TOKEN) {
    return null;
  }

  return {
    id: 'admin',
    role: 'admin',
  };
}
