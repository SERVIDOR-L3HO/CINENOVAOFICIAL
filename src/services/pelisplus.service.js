const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetchHtml');

const BASE_URL = 'https://www.pelisplushd.la';

function getAbsoluteUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function extractSlugFromPath(path) {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function detectTypeFromPath(path) {
  if (!path) return 'movie';
  if (path.includes('/pelicula/')) return 'movie';
  if (path.includes('/serie/')) return 'series';
  if (path.includes('/anime/')) return 'anime';
  return 'movie';
}

function parseServers($) {
  const servers = [];

  if ($('#link_url span').length > 0) {
    const serverNamesMap = new Map();
    $('.TbVideoNv li, .VideoPlayer li').each((_, liEl) => {
      const li = $(liEl);
      const id = li.attr('data-id') || li.attr('lid') || '';
      const name = li.text().trim();
      if (id && name) serverNamesMap.set(id, name);
    });

    $('#link_url span').each((_, spanEl) => {
      const span = $(spanEl);
      const lid = span.attr('lid') || '';
      const embedUrl = span.attr('url') || '';
      const name = serverNamesMap.get(lid) || 'Servidor';
      if (!embedUrl) return;

      let serverKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (embedUrl.includes('streamwish') || serverKey.includes('streamwish')) serverKey = 'streamwish';
      else if (embedUrl.includes('voe.sx') || serverKey.includes('voe')) serverKey = 'voe';
      else if (embedUrl.includes('streamtape') || serverKey.includes('streamtape')) serverKey = 'streamtape';
      else if (embedUrl.includes('vidhide') || serverKey.includes('vidhide')) serverKey = 'vidhide';
      else if (embedUrl.includes('dood') || serverKey.includes('dood')) serverKey = 'doodstream';

      servers.push({ name, server: serverKey, language: 'Latino', embedUrl });
    });
  }

  if (servers.length === 0) {
    $('li.playurl').each((_, el) => {
      const element = $(el);
      const embedUrl = element.attr('data-url') || '';
      const language = element.attr('data-name') || 'Subtitulado';
      const name = element.find('a').text().trim() || element.text().trim() || 'Servidor';
      if (!embedUrl) return;

      let serverKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (embedUrl.includes('streamwish') || serverKey.includes('streamwish')) serverKey = 'streamwish';
      else if (embedUrl.includes('voe.sx') || serverKey.includes('voe')) serverKey = 'voe';
      else if (embedUrl.includes('streamtape') || serverKey.includes('streamtape')) serverKey = 'streamtape';

      servers.push({ name, server: serverKey, language, embedUrl });
    });
  }

  return servers;
}

async function searchContent(query) {
  try {
    const url = `${BASE_URL}/search?s=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('a.Posters-link').each((_, element) => {
      const el = $(element);
      const href = el.attr('href') || '';
      const title = el.attr('data-title') || el.find('.listing-content p').text().trim() || '';
      const type = detectTypeFromPath(href);
      const slug = extractSlugFromPath(href);
      if (slug) results.push({ slug, title, type, url: getAbsoluteUrl(href) });
    });

    return results;
  } catch (e) {
    console.error('[PelisPlus] searchContent error:', e.message);
    return [];
  }
}

async function getMovieServers(slug) {
  try {
    const url = `${BASE_URL}/pelicula/${slug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    return parseServers($);
  } catch (e) {
    console.error('[PelisPlus] getMovieServers error:', e.message);
    return [];
  }
}

async function getEpisodeServers(slug, season, episode) {
  try {
    const url = `${BASE_URL}/serie/${slug}/temporada/${season}/capitulo/${episode}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    return parseServers($);
  } catch (e) {
    console.error('[PelisPlus] getEpisodeServers error:', e.message);
    return [];
  }
}

module.exports = { searchContent, getMovieServers, getEpisodeServers };
