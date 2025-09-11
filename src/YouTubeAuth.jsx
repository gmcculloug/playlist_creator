import React, { useEffect, useState } from 'react';

const YouTubeAuth = ({ onAuthenticated }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [error, setError] = useState(null);

  // Check token validity on mount
  useEffect(() => {
    const checkTokenValidity = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/youtube/token/status');
        const data = await response.json();
        setHasValidToken(data.valid);
        
        if (data.valid) {
          onAuthenticated('youtube-authenticated');
        }
      } catch (error) {
        console.warn('Error checking YouTube token status:', error);
        setHasValidToken(false);
      }
    };

    checkTokenValidity();
  }, [onAuthenticated]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('youtube_auth');
    
    if (authResult === 'success') {
      console.log('YouTube authentication successful');
      setHasValidToken(true);
      setIsAuthenticating(false);
      setError(null);
      onAuthenticated('youtube-authenticated');
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    } else if (authResult === 'error') {
      console.error('YouTube authentication failed');
      setIsAuthenticating(false);
      setError('Authentication failed. Please check your credentials.json file and try again.');
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    }
  }, [onAuthenticated]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/youtube/auth-url');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to get authorization URL');
      }
      
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error starting YouTube authentication:', error);
      setError(error.message);
      setIsAuthenticating(false);
    }
  };

  if (isAuthenticating) {
    return (
      <div className="auth-container">
        <h2>Authenticating with YouTube...</h2>
        <p>Please complete the authorization in the popup window.</p>
        <div style={{ padding: '20px', fontSize: '18px' }}>⏳ Processing...</div>
      </div>
    );
  }

  if (hasValidToken) {
    return (
      <div className="auth-container">
        <h2>Already Connected to YouTube</h2>
        <p>You are already authenticated with YouTube and ready to create playlists.</p>
        <div style={{ padding: '20px', fontSize: '16px', color: '#ff0000' }}>✓ Connected</div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>Connect to YouTube</h2>
      <p>To create playlists and access your videos, you need to authenticate with YouTube.</p>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336', 
          borderRadius: '4px',
          color: '#c62828'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <button className="auth-button" onClick={handleLogin}>
        Connect with YouTube
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Setup Instructions:</strong></p>
        <ol style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <li>Create a Google Cloud project at <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a></li>
          <li>Enable the YouTube Data API v3</li>
          <li>Create OAuth 2.0 credentials (Desktop application type)</li>
          <li>Download and save as <code>credentials.json</code> in the project root</li>
          <li>Ensure the backend server is running (<code>npm run server</code>)</li>
        </ol>
      </div>
    </div>
  );
};

export default YouTubeAuth;