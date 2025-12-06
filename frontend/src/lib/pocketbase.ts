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
      // Get auth methods (used by PocketBase internally for OAuth)
      listAuthMethods: async () => {
        const response = await fetch(`/api/pocketbase/api/collections/${name}/auth-methods`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }

        return response.json();
      },
      getList: async (page = 1, perPage = 20, options: any = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          perPage: perPage.toString(),
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
          throw new Error(error.message || 'Request failed');
        }

        return response.json();
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
        if (options.fields) {
          const fieldsValue = Array.isArray(options.fields) 
            ? options.fields.join(',') 
            : options.fields;
          if (fieldsValue) params.set('fields', fieldsValue);
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
          throw new Error(error.message || 'Request failed');
        }

        const data = await response.json();
        // Handle both direct array response and paginated response
        if (Array.isArray(data)) {
          return data;
        }
        const items = data.items || [];
        // Debug logging for ticket_types
        if (name === 'ticket_types' && items.length > 0) {
          console.log(`[ProxyPocketBase] getFullList for ticket_types returned ${items.length} items`);
          console.log(`[ProxyPocketBase] First item keys:`, Object.keys(items[0]));
          console.log(`[ProxyPocketBase] First item has ticket_type_category:`, items[0].ticket_type_category !== undefined);
          console.log(`[ProxyPocketBase] First item has table_ids:`, items[0].table_ids !== undefined);
        }
        // Debug logging for tables
        if (name === 'tables') {
          console.log(`[ProxyPocketBase] getFullList for tables returned ${items.length} items`);
          if (items.length > 0) {
            console.log(`[ProxyPocketBase] First table:`, {
              id: items[0].id,
              name: items[0].name,
              venue_id: items[0].venue_id,
              venue_id_type: typeof items[0].venue_id,
              is_array: Array.isArray(items[0].venue_id),
            });
          }
        }
        return items;
      },
      getOne: async (id: string | number, options: any = {}) => {
        const params = new URLSearchParams();
        // Handle expand parameter - can be string or array
        if (options.expand) {
          const expandValue = Array.isArray(options.expand) 
            ? options.expand.join(',') 
            : options.expand;
          if (expandValue) {
            params.set('expand', expandValue);
          }
        }

        const makeRequest = async (token: string | null) => {
          const url = `/api/pocketbase/api/collections/${name}/records/${String(id)}${params.toString() ? `?${params.toString()}` : ''}`;
          return fetch(url, {
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
      authWithOAuth2: async (options: any) => {
        // Custom OAuth implementation using proxy to avoid Mixed Content
        // PocketBase SDK internally calls auth-methods directly, causing Mixed Content errors
        // So we implement OAuth ourselves using the proxy

        // Get auth methods through proxy
        const authMethodsResponse = await fetch(`/api/pocketbase/api/collections/${name}/auth-methods`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });

        if (!authMethodsResponse.ok) {
          throw new Error('Failed to get auth methods');
        }

        const authMethods = await authMethodsResponse.json();
        const provider = authMethods.authProviders?.find((p: any) => p.name === options.provider);

        if (!provider) {
          throw new Error(`Provider ${options.provider} not found`);
        }

        // If we have a code (OAuth callback), complete the auth
        if (options.code) {
          const response = await fetch(`/api/pocketbase/api/collections/${name}/auth-with-oauth2`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
            body: JSON.stringify({
              provider: options.provider,
              code: options.code,
              codeVerifier: options.codeVerifier,
              redirectUrl: options.redirectUrl,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'OAuth failed');
          }

          const data = await response.json();
          if (data.token && data.record) {
            this.authStore.save(data.token, data.record);
          }
          return data;
        }

        // Otherwise, initiate OAuth flow
        if (options.urlCallback) {
          // Use PocketBase's OAuth URL generation
          // We need to get the OAuth URL from PocketBase, but through proxy
          // For now, construct it manually based on provider config
          const redirectUrl = options.redirectUrl || `${window.location.origin}/auth/callback`;
          const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

          // Store state for verification
          sessionStorage.setItem('oauth_state', state);

          // Build OAuth URL from provider
          const authUrl = new URL(provider.authUrl);
          authUrl.searchParams.set('redirect_uri', redirectUrl);
          authUrl.searchParams.set('state', state);
          authUrl.searchParams.set('client_id', provider.clientId);

          // Call the callback with the URL
          options.urlCallback(authUrl.toString());
        }

        return null;
      },
    };
  }

  get files() {
    return {
      getUrl: (record: any, filename: string, queryParams: any = {}) => {
        // Validate inputs
        if (!record || !record.id) {
          console.warn('Invalid record provided to files.getUrl:', record);
          return ''; // Return empty string for invalid records
        }
        
        if (!filename || filename.trim() === '') {
          console.warn('Invalid filename provided to files.getUrl:', filename);
          return ''; // Return empty string for invalid filenames
        }
        
        // Check if we're on HTTPS (production) - if so, use proxy to avoid Mixed Content errors
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        
        try {
          if (isHttps) {
            // Use proxy route for HTTPS environments
            const pb = new PocketBase(pbUrl);
            const directUrl = pb.files.getUrl(record, filename, queryParams);
            
            // Validate the direct URL before processing
            if (!directUrl || directUrl.trim() === '' || directUrl.startsWith('data:')) {
              console.warn('Invalid direct URL generated:', directUrl);
              return ''; // Return empty string for invalid URLs
            }
            
            // Extract the path from the direct URL (e.g., /api/files/collectionId/recordId/filename)
            try {
              const url = new URL(directUrl);
              const path = url.pathname; // This will be like /api/files/collectionId/recordId/filename
              
              // Extract the file path part (everything after /api/files/)
              const filePath = path.replace(/^\/api\/files\//, '');
              
              if (!filePath || filePath.trim() === '') {
                console.warn('Invalid file path extracted:', filePath);
                return directUrl; // Fallback to direct URL
              }
              
              // Build proxy URL
              const proxyUrl = new URL(`/api/pocketbase/files/${filePath}`, window.location.origin);
              
              // Add query parameters if any (from both queryParams and original URL)
              if (url.search) {
                url.searchParams.forEach((value, key) => {
                  proxyUrl.searchParams.append(key, value);
                });
              }
              if (queryParams && Object.keys(queryParams).length > 0) {
                Object.entries(queryParams).forEach(([key, value]) => {
                  proxyUrl.searchParams.set(key, String(value));
                });
              }
              
              return proxyUrl.toString();
            } catch (e) {
              // Fallback to direct URL if parsing fails
              console.warn('Failed to parse PocketBase file URL, using direct URL:', e);
              return directUrl;
            }
          } else {
            // Use direct PocketBase URL for HTTP (local development)
            const pb = new PocketBase(pbUrl);
            const directUrl = pb.files.getUrl(record, filename, queryParams);
            
            // Validate the direct URL
            if (!directUrl || directUrl.trim() === '' || directUrl.startsWith('data:')) {
              console.warn('Invalid direct URL generated:', directUrl);
              return ''; // Return empty string for invalid URLs
            }
            
            return directUrl;
          }
        } catch (error: any) {
          console.error('Error generating file URL:', error);
          return ''; // Return empty string on error
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
    return await pb.collection('customers').authWithPassword(email, password);
  } else {
    const pb = getPocketBase();
    const authData = await pb.collection('customers').authWithPassword(email, password);
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

    const record = await pb.collection('customers').create(data);

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

