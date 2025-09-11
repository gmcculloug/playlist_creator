import React, { useEffect, useState } from 'react';

const SpotifyAuth = ({ onAuthenticated }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  
  const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID';
  const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/spotify`;
  const SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ');

  // Function to check if Spotify token is valid
  const isSpotifyTokenValid = (token, expiry) => {
    if (!token || !expiry) return false;
    const expiryTime = new Date(expiry);
    const now = new Date();
    // Add 5 minute buffer before expiry
    return expiryTime.getTime() > (now.getTime() + 5 * 60 * 1000);
  };

  // Check token validity on mount and when localStorage changes
  useEffect(() => {
    const checkTokenValidity = () => {
      const existingToken = localStorage.getItem('spotify_access_token');
      const existingExpiry = localStorage.getItem('spotify_token_expiry');
      setHasValidToken(isSpotifyTokenValid(existingToken, existingExpiry));
    };

    checkTokenValidity();
    
    // Listen for storage events to detect token changes
    window.addEventListener('storage', checkTokenValidity);
    
    return () => {
      window.removeEventListener('storage', checkTokenValidity);
    };
  }, []);

  // Generate code verifier and challenge for PKCE
  const generateCodeVerifier = () => {
    const array = new Uint32Array(56/2);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  };

  const generateCodeChallenge = async (codeVerifier) => {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  useEffect(() => {
    const handleAuthorizationCode = async (code) => {
      setIsAuthenticating(true);
      const codeVerifier = localStorage.getItem('code_verifier');
      
      if (!codeVerifier) {
        console.error('Code verifier not found');
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/spotify/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            codeVerifier: codeVerifier,
            redirectUri: REDIRECT_URI,
            clientId: CLIENT_ID,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Server response:', response.status, errorData);
          
          if (response.status === 404) {
            throw new Error('Backend server not responding. Make sure to run "npm run server" in a separate terminal.');
          } else if (response.status === 400) {
            throw new Error('Invalid Spotify credentials. Check your .env file has correct VITE_SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
          } else {
            throw new Error(`Server error (${response.status}): ${errorData}`);
          }
        }

        const data = await response.json();
        console.log('Successfully received access token');
        
        // Calculate expiry time (Spotify tokens typically last 1 hour)
        const expiryTime = new Date();
        expiryTime.setSeconds(expiryTime.getSeconds() + (data.expires_in || 3600));
        
        // Save token and expiry to localStorage
        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_token_expiry', expiryTime.toISOString());
        localStorage.setItem('selected_platform', 'spotify');
        
        // Update token validity state
        setHasValidToken(true);
        
        localStorage.removeItem('code_verifier');
        window.history.replaceState({}, document.title, '/');
        onAuthenticated(data.access_token);
      } catch (error) {
        console.error('Error exchanging code for token:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'Failed to complete authentication';
        alert(`Authentication failed: ${errorMessage}\n\nPlease ensure:\n1. The backend server is running (npm run server)\n2. VITE_SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set in .env\n3. Redirect URI is configured in Spotify app settings`);
        
        // Reset URL on error to remove the code parameter
        window.history.replaceState({}, document.title, '/');
      } finally {
        setIsAuthenticating(false);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Remove the code from URL immediately to prevent reuse
      window.history.replaceState({}, document.title, '/');
      handleAuthorizationCode(code);
    }
  }, [onAuthenticated, REDIRECT_URI]);

  const handleLogin = async () => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    localStorage.setItem('code_verifier', codeVerifier);
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `code_challenge_method=S256&` +
      `code_challenge=${codeChallenge}`;
    
    window.location.href = authUrl;
  };

  if (isAuthenticating) {
    return (
      <div className="auth-container">
        <h2>Authenticating with Spotify...</h2>
        <p>Please wait while we complete your authentication.</p>
        <div style={{ padding: '20px', fontSize: '18px' }}>⏳ Processing...</div>
      </div>
    );
  }

  if (hasValidToken) {
    return (
      <div className="auth-container">
        <h2>Already Connected to Spotify</h2>
        <p>You are already authenticated with Spotify and ready to create playlists.</p>
        <div style={{ padding: '20px', fontSize: '16px', color: '#1db954' }}>✓ Connected</div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>Connect to Spotify</h2>
      <p>To create playlists and access your music, you need to authenticate with Spotify.</p>
      <button className="auth-button" onClick={handleLogin}>
        Connect with Spotify
      </button>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Setup Instructions:</strong></p>
        <ol style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <li>Create a Spotify app at <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">developer.spotify.com</a></li>
          <li>Add <code>{REDIRECT_URI}</code> as a redirect URI in your app settings</li>
          <li>Set your Client ID in the environment variable <code>VITE_SPOTIFY_CLIENT_ID</code></li>
          <li>Client Secret is stored securely as <code>SPOTIFY_CLIENT_SECRET</code> (not exposed to browser)</li>
        </ol>
      </div>
    </div>
  );
};

export default SpotifyAuth;