class YouTubeAPI {
  constructor() {
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.tokenData = null;
    this.accessToken = null;
    this.loadToken();
  }

  async loadToken() {
    try {
      const response = await fetch('/token.json');
      if (response.ok) {
        const tokenData = await response.json();
        this.tokenData = tokenData;
        this.accessToken = tokenData.token;
        
        if (this.isTokenExpired()) {
          console.log('Token expired, attempting refresh...');
          await this.refreshToken();
        }
      } else {
        console.warn('Could not load token.json, falling back to environment variables');
        this.accessToken = process.env.REACT_APP_YOUTUBE_ACCESS_TOKEN;
      }
    } catch (error) {
      console.warn('Error loading token.json:', error);
      this.accessToken = process.env.REACT_APP_YOUTUBE_ACCESS_TOKEN;
    }
  }

  isTokenExpired() {
    if (!this.tokenData || !this.tokenData.expiry) {
      return false;
    }
    
    const expiryDate = new Date(this.tokenData.expiry);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return expiryDate.getTime() - now.getTime() < bufferTime;
  }

  async refreshToken() {
    if (!this.tokenData || !this.tokenData.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/youtube/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh token');
      }

      const newTokenData = await response.json();
      this.accessToken = newTokenData.access_token;
      
      // Update token data with new access token and expiry
      this.tokenData.token = newTokenData.access_token;
      if (newTokenData.expires_in) {
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + newTokenData.expires_in);
        this.tokenData.expiry = expiryDate.toISOString();
      }
      
