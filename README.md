# Spotify Playlist Creator

A React app that creates Spotify playlists by finding songs from your "core" playlists using fuzzy matching.

## Features

- **Spotify Authentication**: Secure OAuth2 authentication with Spotify
- **Core Playlist Detection**: Automatically finds playlists with "core" in the name (case-insensitive)
- **Fuzzy Matching**: Uses intelligent fuzzy matching to find songs even with slight spelling differences
- **Batch Processing**: Handles multiple songs at once
- **Real-time Feedback**: Shows progress and results of the playlist creation process

## Setup

### 1. Spotify App Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. In your app settings, add `http://localhost:3000` as a redirect URI
4. Copy your Client ID

### 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   REACT_APP_REDIRECT_URI=http://localhost:3000
   ```

### YouTube Setup (Optional)

If you want to use the YouTube playlist feature, you'll also need to configure YouTube API access:

1. **Environment Variables**: Add these to your `.env` file:
   ```
   REACT_APP_YOUTUBE_API_KEY=your_youtube_api_key_here
   REACT_APP_YOUTUBE_ACCESS_TOKEN=your_youtube_oauth_access_token_here
   ```

2. **Google Cloud Console Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the YouTube Data API v3
   - Create credentials (API key and OAuth 2.0 client)

3. **Token File**: Create a `token.json` file in the root directory with your YouTube OAuth credentials:
   ```json
   {
     "token": "your_access_token",
     "refresh_token": "your_refresh_token",
     "token_uri": "https://oauth2.googleapis.com/token",
     "client_id": "your_client_id",
     "client_secret": "your_client_secret",
     "expiry": "2024-01-01T00:00:00.000Z"
   }
   ```

### 3. Installation and Running

```bash
# Install dependencies
npm install

# Start both backend server and React app
npm run dev

# Or run them separately:
# npm run server (runs backend on port 3001)
# npm start (runs React app on port 3000)
```

**Important**: You must run both the backend server (port 3001) and the React app (port 3000) for Spotify authentication to work properly. The backend server handles the OAuth token exchange with Spotify.

The app will be available at `http://localhost:3000`.

## Usage

1. **Authentication**: Click "Connect with Spotify" to authenticate
2. **Enter Playlist Name**: Type the name for your new playlist
3. **Add Songs**: Enter song names, one per line, in the text area
4. **Create Playlist**: Click "Create Playlist" to start the process

The app will:
- Find all your playlists containing "core" in the name
- Extract all songs from those playlists
- Use fuzzy matching to find the best matches for your input songs
- Create a new playlist with the matched songs
- Show you the results with matched and unmatched songs

## How Fuzzy Matching Works

The app uses the Fuse.js library to perform fuzzy string matching with the following criteria:

- **Song Name Weight**: 70% of the matching score
- **Artist Name Weight**: 30% of the matching score
- **Threshold**: 60% similarity required for a match
- **Case Insensitive**: Matching ignores case differences
- **Typo Tolerant**: Handles common spelling mistakes

## Example

Input songs:
```
Bohemian Rhapsody
Hotel California
Sweet Child O Mine
```

The app will find these songs in your core playlists even if they're stored as:
- "Bohemian Rhapsody - Remastered 2011"
- "Hotel California (2013 Remaster)"
- "Sweet Child O' Mine"

## Troubleshooting

### "No playlists containing 'core' found"
- Make sure you have playlists with "core" somewhere in the name
- The search is case-insensitive, so "Core", "CORE", or "core" all work

### "Failed to fetch playlists"
- Check that your Spotify Client ID is correct
- Ensure the redirect URI in your Spotify app matches your local URL
- Try re-authenticating with Spotify

### Songs not matching
- Try using simpler song names (just the title, not including artist)
- Check that the songs exist in your core playlists
- The fuzzy matching threshold can be adjusted in the code if needed

### Authentication redirects back to platform selection
- Ensure the backend server is running on port 3001 (`npm run server`)
- Check that your `.env` file contains all required Spotify environment variables
- Verify your Spotify app's redirect URI matches `http://localhost:3000`
- Check the browser console for authentication errors
- Clear browser localStorage and try authenticating again

## Technical Details

### Dependencies
- **React**: Frontend framework
- **Fuse.js**: Fuzzy string matching
- **Axios**: HTTP requests to Spotify API

### Spotify API Scopes
- `playlist-read-private`: Read private playlists
- `playlist-read-collaborative`: Read collaborative playlists  
- `playlist-modify-public`: Create and modify public playlists
- `playlist-modify-private`: Create and modify private playlists

### File Structure
```
├── server.js           # Backend Express server for OAuth token exchange
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Template for environment variables
├── token.json          # YouTube OAuth credentials (optional)
├── package.json        # Dependencies and scripts
└── src/
    ├── App.js              # Main app component
    ├── App.css             # Styling
    ├── SpotifyAuth.js      # Spotify authentication
    ├── PlaylistCreator.js  # Main playlist creation logic
    ├── SpotifyAPI.js       # Spotify API wrapper
    ├── FuzzyMatcher.js     # Fuzzy matching logic
    └── index.js           # App entry point
```