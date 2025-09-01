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

    // Save updated token to file
    const tokenPath = path.join(__dirname, 'token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(updatedToken, null, 2));
    
    // Also update the public version
    const publicTokenPath = path.join(__dirname, 'public', 'token.json');
    fs.writeFileSync(publicTokenPath, JSON.stringify(updatedToken, null, 2));

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
  const { code, codeVerifier, redirectUri } = req.body;

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: process.env.SPOTIFY_CLIENT_ID,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});