import React, { useState, useEffect } from 'react';
import SpotifyAuth from './SpotifyAuth';
import PlaylistCreator from './PlaylistCreator';
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  // Restore state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('spotify_access_token');
    const savedPlatform = localStorage.getItem('selected_platform');
    
    if (savedToken && savedPlatform) {
      console.log('Restoring saved state:', { platform: savedPlatform, hasToken: !!savedToken });
      setAccessToken(savedToken);
      setSelectedPlatform(savedPlatform);
    }
  }, []);

  const handlePlatformSelect = (platform) => {
    console.log('Platform selected:', platform);
    setSelectedPlatform(platform);
    localStorage.setItem('selected_platform', platform);
    if (platform === 'youtube') {
      const youtubeToken = 'youtube-mode';
      setAccessToken(youtubeToken);
      localStorage.setItem('spotify_access_token', youtubeToken);
    }
  };

  const handleBackToPlatformSelect = () => {
    console.log('Going back to platform selection');
    setSelectedPlatform(null);
    setAccessToken(null);
    localStorage.removeItem('selected_platform');
    localStorage.removeItem('spotify_access_token');
  };

  const handleSpotifyAuthenticated = (token) => {
    console.log('Spotify authenticated, token received:', token ? 'YES' : 'NO');
    setAccessToken(token);
    if (token) {
      localStorage.setItem('spotify_access_token', token);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Playlist Creator{selectedPlatform ? ` - ${selectedPlatform === 'spotify' ? 'Spotify' : 'YouTube'}` : ''}</h1>
        <p>Create playlists from your core playlists using fuzzy matching</p>
      </header>
      
      <main>
        {!selectedPlatform ? (
          <div className="platform-selector">
            <h2>Choose your platform:</h2>
            <div className="platform-buttons">
              <button 
                className="platform-button spotify"
                onClick={() => handlePlatformSelect('spotify')}
              >
                <span className="platform-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.359.24-.66.599-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.18 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </span>
                <span className="platform-name">Spotify</span>
                <span className="platform-desc">Create playlists from your Spotify library</span>
              </button>
              <button 
                className="platform-button youtube"
                onClick={() => handlePlatformSelect('youtube')}
              >
                <span className="platform-icon">▶</span>
                <span className="platform-name">YouTube</span>
                <span className="platform-desc">Create playlists from public YouTube core playlists</span>
              </button>
            </div>
          </div>
        ) : selectedPlatform === 'spotify' && !accessToken ? (
          <div>
            <button className="back-button" onClick={handleBackToPlatformSelect}>
              ← Back to platform selection
            </button>
            <SpotifyAuth onAuthenticated={handleSpotifyAuthenticated} />
          </div>
        ) : (
          <div>
            <button className="back-button" onClick={handleBackToPlatformSelect}>
              ← Back to platform selection
            </button>
            <PlaylistCreator 
              accessToken={accessToken} 
              platform={selectedPlatform}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;