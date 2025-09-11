import Fuse from 'fuse.js';

class FuzzyMatcher {
  constructor() {
    this.options = {
      includeScore: true,
      threshold: 0.6,
      ignoreLocation: true,
      keys: [
        {
          name: 'name',
          weight: 0.7,
          getFn: (obj) => this.cleanSongName(obj.name)
        },
        {
          name: 'artists',
          weight: 0.3,
          getFn: (obj) => Array.isArray(obj.artists) ? obj.artists.map(artist => this.cleanSongName(artist)).join(' ') : this.cleanSongName(obj.artists)
        }
      ]
    };
  }

  cleanSongName(text) {
    if (!text) return '';
    return text
      .replace(/\([^)]*\)/g, '')
      .replace(/➔/g, '')
      .replace(/'/g, '')
      .trim();
  }

  findBestMatch(inputSong, songLibrary) {
    if (!songLibrary || songLibrary.length === 0) {
      return null;
    }

    const cleanedInputSong = this.cleanSongName(inputSong);
    const fuse = new Fuse(songLibrary, this.options);
    const results = fuse.search(cleanedInputSong);
    
    if (results.length === 0) {
      return null;
    }

    // Filter results that meet the threshold
    const validResults = results.filter(result => result.score <= this.options.threshold);
    
    if (validResults.length === 0) {
      return null;
    }

    // Find the best match by prioritizing exact matches and shorter titles
    const bestMatch = this.selectBestMatch(cleanedInputSong, validResults);

    return {
      ...bestMatch.item,
      score: 1 - bestMatch.score
    };
  }

  selectBestMatch(cleanedInput, results) {
    // Check for exact matches first
    const exactMatches = results.filter(result => {
      const cleanedSongName = this.cleanSongName(result.item.name);
      return cleanedSongName.toLowerCase() === cleanedInput.toLowerCase();
    });

    if (exactMatches.length > 0) {
      return exactMatches[0];
    }

    // Sort by score first, then by title length (prefer shorter titles)
    return results.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.01) {
        // If scores are very close, prefer shorter title
        const aLength = this.cleanSongName(a.item.name).length;
        const bLength = this.cleanSongName(b.item.name).length;
        return aLength - bLength;
      }
      return a.score - b.score;
    })[0];
  }

  findAllMatches(inputSong, songLibrary, maxResults = 5) {
    if (!songLibrary || songLibrary.length === 0) {
      return [];
    }

    const cleanedInputSong = this.cleanSongName(inputSong);
    const fuse = new Fuse(songLibrary, this.options);
    const results = fuse.search(cleanedInputSong);
    
    return results
      .filter(result => result.score <= this.options.threshold)
      .slice(0, maxResults)
      .map(result => ({
        ...result.item,
        score: 1 - result.score
      }));
  }

  setThreshold(threshold) {
    this.options.threshold = threshold;
  }

  setSongWeight(weight) {
    this.options.keys[0].weight = weight;
    this.options.keys[1].weight = 1 - weight;
  }
}

export default FuzzyMatcher;