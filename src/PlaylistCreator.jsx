import React, { useState, useEffect, useRef } from 'react';
import SpotifyAPI from './SpotifyAPI.jsx';
import YouTubeAPI from './YouTubeAPI.jsx';
import TrelloAPI from './TrelloAPI.jsx';
import FuzzyMatcher from './FuzzyMatcher.jsx';

const PlaylistCreator = ({ accessToken, platform }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [songList, setSongList] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [updateMode, setUpdateMode] = useState('append'); // 'append' or 'reset'
  const [isExistingPlaylist, setIsExistingPlaylist] = useState(false);
  
  // Trello-specific state
  const [selectedBoard, setSelectedBoard] = useState('');
  const [availableBoards, setAvailableBoards] = useState([]);
  const [boardLists, setBoardLists] = useState([]);
  const [selectedLists, setSelectedLists] = useState([]);
  const [songsByColumn, setSongsByColumn] = useState({});
  const [columnsExpanded, setColumnsExpanded] = useState(true);
  const columnsRef = useRef(null);

  const fuzzyMatcher = new FuzzyMatcher();

  // Helper function to calculate playlist differences and updates needed
  const calculatePlaylistDiff = (existingUris, newUris) => {
    const existing = [...existingUris];
    const target = [...newUris];
    
    // Find songs to remove (in existing but not in target)
    const toRemove = existing.filter(uri => !target.includes(uri));
    
    // Find songs to add (in target but not in existing)
    const toAdd = target.filter(uri => !existing.includes(uri));
    
    // Check if reordering is needed
    const existingFiltered = existing.filter(uri => target.includes(uri));
    const targetFiltered = target.filter(uri => existing.includes(uri));
    const needsReorder = !existingFiltered.every((uri, index) => uri === targetFiltered[index]);
    
    return {
      toRemove,
      toAdd,
      needsReorder,
      finalOrder: target
    };
  };

  // Initialize Trello data
  useEffect(() => {
    if (platform === 'trello') {
      const fetchTrelloBoards = async () => {
        try {
          const trelloAPI = new TrelloAPI();
          const boards = await trelloAPI.getConfiguredBoards();
          setAvailableBoards(boards);
          
          // Auto-select if only one board
          if (boards.length === 1) {
            setSelectedBoard(boards[0].id);
          }
        } catch (error) {
          console.error('Error fetching Trello boards:', error);
          setStatus(`Error fetching Trello boards: ${error.message}`);
        }
      };
      
      fetchTrelloBoards();
    }
  }, [platform]);

  // Fetch board lists when board is selected
  useEffect(() => {
    if (platform === 'trello' && selectedBoard) {
      const fetchBoardLists = async () => {
        try {
          const trelloAPI = new TrelloAPI();
          const lists = await trelloAPI.getBoardLists(selectedBoard);
          setBoardLists(lists);
        } catch (error) {
          console.error('Error fetching board lists:', error);
          setStatus(`Error fetching board lists: ${error.message}`);
        }
      };
      
      fetchBoardLists();
    }
  }, [platform, selectedBoard]);

  // Update song list when Trello lists are selected
  useEffect(() => {
    if (platform === 'trello') {
      const updateSongList = () => {
        // Rebuild song list from all selected columns
        const allSongs = [];
        selectedLists.forEach(listId => {
          if (songsByColumn[listId]) {
            allSongs.push(...songsByColumn[listId]);
          }
        });
        
        const songNames = allSongs.join('\n');
        setSongList(songNames);
        localStorage.setItem('playlist_creator_songs', songNames);
      };
      
      updateSongList();
    }
  }, [platform, selectedLists, songsByColumn]);

  // Load persisted songs when component mounts
  useEffect(() => {
    const savedSongs = localStorage.getItem('playlist_creator_songs');
    if (savedSongs && !songList) {
      setSongList(savedSongs);
    }
  }, [songList]);

  // Handle clicks outside the columns area to auto-collapse
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnsRef.current && !columnsRef.current.contains(event.target) && selectedLists.length > 0) {
        setColumnsExpanded(false);
      }
    };

    const handleFocusOutside = (event) => {
      if (columnsRef.current && !columnsRef.current.contains(event.target) && selectedLists.length > 0) {
        setColumnsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('focusin', handleFocusOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('focusin', handleFocusOutside);
    };
  }, [selectedLists.length]);

  // Fetch user's playlists on component mount
  useEffect(() => {
    const fetchUserPlaylists = async () => {
      try {
        let playlists = [];
        
        if (platform === 'spotify') {
          const spotifyAPI = new SpotifyAPI(accessToken);
          const allPlaylists = await spotifyAPI.getUserPlaylists();
          const userProfile = await spotifyAPI.getUserProfile();
          
          // Show all user's own playlists (including core playlists)
          playlists = allPlaylists.filter(playlist => 
            playlist.owner.id === userProfile.id
          );
        } else if (platform === 'youtube') {
          const youtubeAPI = new YouTubeAPI();
          // Wait for YouTube API to load token, then fetch playlists
          await youtubeAPI.loadToken();
          
          if (youtubeAPI.accessToken && youtubeAPI.accessToken !== 'youtube-mode') {
            // Show all user playlists (including core playlists)
            playlists = await youtubeAPI.getUserPlaylists();
          } else {
            console.log('YouTube mode active but no valid OAuth token for user playlists');
          }
        } else if (platform === 'trello') {
          // Trello doesn't have user playlists in the traditional sense
          playlists = [];
        }
        
        console.log('Fetched playlists:', playlists);
        setUserPlaylists(playlists);
      } catch (error) {
        console.error('Error fetching user playlists:', error);
        // For YouTube, show a more specific message about authentication
        if (platform === 'youtube' && error.message.includes('Authentication required')) {
          console.log('YouTube authentication required for user playlists');
        }
      }
    };

    fetchUserPlaylists();
  }, [platform, accessToken]);

  // Handle playlist name input change
  const handlePlaylistNameChange = (value) => {
    setPlaylistName(value);
    setShowDropdown(true);
    
    // Check if this matches an existing playlist
    const existingPlaylist = userPlaylists.find(playlist => 
      playlist.name.toLowerCase() === value.toLowerCase()
    );
    setIsExistingPlaylist(!!existingPlaylist);
  };

  // Handle playlist selection from dropdown
  const handlePlaylistSelect = (playlist) => {
    setPlaylistName(playlist.name);
    setShowDropdown(false);
    setIsExistingPlaylist(true);
  };

  // Handle Trello board selection
  const handleBoardSelect = (boardId) => {
    setSelectedBoard(boardId);
    setSelectedLists([]); // Clear selected lists when board changes
    setBoardLists([]); // Clear current lists
    setSongsByColumn({}); // Clear songs by column mapping
  };

  // Handle Trello list selection
  const handleListToggle = async (listId) => {
    const isCurrentlySelected = selectedLists.includes(listId);
    
    if (isCurrentlySelected) {
      // Remove the list and its songs
      setSelectedLists(prev => {
        const newList = prev.filter(id => id !== listId);
        // Auto-expand when last item is deselected
        if (newList.length === 0) {
          setColumnsExpanded(true);
        }
        return newList;
      });
      setSongsByColumn(prev => {
        const updated = { ...prev };
        delete updated[listId];
        return updated;
      });
    } else {
      // Add the list and fetch its songs
      setSelectedLists(prev => [...prev, listId]);
      
      try {
        const trelloAPI = new TrelloAPI();
        const songs = await trelloAPI.getCardsFromLists([listId]);
        const songNames = songs.map(song => song.name);

        // Get the column name and format it with __
        const selectedList = boardLists.find(list => list.id === listId);
        const columnHeader = selectedList ? `__${selectedList.name}__` : `__Column__`;
        const songsWithHeader = [columnHeader, ...songNames, ''];

        setSongsByColumn(prev => ({
          ...prev,
          [listId]: songsWithHeader
        }));
      } catch (error) {
        console.error('Error fetching songs for list:', error);
        setStatus(`Error fetching songs for column: ${error.message}`);
        // Remove the list from selection if fetching failed
        setSelectedLists(prev => prev.filter(id => id !== listId));
      }
    }
  };

  // Clear songs list
  const handleClearSongs = () => {
    setSongList('');
    localStorage.removeItem('playlist_creator_songs');
    if (platform === 'trello') {
      setSelectedLists([]);
      setSongsByColumn({});
      setColumnsExpanded(true);
    }
  };

  // Copy songs list to clipboard
  const handleCopySongs = async () => {
    try {
      await navigator.clipboard.writeText(songList);
      setStatus('Songs copied to clipboard!');
      // Clear status after 2 seconds
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      console.error('Failed to copy songs:', error);
      setStatus('Failed to copy songs to clipboard');
    }
  };

  // Filter playlists based on current input
  const filteredPlaylists = userPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(playlistName.toLowerCase())
  );

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || !songList.trim()) {
      setStatus('Please enter both a playlist name and a list of songs.');
      return;
    }


    setIsLoading(true);
    setStatus('Starting playlist creation...');
    setResults(null);

    try {
      const songs = songList
        .split('\n')
        .map(song => song.trim())
        .map(song => song.startsWith('  - ') ? song.substring(4).trim() : song)
        .filter(song => song.length > 0 && !(song.startsWith('__') && song.endsWith('__')));

      let allCoreSongs = [];

      if (platform === 'trello') {
        // For Trello, we don't create playlists, we just use it as a source
        // The songs are already populated in the songList from the selected lists
        setStatus('Trello mode: Songs loaded from selected lists. Please switch to Spotify or YouTube to create a playlist.');
        setIsLoading(false);
        return;
      } else if (platform === 'spotify') {
        const spotifyAPI = new SpotifyAPI(accessToken);
        setStatus('Fetching your Spotify playlists...');
        const userPlaylists = await spotifyAPI.getUserPlaylists();
        const userProfile = await spotifyAPI.getUserProfile();
        
        const corePlaylists = userPlaylists.filter(playlist => 
          playlist.name.toLowerCase().includes('core') && 
          playlist.owner.id === userProfile.id
        );

        if (corePlaylists.length === 0) {
          setStatus('No playlists containing "core" found.');
          setIsLoading(false);
          return;
        }

        setStatus(`Found ${corePlaylists.length} core playlist(s). Fetching songs...`);
        
        for (const playlist of corePlaylists) {
          const playlistTracks = await spotifyAPI.getPlaylistTracks(playlist.id);
          allCoreSongs = allCoreSongs.concat(playlistTracks);
        }
      } else if (platform === 'youtube') {
        const youtubeAPI = new YouTubeAPI();
        setStatus('Fetching your YouTube playlists...');
        const userPlaylists = await youtubeAPI.getUserPlaylists();
        
        const corePlaylists = userPlaylists.filter(playlist => 
          playlist.name.toLowerCase().includes('core')
        );

        if (corePlaylists.length === 0) {
          setStatus('No playlists containing "core" found in your account.');
          setIsLoading(false);
          return;
        }

        setStatus(`Found ${corePlaylists.length} core playlist(s). Fetching videos...`);
        
        for (const playlist of corePlaylists) {
          try {
            const videos = await youtubeAPI.getPlaylistVideos(playlist.id);
            allCoreSongs = allCoreSongs.concat(videos);
          } catch (error) {
            console.warn(`Failed to fetch playlist: ${playlist.name}`, error);
          }
        }

        if (allCoreSongs.length === 0) {
          setStatus('No videos found in the core playlists.');
          setIsLoading(false);
          return;
        }
      }

      setStatus('Matching songs using fuzzy search...');
      
      const matchedSongs = [];
      const unmatchedSongs = [];

      for (const inputSong of songs) {
        const match = fuzzyMatcher.findBestMatch(inputSong, allCoreSongs);
        if (match) {
          matchedSongs.push({
            input: inputSong,
            matched: match,
            score: match.score
          });
        } else {
          unmatchedSongs.push(inputSong);
        }
      }

      if (matchedSongs.length === 0) {
        setStatus(`No matching songs found in your ${platform} playlists.`);
        setResults({
          matchedCount: 0,
          unmatchedSongs,
          playlistUrl: null
        });
        setIsLoading(false);
        return;
      }

      if (platform === 'spotify') {
        const spotifyAPI = new SpotifyAPI(accessToken);
        // Check if playlist already exists
        setStatus('Checking for existing playlist...');
        const existingPlaylist = await spotifyAPI.findPlaylistByName(playlistName);
        
        let targetPlaylist;
        let isUpdate = false;
        
        if (existingPlaylist) {
          targetPlaylist = existingPlaylist;
          isUpdate = true;
          
          if (updateMode === 'reset') {
            setStatus('Resetting Spotify playlist...');
            // Clear all existing tracks from the playlist
            const existingTracks = await spotifyAPI.getPlaylistTracks(targetPlaylist.id);
            if (existingTracks.length > 0) {
              const existingTrackUris = existingTracks.map(track => track.uri);
              await spotifyAPI.removeTracksFromPlaylist(targetPlaylist.id, existingTrackUris);
            }
          } else {
            setStatus('Updating existing Spotify playlist...');
          }
        } else {
          setStatus('Creating new Spotify playlist...');
          targetPlaylist = await spotifyAPI.createPlaylist(playlistName);
          // Add new playlist to userPlaylists state
          setUserPlaylists(prev => [targetPlaylist, ...prev]);
          setIsExistingPlaylist(true);
        }

        const trackUris = matchedSongs.map(match => match.matched.uri);
        let addedCount = 0;
        let skippedCount = 0;

        if (isUpdate) {
          setStatus('Analyzing playlist changes...');
          const existingTracks = await spotifyAPI.getPlaylistTracks(targetPlaylist.id);
          const existingTrackUris = existingTracks.map(track => track.uri);

          if (updateMode === 'append') {
            // Append mode: add new songs to the end, keeping existing order
            const newTrackUris = trackUris.filter(uri => !existingTrackUris.includes(uri));
            const finalUris = [...existingTrackUris, ...newTrackUris];
            
            if (newTrackUris.length > 0) {
              setStatus(`Adding ${newTrackUris.length} new song(s) to playlist...`);
              await spotifyAPI.addTracksToPlaylist(targetPlaylist.id, newTrackUris);
            }
            
            addedCount = newTrackUris.length;
            skippedCount = trackUris.length - newTrackUris.length;
          } else {
            // Reset mode: replace entire playlist with new songs in exact order
            setStatus('Updating playlist to match new song order...');
            await spotifyAPI.replacePlaylistTracks(targetPlaylist.id, trackUris);
            addedCount = trackUris.length;
            skippedCount = 0;
          }
        } else {
          // New playlist: just add all songs
          if (trackUris.length > 0) {
            setStatus(`Adding ${trackUris.length} song(s) to playlist...`);
            await spotifyAPI.addTracksToPlaylist(targetPlaylist.id, trackUris);
          }
          addedCount = trackUris.length;
        }

        const statusMessage = isUpdate ? 
          (updateMode === 'reset' ? 
            `Playlist reset! Added ${addedCount} song(s).` :
            `Playlist updated! Added ${addedCount} new song(s).`) :
          'Playlist created successfully!';
        
        setStatus(statusMessage);
        setResults({
          matchedCount: matchedSongs.length,
          addedCount: addedCount,
          skippedCount: skippedCount,
          matchedSongs: matchedSongs,
          unmatchedSongs,
          playlistUrl: targetPlaylist.external_urls.spotify,
          playlistName: targetPlaylist.name,
          isUpdate,
          updateMode: isUpdate ? updateMode : null
        });
      } else if (platform === 'youtube') {
        const youtubeAPI = new YouTubeAPI();
        // Check if playlist already exists
        setStatus('Checking for existing playlist...');
        const existingPlaylist = await youtubeAPI.findPlaylistByName(playlistName);
        
        let targetPlaylist;
        let isUpdate = false;
        
        if (existingPlaylist) {
          targetPlaylist = existingPlaylist;
          isUpdate = true;
          
          if (updateMode === 'reset') {
            setStatus('Resetting YouTube playlist...');
            // Clear all existing videos from the playlist
            const existingVideos = await youtubeAPI.getPlaylistVideos(targetPlaylist.id);
            if (existingVideos.length > 0) {
              const existingVideoUris = existingVideos.map(video => video.uri);
              await youtubeAPI.removeVideosFromPlaylist(targetPlaylist.id, existingVideoUris);
            }
          } else {
            setStatus('Updating existing YouTube playlist...');
          }
        } else {
          setStatus('Creating new YouTube playlist...');
          targetPlaylist = await youtubeAPI.createPlaylist(playlistName);
          // Add new playlist to userPlaylists state
          const newPlaylistItem = {
            id: targetPlaylist.id,
            name: targetPlaylist.name,
            itemCount: 0,
            publishedAt: new Date().toISOString()
          };
          setUserPlaylists(prev => [newPlaylistItem, ...prev]);
          setIsExistingPlaylist(true);
        }

        const videoUris = matchedSongs.map(match => match.matched.uri);
        let addedCount = 0;
        let skippedCount = 0;

        if (isUpdate) {
          setStatus('Analyzing playlist changes...');
          const existingVideos = await youtubeAPI.getPlaylistVideos(targetPlaylist.id);
          const existingVideoUris = existingVideos.map(video => video.uri);

          if (updateMode === 'append') {
            // Append mode: add new videos to the end, keeping existing order
            const newVideoUris = videoUris.filter(uri => !existingVideoUris.includes(uri));
            
            if (newVideoUris.length > 0) {
              setStatus(`Adding ${newVideoUris.length} new video(s) to playlist...`);
              await youtubeAPI.addVideosToPlaylist(targetPlaylist.id, newVideoUris);
            }
            
            addedCount = newVideoUris.length;
            skippedCount = videoUris.length - newVideoUris.length;
          } else {
            // Reset mode: replace entire playlist with new videos in exact order
            setStatus('Updating playlist to match new video order...');
            await youtubeAPI.replacePlaylistVideos(targetPlaylist.id, videoUris);
            addedCount = videoUris.length;
            skippedCount = 0;
          }
        } else {
          // New playlist: just add all videos
          if (videoUris.length > 0) {
            setStatus(`Adding ${videoUris.length} video(s) to playlist...`);
            await youtubeAPI.addVideosToPlaylist(targetPlaylist.id, videoUris);
          }
          addedCount = videoUris.length;
        }

        const statusMessage = isUpdate ? 
          (updateMode === 'reset' ? 
            `Playlist reset! Added ${addedCount} video(s).` :
            `Playlist updated! Added ${addedCount} new video(s).`) :
          'YouTube playlist created successfully!';
        
        setStatus(statusMessage);
        setResults({
          matchedCount: matchedSongs.length,
          addedCount: addedCount,
          skippedCount: skippedCount,
          matchedSongs: matchedSongs,
          unmatchedSongs,
          playlistUrl: targetPlaylist.url,
          playlistName: targetPlaylist.name,
          isUpdate,
          updateMode: isUpdate ? updateMode : null
        });
      }

    } catch (error) {
      console.error('Error creating playlist:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = () => {
    if (isLoading) return 'loading';
    if (status.includes('Error')) return 'error';
    if (status.includes('successfully')) return 'success';
    return '';
  };

  return (
    <div className="playlist-creator">

      {platform !== 'trello' && (
        <div className="form-group">
          <label htmlFor="playlistName">Playlist Name:</label>
        <div className="playlist-dropdown-container">
          <input
            id="playlistName"
            type="text"
            value={playlistName}
            onChange={(e) => handlePlaylistNameChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Enter new playlist name or select existing..."
            disabled={isLoading}
            autoComplete="off"
          />
          {showDropdown && filteredPlaylists.length > 0 && (
            <div className="playlist-dropdown">
              {filteredPlaylists.slice(0, 10).map((playlist) => (
                <div
                  key={playlist.id}
                  className="playlist-dropdown-item"
                  onClick={() => handlePlaylistSelect(playlist)}
                >
                  <div className="playlist-name">{playlist.name}</div>
                  <div className="playlist-info">
                    {platform === 'spotify' ? 
                      `${playlist.tracks?.total || 0} tracks` : 
                      `${playlist.itemCount || 0} videos`
                    }
                  </div>
                </div>
              ))}
              {filteredPlaylists.length > 10 && (
                <div className="playlist-dropdown-more">
                  ... and {filteredPlaylists.length - 10} more
                </div>
              )}
            </div>
          )}
          {platform === 'youtube' && userPlaylists.length === 0 && (
            <div className="youtube-auth-notice">
              <small>To see your existing YouTube playlists, configure YouTube OAuth authentication. See README for setup instructions.</small>
            </div>
          )}
        </div>

        {isExistingPlaylist && (
          <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <label>Update mode:</label>
            <div className="radio-group" style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
              <div className="radio-option" style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                <input
                  type="radio"
                  id="append-mode"
                  name="updateMode"
                  value="append"
                  checked={updateMode === 'append'}
                  onChange={(e) => setUpdateMode(e.target.value)}
                  disabled={isLoading}
                />
                <label htmlFor="append-mode" style={{whiteSpace: 'nowrap'}}>Append new songs</label>
              </div>
              <div className="radio-option" style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                <input
                  type="radio"
                  id="reset-mode"
                  name="updateMode"
                  value="reset"
                  checked={updateMode === 'reset'}
                  onChange={(e) => setUpdateMode(e.target.value)}
                  disabled={isLoading}
                />
                <label htmlFor="reset-mode" style={{whiteSpace: 'nowrap'}}>Match song list</label>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {platform === 'trello' && (
        <>
          <div className="form-group">
            <label htmlFor="trelloBoard">Trello Board:</label>
            <select
              id="trelloBoard"
              value={selectedBoard}
              onChange={(e) => handleBoardSelect(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select a board...</option>
              {availableBoards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBoard && boardLists.length > 0 && (
            <div 
              className="form-group" 
              ref={columnsRef}
              onClick={() => {
                if (!columnsExpanded && selectedLists.length > 0) {
                  setColumnsExpanded(true);
                }
              }}
            >
              <div className="columns-header">
                <label>Select Columns:</label>
                {selectedLists.length > 0 && (
                  <button 
                    type="button"
                    className="expand-collapse-button"
                    onClick={() => setColumnsExpanded(!columnsExpanded)}
                    disabled={isLoading}
                  >
                    {columnsExpanded ? 'Collapse' : 'Expand'}
                  </button>
                )}
              </div>
              <div className={`trello-lists ${columnsExpanded ? 'expanded' : 'collapsed'}`}>
                {columnsExpanded ? (
                  // Show all lists when expanded
                  boardLists.map((list) => (
                    <div
                      key={list.id}
                      className="list-checkbox"
                      onClick={() => handleListToggle(list.id)}
                      style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        id={`list-${list.id}`}
                        checked={selectedLists.includes(list.id)}
                        onChange={() => {}} // Handled by div click
                        disabled={isLoading}
                        style={{ pointerEvents: 'none' }}
                      />
                      <label htmlFor={`list-${list.id}`} style={{ pointerEvents: 'none' }}>{list.name}</label>
                    </div>
                  ))
                ) : (
                  // Show only selected lists when collapsed
                  boardLists
                    .filter(list => selectedLists.includes(list.id))
                    .map((list) => (
                      <div
                        key={list.id}
                        className="list-checkbox"
                        onClick={() => handleListToggle(list.id)}
                        style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          id={`list-${list.id}`}
                          checked={true}
                          onChange={() => {}} // Handled by div click
                          disabled={isLoading}
                          style={{ pointerEvents: 'none' }}
                        />
                        <label htmlFor={`list-${list.id}`} style={{ pointerEvents: 'none' }}>{list.name}</label>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="form-group">
        <div className="songs-header">
          <label htmlFor="songList">
            Songs (one per line):
            {songList.trim() && (
              <span style={{fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                ({songList.split('\n').filter(line => {
                  const trimmed = line.trim();
                  return trimmed && !(trimmed.startsWith('__') && trimmed.endsWith('__'));
                }).length} lines)
              </span>
            )}
          </label>
          {songList.trim() && (
            <div style={{display: 'flex', gap: '8px'}}>
              <button
                type="button"
                className="copy-songs-button"
                onClick={handleCopySongs}
                disabled={isLoading}
              >
                Copy
              </button>
              <button
                type="button"
                className="clear-songs-button"
                onClick={handleClearSongs}
                disabled={isLoading}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <textarea
          id="songList"
          value={songList}
          onChange={(e) => {
            setSongList(e.target.value);
            localStorage.setItem('playlist_creator_songs', e.target.value);
          }}
          placeholder={platform === 'trello' ? 
            "Songs will appear here when you select Trello columns above..." :
            "Enter song names, one per line...\nExample:\nBohemian Rhapsody\nHotel California\nSweet Child O' Mine"
          }
          disabled={isLoading}
        />
      </div>

      <button 
        className="create-button" 
        onClick={handleCreatePlaylist}
        disabled={
          isLoading || 
          !playlistName.trim() || 
          !songList.trim() ||
          (platform === 'trello')
        }
      >
        {platform === 'trello' ? 
          'Switch to Spotify or YouTube to Create Playlist' :
          isLoading ? 
            `${isExistingPlaylist ? 'Updating' : 'Creating'} ${platform === 'spotify' ? 'Spotify' : 'YouTube'} Playlist...` : 
            `${isExistingPlaylist ? 'Update' : 'Create'} ${platform === 'spotify' ? 'Spotify' : 'YouTube'} Playlist`
        }
      </button>

      {status && (
        <div className={`status ${getStatusClass()}`}>
          {status}
        </div>
      )}

      {results && (
        <div className="results">
          <h3>Results</h3>
          <p><strong>Matched songs:</strong> {results.matchedCount}</p>
          
          {results.isUpdate && (
            <>
              <p><strong>Added to playlist:</strong> {results.addedCount} new song(s)</p>
              {results.updateMode === 'append' && results.skippedCount > 0 && (
                <p><strong>Already in playlist:</strong> {results.skippedCount} song(s) (skipped)</p>
              )}
            </>
          )}
          
          {results.playlistUrl && (
            <p>
              <strong>{results.isUpdate ? (results.updateMode === 'reset' ? 'Playlist reset' : 'Playlist updated') : 'Playlist created'}:</strong>{' '}
              <a href={results.playlistUrl} target="_blank" rel="noopener noreferrer">
                {results.playlistName}
              </a>
            </p>
          )}

          {results.matchedSongs && results.matchedSongs.length > 0 && (
            <div>
              <h4>Matched Songs:</h4>
              <ul>
                {results.matchedSongs.map((match, index) => (
                  <li key={index}>
                    <strong>{match.input}</strong> → {match.matched.name} by {match.matched.artists.join(', ')}
                    {match.score && <span style={{color: '#666'}}> (score: {match.score.toFixed(2)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.unmatchedSongs && results.unmatchedSongs.length > 0 && (
            <div>
              <h4>Unmatched Songs:</h4>
              <ul>
                {results.unmatchedSongs.map((song, index) => (
                  <li key={index} style={{color: '#c62828'}}>{song}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaylistCreator;