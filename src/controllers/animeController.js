const axios = require('axios');

const TMDB_TOKEN = process.env.TMDB_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0';

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_TOKEN}`
  }
});

const hjClient = axios.create({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9',
    'Referer': 'https://henaojara.com/'
  }
});

const slugify = (text) => (text || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .trim();

const hjCache = new Map();

async function findHenaojaraEmbed(title, season, episode) {
  const baseSlug = slugify(title);
  if (!baseSlug) return null;

  const cacheKey = `${baseSlug}-s${season}e${episode}`;
  if (hjCache.has(cacheKey)) return hjCache.get(cacheKey);

  const slugCandidates = [
    `${baseSlug}-espanol-latino-hd`,
    `${baseSlug}-sub-espanol-hd`,
    `${baseSlug}-temporada-${season}-espanol-latino-hd`,
    `${baseSlug}-temporada-${season}-sub-espanol-hd`,
    baseSlug
  ];

  for (const slug of slugCandidates) {
    try {
      const epUrl = `https://henaojara.com/view/episode/${slug}-${season}x${episode}/`;
      const pageRes = await hjClient.get(epUrl);
      const html = pageRes.data;

      const tridMatch = html.match(/trid=(\d+)/);
      if (!tridMatch) continue;

      const trid = tridMatch[1];
      const trembed = `https://henaojara.com/?trembed=0&trid=${trid}&trtype=2`;

      hjCache.set(cacheKey, trembed);
      if (hjCache.size > 500) {
        const firstKey = hjCache.keys().next().value;
        hjCache.delete(firstKey);
      }
      return trembed;

    } catch (e) {
      continue;
    }
  }

  hjCache.set(cacheKey, null);
  return null;
}

const mapAnime = s => ({
  id: s.id,
  title: s.name || s.title,
  overview: s.overview,
  rating: s.vote_average,
  poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
  banner: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : null,
  type: 'series'
});

exports.searchAnime = async (req, res) => {
  try {
    const { query, lang } = req.query;
    if (!query) return res.json([]);
    const response = await tmdb.get('/search/tv', {
      params: { language: lang || 'es-MX', query, include_adult: false }
    });
    const results = response.data.results
      .filter(s => s.original_language === 'ja' && s.poster_path)
      .map(mapAnime);
    res.json(results);
  } catch (err) {
    console.error('Anime search error:', err.message);
    res.status(500).json({ error: 'Error en búsqueda de anime' });
  }
};

exports.getHenaojaraEmbed = async (req, res) => {
  try {
    const { id } = req.params;
    const { s = 1, e = 1 } = req.query;

    const [enRes, exRes] = await Promise.allSettled([
      tmdb.get(`/tv/${id}`, { params: { language: 'en-US' } }),
      tmdb.get(`/tv/${id}/external_ids`)
    ]);

    if (enRes.status !== 'fulfilled') {
      return res.json({ url: null });
    }

    const show = enRes.value.data;
    const titleEn = show.name || '';
    const titleOrig = show.original_name || '';

    const titlesToTry = [...new Set([titleEn, titleOrig].filter(Boolean))];
    let mpUrl = null;

    for (const title of titlesToTry) {
      mpUrl = await findHenaojaraEmbed(title, s, e);
      if (mpUrl) break;
    }

    res.json({ url: mpUrl || null, title: titleEn });
  } catch (err) {
    console.error('Henaojara embed error:', err.message);
    res.json({ url: null });
  }
};

exports.getAnimeCategories = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-MX';
    const ja = { language: lang, with_original_language: 'ja', with_genres: '16', include_adult: false, sort_by: 'popularity.desc' };
    const ja2 = { ...ja, page: 2 };

    const [
      tr1, tr2,
      top1, top2,
      act1, act2,
      rom1, rom2,
      fan1, fan2,
      dark1, dark2,
      com1, com2,
      dr1, dr2
    ] = await Promise.all([
      tmdb.get('/trending/tv/week',  { params: { language: lang, page: 1 } }),
      tmdb.get('/trending/tv/week',  { params: { language: lang, page: 2 } }),
      tmdb.get('/discover/tv',       { params: { ...ja, sort_by: 'vote_average.desc', vote_count_gte: 200 } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, sort_by: 'vote_average.desc', vote_count_gte: 200 } }),
      tmdb.get('/discover/tv',       { params: { ...ja,  with_genres: '16,10759' } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, with_genres: '16,10759' } }),
      tmdb.get('/discover/tv',       { params: { ...ja,  with_genres: '16,10749' } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, with_genres: '16,10749' } }),
      tmdb.get('/discover/tv',       { params: { ...ja,  with_genres: '16,10765' } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, with_genres: '16,10765' } }),
      tmdb.get('/discover/tv',       { params: { ...ja,  with_genres: '16,27' } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, with_genres: '16,27' } }),
      tmdb.get('/discover/tv',       { params: { ...ja,  with_genres: '16,35' } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, with_genres: '16,35' } }),
      tmdb.get('/discover/tv',       { params: { ...ja,  with_genres: '16,18' } }),
      tmdb.get('/discover/tv',       { params: { ...ja2, with_genres: '16,18' } }),
    ]);

    const merge = (r1, r2) => {
      const all = [...r1.data.results, ...r2.data.results]
        .filter(s => s.poster_path && s.backdrop_path && s.original_language === 'ja')
        .map(mapAnime);
      return [...new Map(all.map(x => [x.id, x])).values()];
    };

    const trending = [...tr1.data.results, ...tr2.data.results]
      .filter(s => s.poster_path && s.backdrop_path && s.original_language === 'ja')
      .map(mapAnime);
    const trendingUnique = [...new Map(trending.map(x => [x.id, x])).values()];

    res.json([
      { id: 'anime_trending',  label: '🔥 AHORA MISMO',       title: 'Animes del Momento',     accent: '#f97316', items: trendingUnique },
      { id: 'anime_top',       label: '⭐ MEJOR VALORADOS',    title: 'Top Animes',             accent: '#facc15', items: merge(top1, top2) },
      { id: 'anime_action',    label: '⚔️ COMBATE',            title: 'Acción & Aventura',      accent: '#ef4444', items: merge(act1, act2) },
      { id: 'anime_romance',   label: '🌸 CORAZÓN',            title: 'Romance & Sentimientos', accent: '#f472b6', items: merge(rom1, rom2) },
      { id: 'anime_fantasy',   label: '🌀 OTRO MUNDO',         title: 'Fantasy & Isekai',       accent: '#a78bfa', items: merge(fan1, fan2) },
      { id: 'anime_dark',      label: '💀 OSCURIDAD',          title: 'Terror & Dark Anime',    accent: '#6b7280', items: merge(dark1, dark2) },
      { id: 'anime_comedy',    label: '😂 CARCAJADAS',         title: 'Comedia',                accent: '#34d399', items: merge(com1, com2) },
      { id: 'anime_drama',     label: '😢 LÁGRIMAS',           title: 'Drama & Slice of Life',  accent: '#60a5fa', items: merge(dr1, dr2) },
    ]);
  } catch (err) {
    console.error('Anime categories error:', err.message);
    res.status(500).json({ error: 'Error al cargar categorías de anime' });
  }
};
