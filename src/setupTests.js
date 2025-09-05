import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.REACT_APP_SPOTIFY_CLIENT_ID = 'test_spotify_client_id';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock axios to work with ES modules
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});