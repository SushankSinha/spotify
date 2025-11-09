const axios = require('axios');

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Get all Spotify data (top tracks, now playing, followed artists)
const getSpotifyData = async (req, res) => {
  try {
    const token = req.token;
    
    const [topTracks, nowPlaying, followedArtists] = await Promise.all([
      // Get top 10 tracks
      axios.get(`${SPOTIFY_API_BASE}/me/top/tracks?limit=10&time_range=short_term`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      // Get currently playing track
      axios.get(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => {
        // Handle 204 No Content or no active device
        if (err.response?.status === 204) return { data: null };
        throw err;
      }),
      // Get followed artists
      axios.get(`${SPOTIFY_API_BASE}/me/following?type=artist&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    // Format top tracks
    const formattedTopTracks = topTracks.data.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      uri: track.uri,
      url: track.external_urls.spotify,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url
    }));

    // Format now playing
    const formattedNowPlaying = nowPlaying.data?.item ? {
      isPlaying: nowPlaying.data.is_playing,
      name: nowPlaying.data.item.name,
      artist: nowPlaying.data.item.artists.map(a => a.name).join(', '),
      album: nowPlaying.data.item.album.name,
      albumArt: nowPlaying.data.item.album.images[0]?.url,
      url: nowPlaying.data.item.external_urls.spotify,
      duration_ms: nowPlaying.data.item.duration_ms,
      progress_ms: nowPlaying.data.progress_ms
    } : { isPlaying: false, message: 'No track currently playing' };

    // Format followed artists
    const formattedArtists = followedArtists.data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      followers: artist.followers.total,
      popularity: artist.popularity,
      image: artist.images[0]?.url,
      url: artist.external_urls.spotify
    }));

    res.json({
      success: true,
      data: {
        topTracks: formattedTopTracks,
        nowPlaying: formattedNowPlaying,
        followedArtists: formattedArtists
      }
    });
  } catch (error) {
    console.error('Spotify API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to fetch Spotify data'
    });
  }
};

// Pause current playback
const pausePlayback = async (req, res) => {
  try {
    await axios.put(`${SPOTIFY_API_BASE}/me/player/pause`, {}, {
      headers: { 'Authorization': `Bearer ${req.token}` }
    });
    
    res.json({ 
      success: true, 
      message: 'Playback paused' 
    });
  } catch (error) {
    console.error('Pause Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Spotify Premium required for playback control'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'No active device found'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to pause playback'
    });
  }
};

// Start playback
const startPlayback = async (req, res) => {
  try {
    const { trackUri } = req.body;
    
    if (!trackUri) {
      return res.status(400).json({
        success: false,
        error: 'trackUri is required (e.g., spotify:track:xxxxx)'
      });
    }
    
    await axios.put(`${SPOTIFY_API_BASE}/me/player/play`, {
      uris: [trackUri]
    }, {
      headers: { 
        'Authorization': `Bearer ${req.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Playback started',
      trackUri 
    });
  } catch (error) {
    console.error('Play Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Spotify Premium required for playback control'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'No active device found'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to start playback'
    });
  }
};

// Logout - clear authentication cookies
const logout = (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
};

module.exports = {
  getSpotifyData,
  pausePlayback,
  startPlayback,
  logout
};
