import React, { useState, useEffect } from 'react';
import SpotifyAuth from './SpotifyAuth';
import PlaylistCreator from './PlaylistCreator';
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  // Function to check if Spotify token is valid
  const isSpotifyTokenValid = (token, expiry) => {
    if (!token || !expiry) return false;
    const expiryTime = new Date(expiry);
    const now = new Date();
    // Add 5 minute buffer before expiry
    return expiryTime.getTime() > (now.getTime() + 5 * 60 * 1000);
  };

  const clearSpotifyTokens = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
  };

  // Restore state from localStorage on mount
  useEffect(() => {
    // Check if this is a Spotify callback
    if (window.location.pathname === '/spotify') {
      console.log('Spotify callback detected, selecting Spotify platform');
      setSelectedPlatform('spotify');
      return;
    }

    const savedToken = localStorage.getItem('spotify_access_token');
    const savedExpiry = localStorage.getItem('spotify_token_expiry');
    const savedPlatform = localStorage.getItem('selected_platform');
    
    if (savedPlatform) {
      setSelectedPlatform(savedPlatform);
      
      if (savedPlatform === 'youtube') {
        // For YouTube, just set the token mode
        setAccessToken('youtube-mode');
      } else if (savedPlatform === 'spotify' && savedToken && savedExpiry) {
        // Make sure we don't have YouTube token in Spotify storage
        if (savedToken === 'youtube-mode') {
          console.log('Found YouTube token in Spotify storage, clearing');
          clearSpotifyTokens();
          setAccessToken(null);
        } else if (isSpotifyTokenValid(savedToken, savedExpiry)) {
          console.log('Restoring valid saved Spotify token:', { expiry: savedExpiry });
          setAccessToken(savedToken);
        } else {
          console.log('Saved Spotify token expired, clearing localStorage');
          clearSpotifyTokens();
          setAccessToken(null);
        }
      }
    }
  }, []);

  const handlePlatformSelect = (platform) => {
    console.log('Platform selected:', platform);
    setSelectedPlatform(platform);
    localStorage.setItem('selected_platform', platform);
    
    if (platform === 'youtube') {
      // Clear any Spotify tokens when switching to YouTube
      clearSpotifyTokens();
      const youtubeToken = 'youtube-mode';
      setAccessToken(youtubeToken);
    } else if (platform === 'spotify') {
      // Check if user already has valid Spotify token
      const savedToken = localStorage.getItem('spotify_access_token');
      const savedExpiry = localStorage.getItem('spotify_token_expiry');
      console.log('Checking Spotify token:', { token: savedToken ? 'EXISTS' : 'NONE', expiry: savedExpiry });
      
      // Make sure we're not confusing YouTube tokens with Spotify tokens
      if (savedToken === 'youtube-mode') {
        console.log('Found YouTube token in Spotify storage, clearing for fresh auth');
        clearSpotifyTokens();
        setAccessToken(null);
      } else if (isSpotifyTokenValid(savedToken, savedExpiry)) {
        console.log('Using existing valid Spotify token');
        setAccessToken(savedToken);
      } else {
        console.log('No valid Spotify token found, will show auth');
        clearSpotifyTokens();
        setAccessToken(null);
      }
    }
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
        <h1>Playlist Creator</h1>
        <p>Create playlists from your core playlists using fuzzy matching</p>
        
        <div className="platform-selector-top">
          <button 
            className={`platform-button-small spotify ${selectedPlatform === 'spotify' ? 'active' : ''}`}
            onClick={() => handlePlatformSelect('spotify')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.359.24-.66.599-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.18 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </button>
          <button 
            className={`platform-button-small youtube ${selectedPlatform === 'youtube' ? 'active' : ''}`}
            onClick={() => handlePlatformSelect('youtube')}
          >
            ▶ YouTube
          </button>
        </div>
      </header>
      
      <main>
        {(() => {
          console.log('Render decision:', { 
            selectedPlatform, 
            accessToken: accessToken ? 'EXISTS' : 'NULL',
            showSpotifyAuth: selectedPlatform === 'spotify' && !accessToken
          });
          
          if (selectedPlatform === 'spotify' && !accessToken) {
            return <SpotifyAuth onAuthenticated={handleSpotifyAuthenticated} />;
          } else if (selectedPlatform) {
            return (
              <PlaylistCreator 
                accessToken={accessToken} 
                platform={selectedPlatform}
              />
            );
          } else {
            return (
              <div className="no-platform-selected">
                <p>Select a platform above to get started</p>
              </div>
            );
          }
        })()}
      </main>
    </div>
  );
}

export default App;