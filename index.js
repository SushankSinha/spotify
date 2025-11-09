const express = require('express');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const querystring = require('querystring');
const spotifyRouter = require('./routes/spotify.routes');

const app = express();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Login route - redirects to Spotify authorization
app.get('/login', (req, res) => {
  const scope = 'user-top-read user-read-currently-playing user-follow-read user-modify-playback-state user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI
    }));
});

// Callback route - handles authorization code exchange
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    // Store tokens in httpOnly cookies for security
    res.cookie('access_token', response.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: response.data.expires_in * 1000 // Convert to milliseconds
    });
    
    res.cookie('refresh_token', response.data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Redirect to your frontend or success page
    res.redirect('/spotify');
  } catch (error) {
    console.error('Auth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Spotify routes with auth middleware
app.use('/spotify', spotifyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
