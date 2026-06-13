const cheerio = require('cheerio');
const axios = require('axios');
const { fetchHtml } = require('../utils/fetchHtml');

const BASE_URL = 'https://repelishd.ceo';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

function getAbsoluteUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function searchContent(query) {
  try {
    const url = `${BASE_URL}/index.php?do=search`;
    const postData = `do=search&subaction=search&story=${encodeURIComponent(query)}`;
    const response = await axios.post(url, postData, {
      timeout: 15000,
      headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': `${BASE_URL}/` },
    });
    const $ = cheerio.load(response.data);
    const results = [];

    $('#dle-content article.item').each((_, element) => {
      const el = $(element);
      const posterLink = el.find('.poster a');
      const href = posterLink.attr('href') || '';
      const title = el.find('.data h3 a').text().trim() || el.find('.listing-content p').text().trim();
      const slug = href.split('/ver-pelicula/').pop().replace('.html', '');
      if (slug && slug !== href) {
        results.push({ slug, title, type: 'movie', url: getAbsoluteUrl(href) });
      }
    });

    return results;
  } catch (e) {
    console.error('[RePelisHD] searchContent error:', e.message);
    return [];
  }
}

async function getMovieServers(slug) {
  try {
    const pageUrl = `${BASE_URL}/ver-pelicula/${slug}.html`;
    const html = await fetchHtml(pageUrl);
    const $ = cheerio.load(html);
    const servers = [];

    const iframeSrc = $('iframe').first().attr('src') || $('iframe').first().attr('data-src') || '';
    if (iframeSrc && iframeSrc.includes('verhdlink.cam')) {
      try {
        const resolverHtml = await fetchHtml(iframeSrc, { 'Referer': pageUrl });
        const r$ = cheerio.load(resolverHtml);

        const languages = [
          { key: 'latino', label: 'Latino' },
          { key: 'castellano', label: 'Castellano' },
        ];

        for (const lang of languages) {
          r$(`ul.${lang.key} li`).each((_, el) => {
            const mirror = r$(el);
            const dataLink = mirror.attr('data-link') || '';
            const text = mirror.text().trim().toLowerCase();
            if (!dataLink) return;

            let embedUrl = dataLink.startsWith('//') ? `https:${dataLink}` : dataLink;
            let serverKey = 'desconocido';
            let serverName = 'Servidor';

            if (text.includes('dropload') || embedUrl.includes('dropload') || embedUrl.includes('dr0pstream')) {
              serverKey = 'dropload'; serverName = 'Dropload';
            } else if (text.includes('mixdrop') || embedUrl.includes('mixdrop')) {
              serverKey = 'mixdrop'; serverName = 'Mixdrop';
            } else if (text.includes('dood') || embedUrl.includes('dood')) {
              serverKey = 'doodstream'; serverName = 'Doodstream';
            } else if (text.includes('streamwish') || embedUrl.includes('streamwish')) {
              serverKey = 'streamwish'; serverName = 'Streamwish';
            } else if (text.includes('supervideo') || embedUrl.includes('supervideo')) {
              serverKey = 'supervideo'; serverName = 'SuperVideo';
            }

            servers.push({ name: serverName, server: serverKey, language: lang.label, embedUrl });
          });
        }
      } catch (err) {
        console.error('[RePelisHD] resolver error:', err.message);
      }
    }

    return servers;
  } catch (e) {
    console.error('[RePelisHD] getMovieServers error:', e.message);
    return [];
  }
}

async function getEpisodeServers() {
  return [];
}

module.exports = { searchContent, getMovieServers, getEpisodeServers };
