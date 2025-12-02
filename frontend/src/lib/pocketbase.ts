import PocketBase from 'pocketbase';

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8092';

export function getPocketBase(): PocketBase {
  if (typeof window === 'undefined') {
    // Server-side: In Netlify Lambda/serverless, create instance with safe defaults
    // Note: Server-side PocketBase calls should be avoided in Lambda functions
    // This instance is created but should only be used for URL generation, not API calls
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);
    return pb;
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

export async function register(email: string, password: string, name: string, phone: string) {
  const pb = getPocketBase();
  const data: any = {
    email,
    password,
    passwordConfirm: password,
    name,
    phone,
    emailVisibility: true,
  };
  
  // Note: role field might be protected during public signup
  // PocketBase should use the default value ('customer') from the schema
  // If role needs to be set, it can be updated after creation by an admin
  // or we can try to include it and let PocketBase handle validation
  
  const record = await pb.collection('users').create(data);
  
  // Auto-login after registration
  try {
    await login(email, password);
  } catch (loginError) {
    // If auto-login fails, user can login manually
    console.warn('Auto-login after registration failed:', loginError);
  }
  
  return record;
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

