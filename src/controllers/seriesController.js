const fs = require('fs').promises;
const path = require('path');

const seriesPath = path.join(__dirname, '../data/series.json');

exports.getAllSeries = async (req, res) => {
  try {
    const data = await fs.readFile(seriesPath, 'utf8');
    const series = JSON.parse(data);
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer las series' });
  }
};

exports.getSeriesById = async (req, res) => {
  try {
    const data = await fs.readFile(seriesPath, 'utf8');
    const series = JSON.parse(data);
    const item = series.find(s => s.id === parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: 'Serie no encontrada' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar la serie' });
  }
};

exports.getEpisodeEmbed = (req, res) => {
  const { id } = req.params;
  const { s, e, tmdb, imdb } = req.query;
  
  if (!s || !e) return res.status(400).json({ error: 'Se requiere temporada (s) y episodio (e)' });
  
  const videoId = imdb || id;
  const tmdbParam = tmdb ? '&tmdb=1' : '';
  
  res.json({
    simple: `https://multiembed.mov/?video_id=${videoId}&s=${s}&e=${e}${tmdbParam}`,
    vip: `https://multiembed.mov/directstream.php?video_id=${videoId}&s=${s}&e=${e}${tmdbParam}`
  });
};