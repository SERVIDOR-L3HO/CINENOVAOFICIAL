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
    const { title, type = 'movie', season = 1, episode = 1, tmdbId } = req.query;
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

    // ── 2. Fallback a RePelisHD (solo películas) ──
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

    // ── 3. Fallback por TMDB ID para series/anime ──
    if (servers.length === 0 && (type === 'series' || type === 'anime') && tmdbId) {
      const s = parseInt(season) || 1;
      const e = parseInt(episode) || 1;
      servers = [
        { name: 'VidLink',      server: 'vidlink',     language: 'Latino',    embedUrl: `https://vidlink.pro/tv/${tmdbId}/${s}/${e}?primaryColor=38bdf8&autoplay=true` },
        { name: 'MultiEmbed',   server: 'multiembed',  language: 'Latino',    embedUrl: `https://multiembed.mov/?tmdb=1&video_id=${tmdbId}&s=${s}&e=${e}` },
        { name: 'VidSrc',       server: 'vidsrc',      language: 'Latino',    embedUrl: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}` },
        { name: 'AutoEmbed',    server: 'autoembed',   language: 'Castellano', embedUrl: `https://player.autoembed.cc/embed/tv/${tmdbId}/${s}/${e}` },
        { name: '2Embed',       server: '2embed',      language: 'Castellano', embedUrl: `https://www.2embed.org/embed/tv&id=${tmdbId}&s=${s}&e=${e}` },
      ];
      source = 'tmdb-fallback';
    }

    res.json({ success: true, source, servers });
  } catch (err) {
    console.error('[PeliApi] /servers error:', err.message);
    res.json({ success: false, servers: [] });
  }
});

module.exports = router;
