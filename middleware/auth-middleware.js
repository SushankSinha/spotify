const axios = require('axios');
const querystring = require('querystring');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Get valid access token, refresh if needed
const getValidAccessToken = async (req, res) => {
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

  // If access token exists and is valid, return it
  if (accessToken) {
    return accessToken;
  }

  // If no refresh token, user needs to authenticate
  if (!refreshToken) {
    throw new Error('No refresh token available. Please login at /login');
  }

  // Refresh the access token
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const tokenData = response.data;

    // Set new access token cookie
    res.cookie('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: tokenData.expires_in * 1000
    });

    // Update refresh token if new one is provided
    if (tokenData.refresh_token) {
      res.cookie('refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
};

// Middleware: attach access token to req.token
const requireSpotifyAuth = async (req, res, next) => {
  try {
    const token = await getValidAccessToken(req, res);
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ 
      error: 'Authentication failed',
      message: err.message,
      loginUrl: '/login'
    });
  }
};

module.exports = { requireSpotifyAuth };
