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

// Exportar para Vercel
module.exports = app;

// Solo escuchar si no estamos en Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor API profesional corriendo en http://0.0.0.0:${PORT}`);
  });
}