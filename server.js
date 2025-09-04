const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let youtubeToken = null;
let youtubeCredentials = null;

// Load YouTube credentials
try {
  const credentialsPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(credentialsPath)) {
    const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
    youtubeCredentials = JSON.parse(credentialsData);
  }
} catch (error) {
  console.warn('Could not load credentials.json:', error.message);
}

// Function to check if token is valid (not expired)
const isTokenValid = (token) => {
  if (!token || !token.expiry) return false;
  const expiryTime = new Date(token.expiry);
  const now = new Date();
  // Add 5 minute buffer before expiry
  return expiryTime.getTime() > (now.getTime() + 5 * 60 * 1000);
};

// Function to refresh YouTube token
const refreshYouTubeToken = async (token) => {
  if (!youtubeCredentials || !token.refresh_token) {
    throw new Error('No credentials or refresh token available');
  }

  const credentials = youtubeCredentials.installed;
  
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Update token with new access token and expiry
    const updatedToken = {
      ...token,
      token: response.data.access_token,
      expiry: new Date(Date.now() + response.data.expires_in * 1000).toISOString()
    };

    // Save updated token to root directory only
    const tokenPath = path.join(__dirname, 'token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(updatedToken, null, 2));

    return updatedToken;
  } catch (error) {
    console.error('Failed to refresh YouTube token:', error.response?.data || error.message);
    throw error;
  }
};

// Function to load and validate YouTube token
const loadYouTubeToken = async () => {
  try {
    const tokenPath = path.join(__dirname, 'token.json');
    if (fs.existsSync(tokenPath)) {
      const tokenData = fs.readFileSync(tokenPath, 'utf8');
      youtubeToken = JSON.parse(tokenData);
      
      // Check if token is valid
      if (!isTokenValid(youtubeToken)) {
        console.log('YouTube token is expired, attempting to refresh...');
        try {
          youtubeToken = await refreshYouTubeToken(youtubeToken);
          console.log('YouTube token refreshed successfully');
        } catch (error) {
          console.warn('Failed to refresh YouTube token:', error.message);
          youtubeToken = null;
        }
      } else {
        console.log('YouTube token is valid');
      }
    }
  } catch (error) {
    console.warn('Could not load token.json:', error.message);
  }
};

// Load token on startup
loadYouTubeToken();

app.post('/api/spotify/token', async (req, res) => {
  const { code, codeVerifier, redirectUri, clientId } = req.body;

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        code_verifier: codeVerifier,
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(400).json({ 
      error: 'Failed to exchange code for token',
      details: error.response?.data || error.message 
    });
  }
});

// YouTube OAuth authorization URL
app.get('/api/youtube/auth-url', (req, res) => {
  if (!youtubeCredentials) {
    return res.status(400).json({
      error: 'YouTube credentials not available',
      details: 'credentials.json file not found'
    });
  }

  const credentials = youtubeCredentials.installed;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${credentials.client_id}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3001/api/youtube/callback')}&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl')}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.json({ authUrl });
});

// YouTube OAuth callback
app.get('/api/youtube/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  if (!youtubeCredentials) {
    return res.status(400).send('YouTube credentials not available');
  }

  try {
    const credentials = youtubeCredentials.installed;
    
    const response = await axios.post('https://oauth2.googleapis.com/token', 
      new URLSearchParams({
        code: code,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        redirect_uri: 'http://localhost:3001/api/youtube/callback',
        grant_type: 'authorization_code'
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Create token object
    const tokenData = {
      token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_uri: 'https://oauth2.googleapis.com/token',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      scopes: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ],
      universe_domain: 'googleapis.com',
      account: '',
      expiry: new Date(Date.now() + response.data.expires_in * 1000).toISOString()
    };

    // Save token to root directory only
    const tokenPath = path.join(__dirname, 'token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
    
    // Update in-memory token
    youtubeToken = tokenData;

    console.log('YouTube OAuth successful, token saved');
    
    // Redirect back to frontend
    res.redirect('http://localhost:3000?youtube_auth=success');
  } catch (error) {
    console.error('YouTube OAuth error:', error.response?.data || error.message);
    res.redirect('http://localhost:3000?youtube_auth=error');
  }
});

app.post('/api/youtube/refresh', async (req, res) => {
  if (!youtubeToken) {
    return res.status(400).json({ 
      error: 'YouTube token not available',
      details: 'token.json file not found or invalid' 
    });
  }

  try {
    youtubeToken = await refreshYouTubeToken(youtubeToken);
    res.json({ 
      success: true, 
      access_token: youtubeToken.token,
      expires_in: Math.floor((new Date(youtubeToken.expiry) - new Date()) / 1000)
    });
  } catch (error) {
    console.error('YouTube token refresh error:', error.message);
    res.status(400).json({ 
      error: 'Failed to refresh token',
      details: error.message 
    });
  }
});

// Add an endpoint to check token validity
app.get('/api/youtube/token/status', (req, res) => {
  if (!youtubeToken) {
    return res.json({ valid: false, reason: 'No token available' });
  }
  
  const valid = isTokenValid(youtubeToken);
  res.json({ 
    valid,
    expiry: youtubeToken.expiry,
    reason: valid ? 'Token is valid' : 'Token is expired'
  });
});

// YouTube configuration status endpoint
app.get('/api/youtube/config/status', (req, res) => {
  const configured = youtubeCredentials !== null;
  res.json({ 
    configured,
    reason: configured ? 'credentials.json loaded successfully' : 'credentials.json not found or invalid'
  });
});

// Add an endpoint to get current access token (for authenticated requests)
app.get('/api/youtube/token', (req, res) => {
  if (!youtubeToken) {
    return res.status(400).json({ 
      error: 'No YouTube token available',
      details: 'Authentication required' 
    });
  }

  if (!isTokenValid(youtubeToken)) {
    return res.status(401).json({ 
      error: 'Token expired',
      details: 'Token refresh needed' 
    });
  }

  res.json({ 
    access_token: youtubeToken.token,
    expires_in: Math.floor((new Date(youtubeToken.expiry) - new Date()) / 1000)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});