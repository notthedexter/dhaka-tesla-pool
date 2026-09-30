const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL !== undefined) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return '';
  }
  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Automatically attach auth token if available in client localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dhaka_tesla_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    const error: ApiError = {
      error: 'NetworkError',
      message: `Cannot connect to Dhaka Tesla Pool API at ${API_BASE_URL}. Ensure backend is running with 'npm run dev:api' or 'npm run dev'.`,
      statusCode: 0,
    };
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: ApiError = {
      error: data.error || 'RequestFailed',
      message: data.message || `Request failed with status ${response.status}`,
      statusCode: response.status,
    };
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
