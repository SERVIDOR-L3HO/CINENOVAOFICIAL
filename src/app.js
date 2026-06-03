const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const path = require('path');
const movieRoutes = require('./routes/movieRoutes');
const seriesRoutes = require('./routes/seriesRoutes');
const tvRoutes = require('./routes/tvRoutes');

const app = express();

const axios = require('axios');

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Proxy de stream (oculta la fuente real al navegador)
app.get('/api/stream', async (req, res) => {
  try {
    const { get } = req.query;
    if (!get) return res.status(400).send('Parámetro requerido');

    const upstreamUrl = `https://ultragol-api-3-six.vercel.app/ultragol-l3ho?get=${encodeURIComponent(get)}`;

    const upstream = await axios.get(upstreamUrl, {
      timeout: 15000,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://ultragol-api-3-six.vercel.app/',
        'Origin': 'https://ultragol-api-3-six.vercel.app'
      }
    });

    const contentType = upstream.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }

    upstream.data.pipe(res);

    upstream.data.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) res.status(500).send('Error en el stream');
    });
  } catch (err) {
    console.error('Error in /api/stream:', err.message);
    if (!res.headersSent) res.status(500).send('Error de conexión con la fuente');
  }
});

// Proxy para el reproductor SuperVideo
app.get('/api/player', async (req, res) => {
  try {
    const { video_id, tmdb, season, s, episode, e } = req.query;
    const is_tmdb = tmdb || 0;
    const ses = season || s || 0;
    const epi = episode || e || 0;
    
    const requestUrl = `https://getsuperembed.link/?video_id=${video_id}&tmdb=${is_tmdb}&season=${ses}&episode=${epi}&player_font=Poppins&player_bg_color=000000&player_font_color=ffffff&player_primary_color=34cfeb&player_secondary_color=6900e0&player_loader=1&preferred_server=0&player_sources_toggle_type=2`;
    
    const response = await axios.get(requestUrl, { timeout: 10000 });
    const playerUrl = response.data;
    
    if (playerUrl && typeof playerUrl === 'string' && playerUrl.startsWith('https://')) {
      res.redirect(playerUrl);
    } else {
      res.status(500).send('El proveedor no devolvió un enlace válido');
    }
  } catch (err) {
    console.error('Error in /api/player:', err.message);
    res.status(500).send('Error de conexión con el proveedor de video');
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/tv', tvRoutes);

// Root path handler
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Catch-all for Frontend (Non-API)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

module.exports = app;