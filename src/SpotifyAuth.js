import React, { useEffect } from 'react';

const SpotifyAuth = ({ onAuthenticated }) => {
  const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID';
  const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || window.location.origin;
  const SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ');

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
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for token');
        }

        const data = await response.json();
        console.log('Successfully received access token');
        localStorage.removeItem('code_verifier');
        window.history.replaceState({}, document.title, window.location.pathname);
        onAuthenticated(data.access_token);
      } catch (error) {
        console.error('Error exchanging code for token:', error);
        // Reset URL on error to remove the code parameter
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
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
          <li>Set your Client ID in the environment variable <code>REACT_APP_SPOTIFY_CLIENT_ID</code></li>
          <li>Client Secret is stored securely as <code>SPOTIFY_CLIENT_SECRET</code> (not exposed to browser)</li>
        </ol>
      </div>
    </div>
  );
};

export default SpotifyAuth;