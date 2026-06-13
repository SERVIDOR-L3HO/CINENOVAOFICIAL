const express = require('express');
const router = express.Router();
const pelisplus = require('../services/pelisplus.service');
const repelishd = require('../services/repelishd.service');

function pickBestMatch(results, query) {
  if (!results || results.length === 0) return null;
  const q = query.toLowerCase().trim();
  const exact = results.find(r => r.title.toLowerCase() === q);
  if (exact) return exact;
  const starts = results.find(r => r.title.toLowerCase().startsWith(q));
  if (starts) return starts;
  const includes = results.find(r => r.title.toLowerCase().includes(q));
  if (includes) return includes;
  return results[0];
}

router.get('/servers', async (req, res) => {
  try {
    const { title, type = 'movie', season = 1, episode = 1 } = req.query;
    if (!title) return res.status(400).json({ error: 'Se requiere el parámetro title' });

    let servers = [];
    let source = null;

    // ── 1. Buscar en PelisPlus ──
    try {
      const ppResults = await pelisplus.searchContent(title);
      const match = pickBestMatch(ppResults, title);
      if (match) {
        if (type === 'series' || type === 'anime') {
          servers = await pelisplus.getEpisodeServers(match.slug, season, episode);
        } else {
          servers = await pelisplus.getMovieServers(match.slug);
        }
        if (servers.length > 0) source = 'pelisplus';
      }
    } catch (e) {
      console.error('[PelisPlus] error en búsqueda:', e.message);
    }

    // ── 2. Fallback a RePelisHD (solo películas por ahora) ──
    if (servers.length === 0 && type === 'movie') {
      try {
        const rpResults = await repelishd.searchContent(title);
        const match = pickBestMatch(rpResults, title);
        if (match) {
          servers = await repelishd.getMovieServers(match.slug);
          if (servers.length > 0) source = 'repelishd';
        }
      } catch (e) {
        console.error('[RePelisHD] error en búsqueda:', e.message);
      }
    }

    res.json({ success: true, source, servers });
  } catch (err) {
    console.error('[PeliApi] /servers error:', err.message);
    res.json({ success: false, servers: [] });
  }
});

module.exports = router;
