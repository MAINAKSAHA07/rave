import PocketBase from 'pocketbase';

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8092';

export function getPocketBase(): PocketBase {
  if (typeof window === 'undefined') {
    // Server-side: create new instance
    return new PocketBase(pbUrl);
  }

  // Client-side: use singleton
  if (!(window as any).__pocketbase) {
    const pb = new PocketBase(pbUrl);
    // Disable auto-cancellation globally to prevent autocancelled errors
    // This is safer for React apps where useEffect might trigger multiple times
    pb.autoCancellation(false);
    (window as any).__pocketbase = pb;
  }
  return (window as any).__pocketbase;
}

export async function login(email: string, password: string) {
  const pb = getPocketBase();
  const authData = await pb.collection('users').authWithPassword(email, password);
  return authData;
}

export function logout() {
  const pb = getPocketBase();
  pb.authStore.clear();
}

export function isAuthenticated(): boolean {
  const pb = getPocketBase();
  return pb.authStore.isValid;
}

export function getCurrentUser() {
  const pb = getPocketBase();
  return pb.authStore.model;
}
