import React, { useState, useEffect } from 'react';
import SpotifyAPI from './SpotifyAPI';
import YouTubeAPI from './YouTubeAPI';
import FuzzyMatcher from './FuzzyMatcher';

const PlaylistCreator = ({ accessToken, platform }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [songList, setSongList] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const spotifyAPI = platform === 'spotify' ? new SpotifyAPI(accessToken) : null;
  const youtubeAPI = platform === 'youtube' ? new YouTubeAPI() : null;
  const fuzzyMatcher = new FuzzyMatcher();

  // Fetch user's playlists on component mount
  useEffect(() => {
    const fetchUserPlaylists = async () => {
      try {
        let playlists = [];
        
        if (platform === 'spotify' && spotifyAPI) {
          const allPlaylists = await spotifyAPI.getUserPlaylists();
          const userProfile = await spotifyAPI.getUserProfile();
          
          // Show all user's own playlists (including core playlists)
          playlists = allPlaylists.filter(playlist => 
            playlist.owner.id === userProfile.id
          );
        } else if (platform === 'youtube' && youtubeAPI) {
          // Wait for YouTube API to load token, then fetch playlists
          await youtubeAPI.loadToken();
          
          if (youtubeAPI.accessToken && youtubeAPI.accessToken !== 'youtube-mode') {
            // Show all user playlists (including core playlists)
            playlists = await youtubeAPI.getUserPlaylists();
          } else {
            console.log('YouTube mode active but no valid OAuth token for user playlists');
          }
        }
        
        console.log('Fetched playlists:', playlists);
        setUserPlaylists(playlists);
      } catch (error) {
        console.error('Error fetching user playlists:', error);
        // For YouTube, show a more specific message about authentication
        if (platform === 'youtube' && error.message.includes('Authentication required')) {
          console.log('YouTube authentication required for user playlists');
        }
      }
    };

    fetchUserPlaylists();
  }, [platform, spotifyAPI, youtubeAPI, accessToken]);

  // Handle playlist name input change
  const handlePlaylistNameChange = (value) => {
    setPlaylistName(value);
    setShowDropdown(true);
  };

  // Handle playlist selection from dropdown
  const handlePlaylistSelect = (playlist) => {
    setPlaylistName(playlist.name);
    setShowDropdown(false);
  };

  // Filter playlists based on current input
  const filteredPlaylists = userPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(playlistName.toLowerCase())
  );

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || !songList.trim()) {
      setStatus('Please enter both a playlist name and a list of songs.');
      return;
    }


    setIsLoading(true);
    setStatus('Starting playlist creation...');
    setResults(null);

    try {
      const songs = songList
        .split('\n')
        .map(song => song.trim())
        .map(song => song.startsWith('  - ') ? song.substring(4).trim() : song)
        .filter(song => song.length > 0);

      let allCoreSongs = [];

      if (platform === 'spotify') {
        setStatus('Fetching your Spotify playlists...');
        const userPlaylists = await spotifyAPI.getUserPlaylists();
        const userProfile = await spotifyAPI.getUserProfile();
        
        const corePlaylists = userPlaylists.filter(playlist => 
          playlist.name.toLowerCase().includes('core') && 
          playlist.owner.id === userProfile.id
        );

        if (corePlaylists.length === 0) {
          setStatus('No playlists containing "core" found.');
          setIsLoading(false);
          return;
        }

        setStatus(`Found ${corePlaylists.length} core playlist(s). Fetching songs...`);
        
        for (const playlist of corePlaylists) {
          const playlistTracks = await spotifyAPI.getPlaylistTracks(playlist.id);
          allCoreSongs = allCoreSongs.concat(playlistTracks);
        }
      } else if (platform === 'youtube') {
        setStatus('Fetching your YouTube playlists...');
        const userPlaylists = await youtubeAPI.getUserPlaylists();
        
        const corePlaylists = userPlaylists.filter(playlist => 
          playlist.name.toLowerCase().includes('core')
        );

        if (corePlaylists.length === 0) {
          setStatus('No playlists containing "core" found in your account.');
          setIsLoading(false);
          return;
        }

        setStatus(`Found ${corePlaylists.length} core playlist(s). Fetching videos...`);
        
        for (const playlist of corePlaylists) {
          try {
            const videos = await youtubeAPI.getPlaylistVideos(playlist.id);
            allCoreSongs = allCoreSongs.concat(videos);
          } catch (error) {
            console.warn(`Failed to fetch playlist: ${playlist.name}`, error);
          }
        }

        if (allCoreSongs.length === 0) {
          setStatus('No videos found in the core playlists.');
          setIsLoading(false);
          return;
        }
      }

      setStatus('Matching songs using fuzzy search...');
      
      const matchedSongs = [];
      const unmatchedSongs = [];

      for (const inputSong of songs) {
        const match = fuzzyMatcher.findBestMatch(inputSong, allCoreSongs);
        if (match) {
          matchedSongs.push({
            input: inputSong,
            matched: match,
            score: match.score
          });
        } else {
          unmatchedSongs.push(inputSong);
        }
      }

      if (matchedSongs.length === 0) {
        setStatus(`No matching songs found in your ${platform} playlists.`);
        setResults({
          matchedCount: 0,
          unmatchedSongs,
          playlistUrl: null
        });
        setIsLoading(false);
        return;
      }

      if (platform === 'spotify') {
        // Check if playlist already exists
        setStatus('Checking for existing playlist...');
        const existingPlaylist = await spotifyAPI.findPlaylistByName(playlistName);
        
        let targetPlaylist;
        let isUpdate = false;
        
        if (existingPlaylist) {
          const shouldUpdate = window.confirm(
            `A playlist named "${playlistName}" already exists.\n\n` +
            `Would you like to update it by adding missing songs?\n\n` +
            `Click "OK" to update the existing playlist, or "Cancel" to create a new one with a different name.`
          );
          
          if (!shouldUpdate) {
            setStatus('Please choose a different playlist name.');
            setIsLoading(false);
            return;
          }
          
          targetPlaylist = existingPlaylist;
          isUpdate = true;
          setStatus('Updating existing Spotify playlist...');
        } else {
          setStatus('Creating new Spotify playlist...');
          targetPlaylist = await spotifyAPI.createPlaylist(playlistName);
        }

        // Get existing tracks if updating
        let existingTrackUris = [];
        if (isUpdate) {
          setStatus('Checking existing songs in playlist...');
          const existingTracks = await spotifyAPI.getPlaylistTracks(targetPlaylist.id);
          existingTrackUris = existingTracks.map(track => track.uri);
        }

        // Filter out songs that already exist in the playlist
        const trackUris = matchedSongs.map(match => match.matched.uri);
        const newTrackUris = isUpdate ? 
          trackUris.filter(uri => !existingTrackUris.includes(uri)) : 
          trackUris;

        if (newTrackUris.length > 0) {
          setStatus(`Adding ${newTrackUris.length} song(s) to playlist...`);
          await spotifyAPI.addTracksToPlaylist(targetPlaylist.id, newTrackUris);
        }

        const statusMessage = isUpdate ? 
          `Playlist updated! Added ${newTrackUris.length} new song(s).` :
          'Playlist created successfully!';
        
        setStatus(statusMessage);
        setResults({
          matchedCount: matchedSongs.length,
          addedCount: newTrackUris.length,
          skippedCount: isUpdate ? (trackUris.length - newTrackUris.length) : 0,
          matchedSongs: matchedSongs,
          unmatchedSongs,
          playlistUrl: targetPlaylist.external_urls.spotify,
          playlistName: targetPlaylist.name,
          isUpdate
        });
      } else if (platform === 'youtube') {
        // Check if playlist already exists
        setStatus('Checking for existing playlist...');
        const existingPlaylist = await youtubeAPI.findPlaylistByName(playlistName);
        
        let targetPlaylist;
        let isUpdate = false;
        
        if (existingPlaylist) {
          const shouldUpdate = window.confirm(
            `A playlist named "${playlistName}" already exists.\n\n` +
            `Would you like to update it by adding missing videos?\n\n` +
            `Click "OK" to update the existing playlist, or "Cancel" to create a new one with a different name.`
          );
          
          if (!shouldUpdate) {
            setStatus('Please choose a different playlist name.');
            setIsLoading(false);
            return;
          }
          
          targetPlaylist = existingPlaylist;
          isUpdate = true;
          setStatus('Updating existing YouTube playlist...');
        } else {
          setStatus('Creating new YouTube playlist...');
          targetPlaylist = await youtubeAPI.createPlaylist(playlistName);
        }

        // Get existing videos if updating
        let existingVideoUris = [];
        if (isUpdate) {
          setStatus('Checking existing videos in playlist...');
          const existingVideos = await youtubeAPI.getPlaylistVideos(targetPlaylist.id);
          existingVideoUris = existingVideos.map(video => video.uri);
        }

        // Filter out videos that already exist in the playlist
        const videoUris = matchedSongs.map(match => match.matched.uri);
        const newVideoUris = isUpdate ? 
          videoUris.filter(uri => !existingVideoUris.includes(uri)) : 
          videoUris;

        if (newVideoUris.length > 0) {
          setStatus(`Adding ${newVideoUris.length} video(s) to playlist...`);
          await youtubeAPI.addVideosToPlaylist(targetPlaylist.id, newVideoUris);
        }

        const statusMessage = isUpdate ? 
          `Playlist updated! Added ${newVideoUris.length} new video(s).` :
          'YouTube playlist created successfully!';
        
        setStatus(statusMessage);
        setResults({
          matchedCount: matchedSongs.length,
          addedCount: newVideoUris.length,
          skippedCount: isUpdate ? (videoUris.length - newVideoUris.length) : 0,
          matchedSongs: matchedSongs,
          unmatchedSongs,
          playlistUrl: targetPlaylist.url,
          playlistName: targetPlaylist.name,
          isUpdate
        });
      }

    } catch (error) {
      console.error('Error creating playlist:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = () => {
    if (isLoading) return 'loading';
    if (status.includes('Error')) return 'error';
    if (status.includes('successfully')) return 'success';
    return '';
  };

  return (
    <div className="playlist-creator">

      <div className="form-group">
        <label htmlFor="playlistName">Playlist Name:</label>
        <div className="playlist-dropdown-container">
          <input
            id="playlistName"
            type="text"
            value={playlistName}
            onChange={(e) => handlePlaylistNameChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Enter new playlist name or select existing..."
            disabled={isLoading}
            autoComplete="off"
          />
          {console.log('Dropdown debug:', { showDropdown, filteredPlaylistsLength: filteredPlaylists.length, userPlaylistsLength: userPlaylists.length, playlistName }) || ''}
          {showDropdown && filteredPlaylists.length > 0 && (
            <div className="playlist-dropdown">
              {filteredPlaylists.slice(0, 10).map((playlist) => (
                <div
                  key={playlist.id}
                  className="playlist-dropdown-item"
                  onClick={() => handlePlaylistSelect(playlist)}
                >
                  <div className="playlist-name">{playlist.name}</div>
                  <div className="playlist-info">
                    {platform === 'spotify' ? 
                      `${playlist.tracks?.total || 0} tracks` : 
                      `${playlist.itemCount || 0} videos`
                    }
                  </div>
                </div>
              ))}
              {filteredPlaylists.length > 10 && (
                <div className="playlist-dropdown-more">
                  ... and {filteredPlaylists.length - 10} more
                </div>
              )}
            </div>
          )}
          {platform === 'youtube' && userPlaylists.length === 0 && (!youtubeAPI?.accessToken || youtubeAPI.accessToken === 'youtube-mode') && (
            <div className="youtube-auth-notice">
              <small>To see your existing YouTube playlists, configure YouTube OAuth authentication. See README for setup instructions.</small>
            </div>
          )}
        </div>
      </div>


      <div className="form-group">
        <label htmlFor="songList">Songs (one per line):</label>
        <textarea
          id="songList"
          value={songList}
          onChange={(e) => setSongList(e.target.value)}
          placeholder="Enter song names, one per line...&#10;Example:&#10;Bohemian Rhapsody&#10;Hotel California&#10;Sweet Child O' Mine"
          disabled={isLoading}
        />
      </div>

      <button 
        className="create-button" 
        onClick={handleCreatePlaylist}
        disabled={isLoading || !playlistName.trim() || !songList.trim()}
      >
        {isLoading ? `Creating ${platform === 'spotify' ? 'Spotify' : 'YouTube'} Playlist...` : `Create ${platform === 'spotify' ? 'Spotify' : 'YouTube'} Playlist`}
      </button>

      {status && (
        <div className={`status ${getStatusClass()}`}>
          {status}
        </div>
      )}

      {results && (
        <div className="results">
          <h3>Results</h3>
          <p><strong>Matched songs:</strong> {results.matchedCount}</p>
          
          {results.isUpdate && (
            <>
              <p><strong>Added to playlist:</strong> {results.addedCount} new song(s)</p>
              {results.skippedCount > 0 && (
                <p><strong>Already in playlist:</strong> {results.skippedCount} song(s) (skipped)</p>
              )}
            </>
          )}
          
          {results.playlistUrl && (
            <p>
              <strong>{results.isUpdate ? 'Playlist updated' : 'Playlist created'}:</strong>{' '}
              <a href={results.playlistUrl} target="_blank" rel="noopener noreferrer">
                {results.playlistName}
              </a>
            </p>
          )}

          {results.matchedSongs && results.matchedSongs.length > 0 && (
            <div>
              <h4>Matched Songs:</h4>
              <ul>
                {results.matchedSongs.map((match, index) => (
                  <li key={index}>
                    <strong>{match.input}</strong> → {match.matched.name} by {match.matched.artists.join(', ')}
                    {match.score && <span style={{color: '#666'}}> (score: {match.score.toFixed(2)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.unmatchedSongs && results.unmatchedSongs.length > 0 && (
            <div>
              <h4>Unmatched Songs:</h4>
              <ul>
                {results.unmatchedSongs.map((song, index) => (
                  <li key={index} style={{color: '#c62828'}}>{song}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaylistCreator;