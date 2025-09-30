import FuzzyMatcher from '../FuzzyMatcher';

describe('FuzzyMatcher', () => {
  let fuzzyMatcher;
  let mockSongLibrary;

  beforeEach(() => {
    fuzzyMatcher = new FuzzyMatcher();
    mockSongLibrary = [
      {
        id: '1',
        name: 'Shape of You',
        artists: ['Ed Sheeran'],
        uri: 'spotify:track:1'
      },
      {
        id: '2',
        name: 'Perfect',
        artists: ['Ed Sheeran'],
        uri: 'spotify:track:2'
      },
      {
        id: '3',
        name: 'Thinking Out Loud',
        artists: ['Ed Sheeran'],
        uri: 'spotify:track:3'
      }
    ];
  });

  describe('cleanSongName', () => {
    test('should remove parenthetical content', () => {
      expect(fuzzyMatcher.cleanSongName('Perfect (Acoustic Version)')).toBe('Perfect');
      expect(fuzzyMatcher.cleanSongName('Song (feat. Artist)')).toBe('Song');
    });

    test('should remove arrow symbols', () => {
      expect(fuzzyMatcher.cleanSongName('Song ➔ Remix')).toBe('Song  Remix');
    });

    test('should remove apostrophes', () => {
      expect(fuzzyMatcher.cleanSongName("Don't Stop Me Now")).toBe('Dont Stop Me Now');
    });

    test('should handle empty or null input', () => {
      expect(fuzzyMatcher.cleanSongName('')).toBe('');
      expect(fuzzyMatcher.cleanSongName(null)).toBe('');
      expect(fuzzyMatcher.cleanSongName(undefined)).toBe('');
    });
  });

  describe('findBestMatch', () => {
    test('should find exact match', () => {
      const result = fuzzyMatcher.findBestMatch('Perfect', mockSongLibrary);
      expect(result).toBeTruthy();
      expect(result.name).toBe('Perfect');
      expect(result.id).toBe('2');
    });

    test('should return null for no matches', () => {
      const result = fuzzyMatcher.findBestMatch('Nonexistent Song', mockSongLibrary);
      expect(result).toBeNull();
    });

    test('should return null for empty song library', () => {
      const result = fuzzyMatcher.findBestMatch('Perfect', []);
      expect(result).toBeNull();
    });

    test('should include score in result', () => {
      const result = fuzzyMatcher.findBestMatch('Perfect', mockSongLibrary);
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should fallback to first part when no matches and string contains "- "', () => {
      const result = fuzzyMatcher.findBestMatch('Perfect - Live Version', mockSongLibrary);
      expect(result).toBeTruthy();
      expect(result.name).toBe('Perfect');
      expect(result.id).toBe('2');
    });

    test('should fallback to first part when no valid matches and string contains "- "', () => {
      // Set a very strict threshold to make initial search fail
      fuzzyMatcher.setThreshold(0.1);
      const result = fuzzyMatcher.findBestMatch('Shape - Remix Version', mockSongLibrary);
      expect(result).toBeTruthy();
      expect(result.name).toBe('Shape of You');
      expect(result.id).toBe('1');
    });

    test('should return null when fallback also finds no matches', () => {
      const result = fuzzyMatcher.findBestMatch('Nonexistent - Song Title', mockSongLibrary);
      expect(result).toBeNull();
    });

    test('should work normally when string contains "- " but finds matches', () => {
      // Add a song that actually contains "- " to test normal behavior
      const libraryWithDash = [...mockSongLibrary, {
        id: '4',
        name: 'Test - Song',
        artists: ['Test Artist'],
        uri: 'spotify:track:4'
      }];

      const result = fuzzyMatcher.findBestMatch('Test - Song', libraryWithDash);
      expect(result).toBeTruthy();
      expect(result.name).toBe('Test - Song');
      expect(result.id).toBe('4');
    });
  });

  describe('configuration', () => {
    test('should update threshold', () => {
      const newThreshold = 0.8;
      fuzzyMatcher.setThreshold(newThreshold);
      expect(fuzzyMatcher.options.threshold).toBe(newThreshold);
    });

    test('should update song weight', () => {
      const songWeight = 0.9;
      fuzzyMatcher.setSongWeight(songWeight);
      expect(fuzzyMatcher.options.keys[0].weight).toBe(0.9);
      expect(fuzzyMatcher.options.keys[1].weight).toBeCloseTo(0.1);
    });
  });
});