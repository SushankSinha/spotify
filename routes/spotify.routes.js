const express = require('express');
const router = express.Router();
const { requireSpotifyAuth } = require('../middleware/auth-middleware');
const spotifyController = require('../controller/spotify.controller');

// GET /spotify - Get all Spotify data (top tracks, now playing, followed artists)
router.get('/', requireSpotifyAuth, spotifyController.getSpotifyData);

// POST /spotify/pause - Pause current playback
router.post('/pause', requireSpotifyAuth, spotifyController.pausePlayback);

// POST /spotify/play - Start playback with specified track URI
router.post('/play', requireSpotifyAuth, spotifyController.startPlayback);

// POST /spotify/logout - Clear authentication cookies
router.post('/logout', spotifyController.logout);

module.exports = router;
