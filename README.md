# Playlist Creator

A React app that creates playlists on both Spotify and YouTube by finding songs/videos from your "core" playlists using fuzzy matching.

## Features

- **Multi-Platform Support**: Works with both Spotify and YouTube
- **Spotify Authentication**: Secure OAuth2 authentication with PKCE
- **YouTube Authentication**: OAuth2 with automatic token refresh
- **Core Playlist Detection**: Automatically finds playlists with "core" in the name (case-insensitive)
- **Fuzzy Matching**: Uses intelligent fuzzy matching to find songs/videos even with slight spelling differences
- **Real-time Feedback**: Shows progress and results of the playlist creation process
- **Existing Playlist Updates**: Can add to existing playlists or create new ones

## Setup

### 1. Prerequisites - Install Node.js and npm

Before you can run this application, you need to have Node.js and npm installed on your system.

#### Mac

**Option 1: Using Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node
```

**Option 2: Download from Official Website**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the LTS version for macOS
3. Run the installer package (.pkg file)
4. Follow the installation wizard

#### Windows

**Option 1: Download from Official Website (Recommended)**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the LTS version for Windows
3. Run the installer (.msi file)
4. Follow the installation wizard (npm is included automatically)

#### Verify Installation

After installation, verify that Node.js and npm are installed correctly:

**Mac/Linux/Windows:**
```bash
node --version
npm --version
```

You should see version numbers for both commands (e.g., `v18.17.0` for Node.js and `9.6.7` for npm).

### 2. Spotify App Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. In your app settings, add `http://localhost:3000/spotify` as a redirect URI
4. Copy your Client ID

### 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Spotify credentials:
   ```
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   REACT_APP_REDIRECT_URI=http://localhost:3000/spotify
   ```

### 3. YouTube Setup (Optional)

If you want to use the YouTube playlist feature, you only need to configure Google Cloud credentials:

#### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Go to "Credentials" and create:
   - **OAuth 2.0 client ID** (Application type: Desktop application)
   - Download the credentials JSON file

#### Setup File

**Credentials File**: Save the downloaded OAuth credentials as `credentials.json` in the root directory.

**That's it!** The app will automatically handle the OAuth flow when you select YouTube and click "Connect with YouTube". The `token.json` file will be created automatically in the root directory and tokens will be refreshed as needed.

### 5. Installation and Running

#### Install Dependencies

**Mac/Linu/Windows (Command Prompt, PowerShell):**
```bash
npm install
```

#### Start the Application

**Mac/Linux/Windows (Command Prompt, PowerShell):**
```bash
# Start both backend server and React app
npm run dev

# Or run them separately:
# npm run server  # (runs backend on port 3001)
# npm start       # (runs React app on port 3000)
```

**Important**: You must run both the backend server (port 3001) and the React app (port 3000) for Spotify authentication to work properly. The backend server handles the OAuth token exchange with Spotify.

The app will be available at `http://localhost:3000`.

## Usage

1. **Platform Selection**: Choose between Spotify or YouTube at the top of the app
2. **Authentication**: 
   - **Spotify**: Click "Connect with Spotify" to authenticate with your Spotify account
   - **YouTube**: Click "Connect with YouTube" to authenticate with your Google account
3. **Enter Playlist Name**: Type the name for your new playlist (or select an existing one from the dropdown)
4. **Add Songs**: Enter song/video names, one per line, in the text area
5. **Create Playlist**: Click "Create Playlist" to start the process

The app will:
- Find all your playlists containing "core" in the name
- Extract all songs/videos from those playlists
- Use fuzzy matching to find the best matches for your input songs/videos
- Create a new playlist or update an existing one with the matched items
- Show you the results with matched and unmatched items

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
- Check that your `.env` file contains `REACT_APP_SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- Verify your Spotify app's redirect URI matches `http://localhost:3000/spotify`
- Check the browser console for authentication errors
- Clear browser localStorage and try authenticating again

### YouTube "401 Unauthorized" errors
- Check that `token.json` exists in the root directory
- Verify your YouTube token hasn't expired (check the `expiry` field)
- Ensure `credentials.json` contains valid OAuth client credentials
- Try refreshing the token manually: `curl -X POST http://localhost:3001/api/youtube/refresh`
- Check that the backend server is running to handle token refresh

### Platform switching issues
- Clear browser localStorage if switching between platforms shows wrong auth state
- Restart the app after changing platforms if authentication seems stuck
- Check console logs for "Platform selected" and "Render decision" messages

### API call loops or repeated requests
- This was fixed in recent updates - if you see repeated API calls, refresh the page
- Check console for "Spotify API Call" or "YouTube API Call" messages repeating rapidly

## Technical Details

### Dependencies
- **React**: Frontend framework
- **Fuse.js**: Fuzzy string matching
- **Axios**: HTTP requests for backend and API calls
- **Express**: Backend server for OAuth token handling

### Spotify API Scopes
- `playlist-read-private`: Read private playlists
- `playlist-read-collaborative`: Read collaborative playlists  
- `playlist-modify-public`: Create and modify public playlists
- `playlist-modify-private`: Create and modify private playlists

### File Structure
```
├── server.js           # Backend Express server for OAuth token exchange
├── credentials.json    # YouTube OAuth credentials (optional, for YouTube)
├── token.json          # YouTube access/refresh tokens (auto-generated)
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Template for environment variables
├── package.json        # Dependencies and scripts
└── src/
    ├── App.js              # Main app component with platform selection
    ├── App.css             # Styling
    ├── SpotifyAuth.js      # Spotify authentication component
    ├── YouTubeAuth.js      # YouTube authentication component
    ├── PlaylistCreator.js  # Main playlist creation logic (multi-platform)
    ├── SpotifyAPI.js       # Spotify API wrapper
    ├── YouTubeAPI.js       # YouTube API wrapper with token refresh
    ├── FuzzyMatcher.js     # Fuzzy matching logic
    └── index.js           # App entry point
```