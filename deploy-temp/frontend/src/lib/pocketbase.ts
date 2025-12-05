import PocketBase from 'pocketbase';

function getPocketBaseUrl(): string {
  // Read dynamically each time to ensure Next.js env vars are available
  // Priority: AWS_POCKETBASE_URL (for production/AWS) > POCKETBASE_URL (for local/other) > NEXT_PUBLIC_POCKETBASE_URL > localhost default
  // This allows the same code to work in both local and AWS environments
  
  // Check for AWS URL first (for AWS deployments)
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
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
          ...(options.filter && { filter: options.filter }),
          ...(options.sort && { sort: options.sort }),
          ...(options.expand && { expand: options.expand }),
        });

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
          ...(options.filter && { filter: options.filter }),
          ...(options.sort && { sort: options.sort }),
          ...(options.expand && { expand: options.expand }),
        });

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
        return data.items || [];
      },
      getOne: async (id: string | number, options: any = {}) => {
        const params = new URLSearchParams(
          options.expand ? { expand: options.expand } : {}
        );

        const makeRequest = async (token: string | null) => {
          return fetch(`/api/pocketbase/api/collections/${name}/records/${String(id)}?${params}`, {
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
        // Build file URL - for now, use direct PocketBase URL since files are served directly
        // Files don't have Mixed Content issues if they're images/media
        // If needed, we can proxy files too, but it's usually not necessary
        const pb = new PocketBase(pbUrl);
        return pb.files.getUrl(record, filename, queryParams);
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

