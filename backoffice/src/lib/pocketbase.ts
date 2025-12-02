import PocketBase from 'pocketbase';

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8092';
const useApiProxy = typeof window !== 'undefined'; // Use API proxy on client-side

// Client-side PocketBase instance that uses API proxy
class ProxyPocketBase {
  private token: string | null = null;
  private user: any = null;
  private onChangeCallbacks: Set<(token: string, model: any) => void> = new Set();

  constructor() {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pocketbase_auth');
      if (stored) {
        try {
          const { token, user } = JSON.parse(stored);
          this.token = token;
          this.user = user;
        } catch (e) {
          // Invalid stored data
        }
      }
    }
  }

  get authStore() {
    return {
      token: this.token,
      model: this.user,
      isValid: !!this.token && !!this.user,
      save: (token: string, user: any) => {
        this.token = token;
        this.user = user;
        if (typeof window !== 'undefined') {
          localStorage.setItem('pocketbase_auth', JSON.stringify({ token, user }));
        }
        // Call all onChange callbacks
        this.onChangeCallbacks.forEach(callback => {
          try {
            callback(token, user);
          } catch (e) {
            console.error('Error in authStore.onChange callback:', e);
          }
        });
      },
      clear: () => {
        this.token = null;
        this.user = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pocketbase_auth');
        }
        // Call all onChange callbacks
        this.onChangeCallbacks.forEach(callback => {
          try {
            callback('', null);
          } catch (e) {
            console.error('Error in authStore.onChange callback:', e);
          }
        });
      },
      onChange: (callback: (token: string, model: any) => void) => {
        // Add callback to set
        this.onChangeCallbacks.add(callback);
        // Return unsubscribe function
        return () => {
          this.onChangeCallbacks.delete(callback);
        };
      },
    };
  }

  collection(name: string) {
    return {
      getList: async (page = 1, perPage = 20, options: any = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          perPage: perPage.toString(),
          ...(options.filter && { filter: options.filter }),
          ...(options.sort && { sort: options.sort }),
          ...(options.expand && { expand: options.expand }),
        });
        
        const response = await fetch(`/api/pocketbase/api/collections/${name}?${params}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }
        
        return response.json();
      },
      getFullList: async (options: any = {}) => {
        // Get all items by making multiple requests if needed
        const params = new URLSearchParams({
          perPage: '500',
          ...(options.filter && { filter: options.filter }),
          ...(options.sort && { sort: options.sort }),
          ...(options.expand && { expand: options.expand }),
        });
        
        const response = await fetch(`/api/pocketbase/api/collections/${name}?${params}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }
        
        const data = await response.json();
        return data.items || [];
      },
      getOne: async (id: string, options: any = {}) => {
        const params = new URLSearchParams(
          options.expand ? { expand: options.expand } : {}
        );
        
        const response = await fetch(`/api/pocketbase/api/collections/${name}/records/${id}?${params}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }
        
        return response.json();
      },
      create: async (data: any) => {
        const response = await fetch(`/api/pocketbase/api/collections/${name}/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }
        
        return response.json();
      },
      update: async (id: string, data: any) => {
        const response = await fetch(`/api/pocketbase/api/collections/${name}/records/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }
        
        return response.json();
      },
      delete: async (id: string) => {
        const response = await fetch(`/api/pocketbase/api/collections/${name}/records/${id}`, {
          method: 'DELETE',
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }
        
        return response.ok;
      },
      authWithPassword: async (email: string, password: string) => {
        const response = await fetch('/api/pocketbase/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        }
        
        const data = await response.json();
        this.authStore.save(data.token, data.record);
        return { token: data.token, record: data.record };
      },
    };
  }
}

export function getPocketBase(): any {
  if (typeof window === 'undefined') {
    // Server-side: Use direct PocketBase connection
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);
    return pb;
  }

  // Client-side: Use API proxy to avoid Mixed Content issues
  if (!(window as any).__pocketbase) {
    (window as any).__pocketbase = new ProxyPocketBase();
  }
  return (window as any).__pocketbase;
}

export async function login(email: string, password: string) {
  if (useApiProxy) {
    const pb = getPocketBase();
    return await pb.collection('users').authWithPassword(email, password);
  } else {
    const pb = getPocketBase();
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData;
  }
}

export async function register(email: string, password: string, name: string, phone: string) {
  if (useApiProxy) {
    const response = await fetch('/api/pocketbase/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phone }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    const data = await response.json();
    const pb = getPocketBase();
    if (data.token) {
      pb.authStore.save(data.token, data.record);
    }
    return data.record;
  } else {
    const pb = getPocketBase();
    const data: any = {
      email,
      password,
      passwordConfirm: password,
      name,
      phone,
      emailVisibility: true,
    };
    
    const record = await pb.collection('users').create(data);
    
    try {
      await login(email, password);
    } catch (loginError) {
      console.warn('Auto-login after registration failed:', loginError);
    }
    
    return record;
  }
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

