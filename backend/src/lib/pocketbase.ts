import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

declare global {
  // eslint-disable-next-line no-var
  var __ravePocketBaseClient: PocketBase | null | undefined;
}

const globalWithPocketBase = globalThis as typeof globalThis & {
  __ravePocketBaseClient?: PocketBase | null;
};

let pb: PocketBase | null = globalWithPocketBase.__ravePocketBaseClient ?? null;

async function authenticateAsAdmin(instance: PocketBase): Promise<void> {
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('PocketBase admin credentials are not configured. Some operations may fail.');
    return;
  }

  try {
    await instance.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✓ Authenticated as PocketBase admin');
  } catch (error) {
    console.error('Failed to authenticate as admin:', error);
    throw error;
  }
}

export async function initializePocketBase(): Promise<PocketBase> {
  if (pb) {
    return pb;
  }

  const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
  const instance = new PocketBase(url);

  // Disable auto-cancellation to prevent autocancelled errors
  instance.autoCancellation(false);

  await authenticateAsAdmin(instance);

  pb = instance;
  globalWithPocketBase.__ravePocketBaseClient = instance;
  return instance;
}

export function getPocketBase(): PocketBase {
  if (!pb) {
    throw new Error('PocketBase not initialized. Call initializePocketBase() first.');
  }
  return pb;
}

export function createUserClient(token: string): PocketBase {
  const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
  const client = new PocketBase(url);

  // Disable auto-cancellation to prevent autocancelled errors
  client.autoCancellation(false);

  client.authStore.save(token, null);
  return client;
}

