import React, { useState, useEffect } from 'react';
import SpotifyAuth from './SpotifyAuth';
import YouTubeAuth from './YouTubeAuth';
import PlaylistCreator from './PlaylistCreator';
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [trelloConfigured, setTrelloConfigured] = useState(false);

  // Check if environment variables are configured
  const checkSpotifyConfig = () => {
    const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    return clientId && clientId !== 'YOUR_SPOTIFY_CLIENT_ID' && clientId.trim() !== '';
  };

  const checkYoutubeConfig = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/youtube/config/status');
      const data = await response.json();
      return data.configured;
    } catch (error) {
      console.warn('Error checking YouTube config:', error);
      return false;
    }
  };

  const checkTrelloConfig = () => {
    const trelloBoardIds = process.env.REACT_APP_TRELLO_BOARD_IDS;
    return trelloBoardIds && trelloBoardIds !== 'board1,board2,board3' && trelloBoardIds.trim() !== '';
  };

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

  const checkYouTubeAuth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/youtube/token/status');
      const data = await response.json();
      
      if (data.valid) {
        console.log('YouTube token is valid');
        setAccessToken('youtube-authenticated');
      } else {
        console.log('YouTube token invalid or missing, will show auth');
        setAccessToken(null);
      }
    } catch (error) {
      console.warn('Error checking YouTube auth:', error);
      setAccessToken(null);
    }
  };

  // Check configuration status on mount
  useEffect(() => {
    const checkConfigurations = async () => {
      setSpotifyConfigured(checkSpotifyConfig());
      setYoutubeConfigured(await checkYoutubeConfig());
      setTrelloConfigured(checkTrelloConfig());
    };
    
    checkConfigurations();
  }, []);

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
        // For YouTube, check authentication status
        checkYouTubeAuth();
      } else if (savedPlatform === 'trello') {
        // Trello doesn't require authentication, just mark as ready
        setAccessToken('trello-mode');
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
    // Don't allow selection if platform is not configured
    if (platform === 'spotify' && !spotifyConfigured) return;
    if (platform === 'youtube' && !youtubeConfigured) return;
    if (platform === 'trello' && !trelloConfigured) return;
    
    console.log('Platform selected:', platform);
    setSelectedPlatform(platform);
    localStorage.setItem('selected_platform', platform);
    
    if (platform === 'youtube') {
      // Clear any Spotify tokens when switching to YouTube
      clearSpotifyTokens();
      // Check if YouTube is already authenticated
      checkYouTubeAuth();
    } else if (platform === 'trello') {
      // Clear any existing tokens when switching to Trello
      clearSpotifyTokens();
      // Trello doesn't require authentication
      setAccessToken('trello-mode');
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

  const handleYouTubeAuthenticated = (token) => {
    console.log('YouTube authenticated, token received:', token ? 'YES' : 'NO');
    setAccessToken(token);
    // YouTube tokens are handled server-side, so we just set a flag
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Playlist Creator</h1>
        <p>Create playlists from your core playlists using fuzzy matching</p>
        
        <div className="platform-selector-top">
          <button 
            className={`platform-button-small spotify ${selectedPlatform === 'spotify' ? 'active' : ''} ${!spotifyConfigured ? 'disabled' : ''}`}
            onClick={() => handlePlatformSelect('spotify')}
            disabled={!spotifyConfigured}
            title={!spotifyConfigured ? 'Spotify not configured. Set REACT_APP_SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file' : ''}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.359.24-.66.599-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.18 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </button>
          <button 
            className={`platform-button-small youtube ${selectedPlatform === 'youtube' ? 'active' : ''} ${!youtubeConfigured ? 'disabled' : ''}`}
            onClick={() => handlePlatformSelect('youtube')}
            disabled={!youtubeConfigured}
            title={!youtubeConfigured ? 'YouTube not configured. Add credentials.json file and ensure backend server is running' : ''}
          >
            ▶ YouTube
          </button>
          <button 
            className={`platform-button-small trello ${selectedPlatform === 'trello' ? 'active' : ''} ${!trelloConfigured ? 'disabled' : ''}`}
            onClick={() => handlePlatformSelect('trello')}
            disabled={!trelloConfigured}
            title={!trelloConfigured ? 'Trello not configured. Set REACT_APP_TRELLO_BOARD_IDS in .env file' : ''}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.5 18.5c0 .828-.672 1.5-1.5 1.5H5.5c-.828 0-1.5-.672-1.5-1.5v-13C4 4.672 4.672 4 5.5 4H9c.828 0 1.5.672 1.5 1.5v13zM20 12c0 .828-.672 1.5-1.5 1.5H15c-.828 0-1.5-.672-1.5-1.5V5.5c0-.828.672-1.5 1.5-1.5h3.5c.828 0 1.5.672 1.5 1.5V12z"/>
            </svg>
            Trello
          </button>
        </div>
      </header>
      
      <main>
        {(() => {
          console.log('Render decision:', { 
            selectedPlatform, 
            accessToken: accessToken ? 'EXISTS' : 'NULL',
            showSpotifyAuth: selectedPlatform === 'spotify' && !accessToken,
            showYouTubeAuth: selectedPlatform === 'youtube' && !accessToken
          });
          
          if (selectedPlatform === 'spotify' && !accessToken) {
            return <SpotifyAuth onAuthenticated={handleSpotifyAuthenticated} />;
          } else if (selectedPlatform === 'youtube' && !accessToken) {
            return <YouTubeAuth onAuthenticated={handleYouTubeAuthenticated} />;
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