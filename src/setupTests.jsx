import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for testing
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_SPOTIFY_CLIENT_ID: 'test_spotify_client_id'
      }
    }
  }
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock axios to work with ES modules
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});