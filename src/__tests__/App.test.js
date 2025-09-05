import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the child components to avoid complex dependencies
jest.mock('../SpotifyAuth', () => {
  return function MockSpotifyAuth({ onAuthenticated }) {
    return (
      <div data-testid="spotify-auth">
        <button onClick={() => onAuthenticated('mock_spotify_token')}>
          Authenticate Spotify
        </button>
      </div>
    );
  };
});

jest.mock('../YouTubeAuth', () => {
  return function MockYouTubeAuth({ onAuthenticated }) {
    return (
      <div data-testid="youtube-auth">
        <button onClick={() => onAuthenticated('youtube-authenticated')}>
          Authenticate YouTube
        </button>
      </div>
    );
  };
});

jest.mock('../PlaylistCreator', () => {
  return function MockPlaylistCreator({ accessToken, platform }) {
    return (
      <div data-testid="playlist-creator">
        Platform: {platform}, Token: {accessToken ? 'present' : 'missing'}
      </div>
    );
  };
});

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch.mockClear();
    
    // Mock fetch to return unconfigured YouTube by default
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ configured: false })
    });
  });

  test('should render the app header', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Playlist Creator')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Create playlists from your core playlists using fuzzy matching')).toBeInTheDocument();
  });

  test('should render platform selection buttons', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
      expect(screen.getByText('▶ YouTube')).toBeInTheDocument();
    });
  });

  test('should show Spotify auth when Spotify is selected', async () => {
    render(<App />);
    
    await waitFor(() => {
      const spotifyButton = screen.getByRole('button', { name: /spotify/i });
      expect(spotifyButton).toBeInTheDocument();
      fireEvent.click(spotifyButton);
    });

    expect(screen.getByTestId('spotify-auth')).toBeInTheDocument();
  });

  test('should show playlist creator after authentication', async () => {
    render(<App />);
    
    await waitFor(() => {
      const spotifyButton = screen.getByRole('button', { name: /spotify/i });
      fireEvent.click(spotifyButton);
    });

    const authButton = screen.getByText('Authenticate Spotify');
    fireEvent.click(authButton);

    await waitFor(() => {
      expect(screen.getByTestId('playlist-creator')).toBeInTheDocument();
    });
  });
});