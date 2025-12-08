// Developed by mainak saha
import PocketBase from 'pocketbase';

function getPocketBaseUrl(): string {
  // Read dynamically each time to ensure Next.js env vars are available
  // Priority: AWS_POCKETBASE_URL (for production/AWS) > POCKETBASE_URL (for local/other) > NEXT_PUBLIC_POCKETBASE_URL > localhost default
  // This allows the same code to work in both local and AWS environments
  
  // Check for AWS URL first (for AWS deployments)
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
  }
  
  // Auto-detect AWS URL from NEXT_PUBLIC_POCKETBASE_URL if it contains AWS server IP
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL && process.env.NEXT_PUBLIC_POCKETBASE_URL.includes('13.201.90.240')) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL;
  }
  
  // Check for explicit POCKETBASE_URL (for local or custom setups)
  if (process.env.POCKETBASE_URL) {
    return process.env.POCKETBASE_URL;
  }
  
  // Check for public URL (client-side accessible)
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL;
  }
  
  // Default to localhost for local development
  return 'http://localhost:8090';
}

const pbUrl = getPocketBaseUrl();
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
      getFirstListItem: async (filter: string, options: any = {}) => {
        // Mimic PocketBase getFirstListItem using the proxy
        const params = new URLSearchParams({
          page: '1',
          perPage: '1',
          filter,
        });
        if (options.sort) params.set('sort', options.sort);
        if (options.expand) {
          const expandValue = Array.isArray(options.expand) 
            ? options.expand.join(',') 
            : options.expand;
          if (expandValue) params.set('expand', expandValue);
        }

        const response = await fetch(`/api/pocketbase/api/collections/${name}?${params}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });

        if (!response.ok) {
          const errorBody = await response.json();
          const err: any = new Error(errorBody.message || 'Request failed');
          err.status = response.status;
          throw err;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
          return data.items[0];
        }

        const notFound: any = new Error('Record not found');
        notFound.status = 404;
        throw notFound;
      },
      getFullList: async (options: any = {}) => {
        // Get all items by making multiple requests if needed
        const params = new URLSearchParams({
          perPage: '500',
        });
        if (options.filter) params.set('filter', options.filter);
        if (options.sort) params.set('sort', options.sort);
        if (options.expand) {
          const expandValue = Array.isArray(options.expand) 
            ? options.expand.join(',') 
            : options.expand;
          if (expandValue) params.set('expand', expandValue);
        }

        const makeRequest = async (token: string | null) => {
          return fetch(`/api/pocketbase/api/collections/${name}?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        };

        let response = await makeRequest(this.token);

        if (response.status === 401 && this.token) {
          // Token invalid/expired - clear it and retry as guest
          this.authStore.clear();
          response = await makeRequest(null);
        }

        if (!response.ok) {
          const error = await response.json();
          console.error(`[PocketBase] getFullList error for ${name}:`, error);
          throw new Error(error.message || error.error || 'Request failed');
        }

        const data = await response.json();
        // Handle both direct array response and paginated response
        if (Array.isArray(data)) {
          return data;
        }
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
        const isFormData = data instanceof FormData;
        const headers: Record<string, string> = {
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        };
        
        // Don't set Content-Type for FormData - let the browser set it with boundary
        if (!isFormData) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`/api/pocketbase/api/collections/${name}/records`, {
          method: 'POST',
          headers,
          body: isFormData ? data : JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }

        return response.json();
      },
      update: async (id: string, data: any, options: any = {}) => {
        const isFormData = data instanceof FormData;
        const headers: Record<string, string> = {
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        };
        
        // Don't set Content-Type for FormData - let the browser set it with boundary
        if (!isFormData) {
          headers['Content-Type'] = 'application/json';
        }

        const params = new URLSearchParams();
        if (options.expand) {
          const expandValue = Array.isArray(options.expand) 
            ? options.expand.join(',') 
            : options.expand;
          if (expandValue) params.set('expand', expandValue);
        }

        const url = `/api/pocketbase/api/collections/${name}/records/${id}${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers,
          body: isFormData ? data : JSON.stringify(data),
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
      authRefresh: async () => {
        const response = await fetch('/api/pocketbase/api/collections/users/auth-refresh', {
          method: 'POST',
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Auth refresh failed');
        }

        const data = await response.json();
        this.authStore.save(data.token, data.record);
        return { token: data.token, record: data.record };
      },
    };
  }

  // Files helper, matching frontend implementation so pb.files.getUrl works
  get files() {
    return {
      getUrl: (record: any, filename: string, queryParams: any = {}) => {
        // Check if we're in a hosted environment (not localhost)
        const isHosted = typeof window !== 'undefined' && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1';
        
        if (isHosted) {
          // In hosted environments, use the proxy route to handle CORS and authentication
          const collectionId = record.collectionId || record.collectionName || 'venues';
          const recordId = record.id;
          const actualFilename = Array.isArray(filename) ? filename[0] : filename;
          const encodedFilename = encodeURIComponent(actualFilename).replace(/%2F/g, '/');
          const proxyUrl = `/api/pocketbase/api/files/${collectionId}/${recordId}/${encodedFilename}`;
          return proxyUrl;
        } else {
          // For localhost, use direct PocketBase URL
          const clientBaseUrl = typeof window !== 'undefined' 
            ? (process.env.NEXT_PUBLIC_POCKETBASE_URL || pbUrl)
            : pbUrl;
          
          const pb = new PocketBase(clientBaseUrl);
          const url = pb.files.getUrl(record, filename, queryParams);
          return url;
        }
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

