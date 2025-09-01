import React, { useState } from 'react';
import SpotifyAPI from './SpotifyAPI';
import YouTubeAPI from './YouTubeAPI';
import FuzzyMatcher from './FuzzyMatcher';

const PlaylistCreator = ({ accessToken, platform }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [songList, setSongList] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const spotifyAPI = platform === 'spotify' ? new SpotifyAPI(accessToken) : null;
  const youtubeAPI = platform === 'youtube' ? new YouTubeAPI() : null;
  const fuzzyMatcher = new FuzzyMatcher();

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
        setStatus('Creating new Spotify playlist...');
        const newPlaylist = await spotifyAPI.createPlaylist(playlistName);

        setStatus('Adding songs to playlist...');
        const trackUris = matchedSongs.map(match => match.matched.uri);
        await spotifyAPI.addTracksToPlaylist(newPlaylist.id, trackUris);

        setStatus('Playlist created successfully!');
        setResults({
          matchedCount: matchedSongs.length,
          matchedSongs: matchedSongs,
          unmatchedSongs,
          playlistUrl: newPlaylist.external_urls.spotify,
          playlistName: newPlaylist.name
        });
      } else if (platform === 'youtube') {
        setStatus('Creating new YouTube playlist...');
        const newPlaylist = await youtubeAPI.createPlaylist(playlistName);

        setStatus('Adding videos to playlist...');
        const videoUris = matchedSongs.map(match => match.matched.uri);
        await youtubeAPI.addVideosToPlaylist(newPlaylist.id, videoUris);

        setStatus('YouTube playlist created successfully!');
        setResults({
          matchedCount: matchedSongs.length,
          matchedSongs: matchedSongs,
          unmatchedSongs,
          playlistUrl: newPlaylist.url,
          playlistName: newPlaylist.name
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
        <label htmlFor="playlistName">New Playlist Name:</label>
        <input
          id="playlistName"
          type="text"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder="Enter playlist name..."
          disabled={isLoading}
        />
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
          
          {results.playlistUrl && (
            <p>
              <strong>Playlist created:</strong>{' '}
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