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

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Permitir iframes de streaming
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/tv', tvRoutes);

// Serve Frontend
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

module.exports = app;