      return newTokenData;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async searchVideos(query, maxResults = 50) {
    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: maxResults
      });

      const headers = {};
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        throw new Error('No YouTube access token found. Please set REACT_APP_YOUTUBE_ACCESS_TOKEN or authenticate using OAuth2');
      }

      const response = await fetch(`${this.baseURL}/search?${searchParams}`, { headers });
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.items.map(item => ({
        id: item.id.videoId,
        name: item.snippet.title,
        artists: [item.snippet.channelTitle],
        uri: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt
      }));
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube: ' + error.message);
    }
  }

  async getPlaylistVideos(playlistId) {
    try {
      let allVideos = [];
      let nextPageToken = '';

      do {
        const searchParams = new URLSearchParams({
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50
        });

        if (nextPageToken) {
          searchParams.append('pageToken', nextPageToken);
        }

        const headers = {};
        if (this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        } else if (this.apiKey) {
          searchParams.append('key', this.apiKey);
        } else {
          throw new Error('No YouTube access token found. Please set REACT_APP_YOUTUBE_ACCESS_TOKEN or authenticate using OAuth2');
        }

        const response = await fetch(`${this.baseURL}/playlistItems?${searchParams}`, { headers });
        
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        
        const videos = data.items
          .filter(item => item.snippet.resourceId?.videoId)
          .map(item => ({
            id: item.snippet.resourceId.videoId,
            name: item.snippet.title,
            artists: [item.snippet.channelTitle],
            uri: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
            thumbnail: item.snippet.thumbnails.medium?.url,
            publishedAt: item.snippet.publishedAt
          }));

        allVideos = allVideos.concat(videos);
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);

      return allVideos;
    } catch (error) {
      console.error('YouTube playlist error:', error);
      throw new Error('Failed to fetch YouTube playlist: ' + error.message);
    }
  }

  async searchPlaylists(query, maxResults = 25) {
    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'playlist',
        maxResults: maxResults
      });

      const headers = {};
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        throw new Error('No YouTube access token found. Please set REACT_APP_YOUTUBE_ACCESS_TOKEN or authenticate using OAuth2');
      }

      console.log('YouTube API request:', `${this.baseURL}/search?${searchParams}`);
      console.log('Headers:', headers);

      const response = await fetch(`${this.baseURL}/search?${searchParams}`, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API error response:', errorText);
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return data.items.map(item => ({
        id: item.id.playlistId,
        name: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt
      }));
    } catch (error) {
      console.error('YouTube playlist search error:', error);
      throw new Error('Failed to search YouTube playlists: ' + error.message);
    }
  }

  async findCorePlaylists() {
    try {
      const corePlaylists = await this.searchPlaylists('core', 50);
      
      return corePlaylists.filter(playlist => 
        playlist.name.toLowerCase().includes('core')
      );
    } catch (error) {
      console.error('Error finding core playlists:', error);
      throw new Error('Failed to find core playlists: ' + error.message);
    }
  }

  extractPlaylistId(url) {
    const regex = /[&?]list=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  isValidPlaylistUrl(url) {
    return this.extractPlaylistId(url) !== null;
  }

  async getUserPlaylists() {
    try {
      let allPlaylists = [];
      let nextPageToken = '';

      do {
        const searchParams = new URLSearchParams({
          part: 'snippet,contentDetails',
          mine: 'true',
          maxResults: 50
        });

        if (nextPageToken) {
          searchParams.append('pageToken', nextPageToken);
        }

        const headers = {};
        if (this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        } else {
          throw new Error('No YouTube access token found. Authentication required to access user playlists.');
        }

        const response = await fetch(`${this.baseURL}/playlists?${searchParams}`, { headers });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        const playlists = data.items.map(item => ({
          id: item.id,
          name: item.snippet.title,
          description: item.snippet.description,
          itemCount: item.contentDetails.itemCount,
          thumbnail: item.snippet.thumbnails?.medium?.url,
          publishedAt: item.snippet.publishedAt,
          modifiedAt: item.snippet.publishedAt // YouTube doesn't provide lastModified, use publishedAt
        }));

        allPlaylists = allPlaylists.concat(playlists);
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);

      // Sort playlists by most recently published (YouTube doesn't provide lastModified)
      return allPlaylists.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } catch (error) {
      console.error('YouTube user playlists error:', error);
      throw new Error('Failed to fetch user playlists: ' + error.message);
    }
  }

  async findPlaylistByName(playlistName) {
    try {
      const playlists = await this.getUserPlaylists();
      return playlists.find(playlist => playlist.name === playlistName);
    } catch (error) {
      console.error('Error finding playlist by name:', error);
      throw new Error('Failed to search for playlist: ' + error.message);
    }
  }

  async createPlaylist(title, description = 'Created with Playlist Creator') {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        throw new Error('No YouTube access token found. Authentication required to create playlists.');
      }

      const response = await fetch(`${this.baseURL}/playlists?part=snippet,status`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          snippet: {
            title: title,
            description: description
          },
          status: {
            privacyStatus: 'private'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.snippet.title,
        url: `https://www.youtube.com/playlist?list=${data.id}`
      };
    } catch (error) {
      console.error('YouTube create playlist error:', error);
      throw new Error('Failed to create YouTube playlist: ' + error.message);
    }
  }

  async addVideosToPlaylist(playlistId, videoIds) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        throw new Error('No YouTube access token found. Authentication required to add videos to playlists.');
      }

      for (const videoId of videoIds) {
        const cleanVideoId = videoId.replace('https://www.youtube.com/watch?v=', '');
        
        const response = await fetch(`${this.baseURL}/playlistItems?part=snippet`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: cleanVideoId
              }
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Failed to add video ${cleanVideoId}: ${errorText}`);
        }
      }

      return true;
    } catch (error) {
      console.error('YouTube add videos error:', error);
      throw new Error('Failed to add videos to playlist: ' + error.message);
    }
  }

  createPlaylistUrl(videoIds) {
    if (!videoIds || videoIds.length === 0) {
      return null;
    }

    const firstVideoId = videoIds[0].replace('https://www.youtube.com/watch?v=', '');
    const playlistParams = videoIds.slice(1).map(id => 
      id.replace('https://www.youtube.com/watch?v=', '')
    ).join(',');

    let url = `https://www.youtube.com/watch?v=${firstVideoId}`;
    if (playlistParams) {
      url += `&list=${encodeURIComponent(playlistParams)}`;
    }

    return url;
  }
}

export default YouTubeAPI;