import { TEST_AUTH } from './constants.js';
import { isAddress } from 'ethers';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Request as ExpressRequest } from 'express';

export async function getUserFromToken(req: any) {
  const [bearer, token] = ((req.headers['authorization'] || req.headers['Authorization'] || '') as string).split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  try {
    return await auth(token);
  } catch {
    return null;
  }
}

export async function auth(token: string): Promise<UserInfo> {
  return getTokenUserInfo(token);
}

export async function getTokenUserInfo(token: string): Promise<UserInfo> {
  if (TEST_AUTH && isAddress(token)) {
    return { name: 'test' + token.slice(-4), ethAddress: token.toLowerCase(), id: '1', token };
  }
  throw new Error('Invalid token');
}

export type UserInfo = {
  name: string;
  ethAddress: string;
  id: string;
  token?: string;
};

export interface RequestContext {
  req: ExpressRequest;
  user?: UserInfo;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();
