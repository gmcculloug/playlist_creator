# Testing Documentation

This project now includes comprehensive tests using Jest and React Testing Library.

## Test Setup

### Framework
- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions

### Configuration
- Tests are configured via `react-scripts` which includes Jest
- Setup file: `src/setupTests.js` - contains global mocks and configuration
- Test files are located in `src/__tests__/` directory

## Running Tests

```bash
# Run all tests
npm test

# Run tests without watch mode
npm test -- --watchAll=false

# Run tests with coverage report
npm test -- --watchAll=false --coverage

# Run specific test file
npm test -- --testPathPattern="FuzzyMatcher"

# Run specific test by name
npm test -- --testNamePattern="should find exact match"
```

## Test Coverage

Current test coverage includes:

### Core Components
- **App.js** (58% coverage)
  - Platform selection functionality
  - Authentication flow integration
  - Component rendering and state management

- **FuzzyMatcher.js** (61% coverage)
  - Song name cleaning utilities
  - Fuzzy matching algorithms
  - Configuration options (threshold, weights)
  - Best match selection logic

### API Classes
- **SpotifyAPI.js** (17% coverage)
  - Class structure and initialization
  - Error handling for authentication
  - Method availability verification

## Test Structure

### Unit Tests
- `FuzzyMatcher.test.js`: Tests the fuzzy matching logic
- `SpotifyAPI.test.js`: Tests API class structure and error handling
- `simple.test.js`: Basic framework verification tests

### Integration Tests
- `App.test.js`: Tests component integration and user flows

## Mocking Strategy

### Global Mocks (in setupTests.js)
- `localStorage`: Mocked for all tests
- `fetch`: Mocked for API calls
- `axios`: Mocked for HTTP requests
- Environment variables: Set for consistent testing

### Component Mocks
- Child components are mocked in integration tests to isolate functionality
- Complex dependencies are simplified for focused testing

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on external state
2. **Mocking**: External dependencies are properly mocked
3. **Assertions**: Tests verify both positive and negative cases
4. **Coverage**: Focus on critical business logic and user interactions
5. **Readability**: Test descriptions clearly indicate what is being tested

## Future Improvements

Areas for expanded test coverage:
- PlaylistCreator component (0% coverage)
- SpotifyAuth component (0% coverage)
- YouTubeAPI and YouTubeAuth components (0% coverage)
- End-to-end user flows
- Error boundary testing
- Performance testing for large playlists

## Troubleshooting

### Common Issues
1. **Mock conflicts**: Ensure mocks are properly cleared between tests
2. **Async operations**: Use `waitFor` for components with async effects
3. **React warnings**: Wrap state updates in `act()` when needed
4. **Module mocking**: Place jest.mock() calls at the top of test files

### Debug Tips
- Use `screen.debug()` to see the current DOM state
- Add `console.log` statements to understand test flow
- Run single tests to isolate issues
- Check the Jest error messages for specific guidance