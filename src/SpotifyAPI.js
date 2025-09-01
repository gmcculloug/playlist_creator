import axios from 'axios';

class SpotifyAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.spotify.com/v1';
    this.headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getUserProfile() {
    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch user profile: ' + error.response?.data?.error?.message || error.message);
    }
  }

  async getUserPlaylists() {
    try {
      let allPlaylists = [];
      let url = `${this.baseURL}/me/playlists?limit=50`;
      
      while (url) {
        const response = await axios.get(url, {
          headers: this.headers
        });
        
        allPlaylists = allPlaylists.concat(response.data.items);
        url = response.data.next;
      }
      
      return allPlaylists;
    } catch (error) {
      throw new Error('Failed to fetch playlists: ' + error.response?.data?.error?.message || error.message);
    }
  }

  async getPlaylistTracks(playlistId) {
    try {
      let allTracks = [];
      let url = `${this.baseURL}/playlists/${playlistId}/tracks?limit=100`;
      
      while (url) {
        const response = await axios.get(url, {
          headers: this.headers
        });
        
        const tracks = response.data.items
          .filter(item => item.track && item.track.type === 'track')
          .map(item => ({
            id: item.track.id,
            name: item.track.name,
            artists: item.track.artists.map(artist => artist.name),
            uri: item.track.uri,
            album: item.track.album.name
          }));
        
        allTracks = allTracks.concat(tracks);
        url = response.data.next;
      }
      
      return allTracks;
    } catch (error) {
      throw new Error('Failed to fetch playlist tracks: ' + error.response?.data?.error?.message || error.message);
    }
  }

  async createPlaylist(name, description = 'Created with Spotify Playlist Creator') {
    try {
      const userProfile = await this.getUserProfile();
      
      const response = await axios.post(
        `${this.baseURL}/users/${userProfile.id}/playlists`,
        {
          name: name,
          description: description,
          public: false
        },
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error('Failed to create playlist: ' + error.response?.data?.error?.message || error.message);
    }
  }

  async addTracksToPlaylist(playlistId, trackUris) {
    try {
      const batchSize = 100;
      
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);
        
        await axios.post(
          `${this.baseURL}/playlists/${playlistId}/tracks`,
          { uris: batch },
          { headers: this.headers }
        );
      }
      
      return true;
    } catch (error) {
      throw new Error('Failed to add tracks to playlist: ' + error.response?.data?.error?.message || error.message);
    }
  }
}

export default SpotifyAPI;