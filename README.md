# Playlist Creator

A React app that creates playlists on Spotify and YouTube by finding songs/videos from your "core" playlists using fuzzy matching. Also supports importing songs from Trello boards for playlist creation.

## Features

- **Multi-Platform Support**: Works with Spotify, YouTube, and Trello
- **Spotify Authentication**: Secure OAuth2 authentication with PKCE
- **YouTube Authentication**: OAuth2 with automatic token refresh
- **Trello Integration**: Import songs from Trello board columns for playlist creation
- **Core Playlist Detection**: Automatically finds playlists with "core" in the name (case-insensitive)
- **Fuzzy Matching**: Uses intelligent fuzzy matching to find songs/videos even with slight spelling differences
- **Real-time Feedback**: Shows progress and results of the playlist creation process
- **Smart Playlist Updates**: Intelligently update existing playlists with append or reset modes
- **Diff-based Updates**: Only makes necessary changes to preserve playlist efficiency
- **Cross-Platform Song Management**: Import songs from Trello and create playlists on Spotify or YouTube


Creating Playlists
![alt text](<images/screenshot 1.png>)

Trello Integration
![alt text](<images/screenshot - trello.png>)

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
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   VITE_REDIRECT_URI=http://localhost:3000/spotify
   ```

### 3. Trello Setup (Optional)

If you want to use the Trello integration to import songs from Trello boards:

1. Edit `.env` and add your Trello board IDs:
   ```
   VITE_TRELLO_BOARD_IDS=board_id_1,board_id_2,board_id_3
   ```

2. To find your Trello board IDs:
   - Open your Trello board in a web browser
   - The board ID is in the URL: `https://trello.com/b/BOARD_ID/board-name`
   - Copy the BOARD_ID part (e.g., `5f8a1b2c3d4e5f67`)

**Note**: The Trello integration uses public API endpoints with fallback to mock data for demonstration. For production use with private boards, you would need to add Trello API authentication.

### 4. YouTube Setup (Optional)

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

### Basic Workflow

1. **Platform Selection**: Choose between Spotify, YouTube, or Trello at the top of the app
2. **Authentication** (Spotify/YouTube only): 
   - **Spotify**: Click "Connect with Spotify" to authenticate with your Spotify account
   - **YouTube**: Click "Connect with YouTube" to authenticate with your Google account
   - **Trello**: No authentication required - uses board IDs from configuration
3. **Song Input**: Choose your method for adding songs:
   - **Manual Entry**: Type song names directly in the text area
   - **Trello Import**: Select a Trello board and columns to automatically populate songs
4. **Playlist Configuration**:
   - **New Playlist**: Enter a new playlist name and click "Create Playlist"
   - **Existing Playlist**: Type or select an existing playlist name to see update options:
     - **Append new songs**: Add new songs to the end of the existing playlist
     - **Match song list**: Replace the entire playlist with the new song list in exact order
5. **Create/Update**: Click the button to create a new playlist or update an existing one

### Trello Workflow

1. **Select Trello**: Click the Trello button to access the import feature
2. **Choose Board**: Select a Trello board from the dropdown (auto-selects if only one configured)
3. **Select Columns**: Check the columns/lists you want to import songs from
4. **Review Songs**: Songs from selected columns automatically appear in the text area
5. **Switch Platform**: Click Spotify or YouTube to create playlists with the imported songs
6. **Create Playlist**: Enter a playlist name and click "Create Playlist"

The app will:
- Find all your playlists containing "core" in the name
- Extract all songs/videos from those playlists
- Use fuzzy matching to find the best matches for your input songs/videos
- Create a new playlist or update an existing one with the matched items
- Show you the results with matched and unmatched items

### Playlist Update Modes

When updating an existing playlist, you can choose between two modes:

#### Append New Songs Mode
- **Behavior**: Adds new songs to the end of the existing playlist
- **Preserves**: All existing songs remain in their current order
- **Efficiency**: Only adds songs that aren't already in the playlist
- **Use Case**: Gradually expanding a playlist while keeping existing content

#### Match Song List Mode  
- **Behavior**: Replaces the entire playlist with the new song list
- **Order**: Songs appear in the exact order specified in the "Songs" field
- **Efficiency**: Uses smart diff algorithm to minimize API calls
- **Use Case**: Completely restructuring a playlist or ensuring exact ordering

### Smart Diff Algorithm

The app uses an intelligent update system that:
- **Analyzes** existing playlist content before making changes
- **Minimizes** API calls by only performing necessary operations
- **Preserves** song order according to the selected mode
- **Reports** detailed statistics about added, skipped, and updated songs

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
- Check that your `.env` file contains `VITE_SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
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

### Trello Issues

### Trello board not showing
- Verify your board IDs are correct in the `.env` file
- Check that the board IDs are comma-separated without spaces
- Ensure you're using the board ID from the URL, not the board name

### Trello columns not loading
- The integration uses public API endpoints and may fall back to mock data
- For private boards, the API calls will fail gracefully and show demo columns
- Check browser console for "Getting lists for board" messages

### Songs not importing from Trello
- Verify the column checkboxes are properly selected
- Check that cards in the Trello columns contain song names
- The app extracts song names from card titles and descriptions

### Playlist Update Issues

### Radio buttons not appearing
- Radio buttons only show when typing or selecting an existing playlist name
- Ensure you have existing playlists that match the typed name
- Try selecting from the dropdown to confirm playlist detection

### Update mode not working as expected
- **Append new songs**: Only adds songs not already in the playlist - check if songs already exist
- **Match song list**: Completely replaces playlist content - verify this is the intended behavior
- Check the results section for detailed statistics about what was added/skipped

### Playlist order incorrect after update
- **Match song list**: Playlist order matches the exact order in the "Songs" field
- **Append new songs**: New songs are added to the end, existing songs keep their positions
- Clear the playlist and recreate if order is critical

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
    ├── TrelloAPI.js        # Trello API wrapper for board and card access
    ├── FuzzyMatcher.js     # Fuzzy matching logic
    └── index.js           # App entry point
```