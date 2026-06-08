const axios = require('axios');

const TMDB_TOKEN = process.env.TMDB_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0';

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_TOKEN}`
  }
});

const mapDrama = s => ({
  id: s.id,
  title: s.name || s.title,
  overview: s.overview,
  rating: s.vote_average,
  poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
  banner: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : null,
  type: 'series'
});

const unique = arr => [...new Map(arr.map(x => [x.id, x])).values()];

exports.getDramaCategories = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-MX';
    const base  = { language: lang, include_adult: false, sort_by: 'popularity.desc' };
    const ko    = { ...base, with_original_language: 'ko' };
    const ko2   = { ...ko, page: 2 };
    const zh    = { ...base, with_original_language: 'zh' };
    const zh2   = { ...zh, page: 2 };
    const tr    = { ...base, with_original_language: 'tr' };
    const tr2   = { ...tr, page: 2 };
    const th    = { ...base, with_original_language: 'th' };

    const [
      kTr1, kTr2,
      kRom1, kRom2,
      kCri1, kCri2,
      kHis1, kHis2,
      kTop1, kTop2,
      cDr1, cDr2,
      trDr1, trDr2,
      thDr1,
      trendA1, trendA2
    ] = await Promise.all([
      // K-Drama trending
      tmdb.get('/trending/tv/week', { params: { language: lang, page: 1 } }),
      tmdb.get('/trending/tv/week', { params: { language: lang, page: 2 } }),
      // K-Drama romance
      tmdb.get('/discover/tv', { params: { ...ko,  with_genres: '18,10749' } }),
      tmdb.get('/discover/tv', { params: { ...ko2, with_genres: '18,10749' } }),
      // K-Drama crimen & thriller
      tmdb.get('/discover/tv', { params: { ...ko,  with_genres: '18,80' } }),
      tmdb.get('/discover/tv', { params: { ...ko2, with_genres: '18,80' } }),
      // K-Drama histórico
      tmdb.get('/discover/tv', { params: { ...ko,  with_genres: '18,36' } }),
      tmdb.get('/discover/tv', { params: { ...ko2, with_genres: '18,36' } }),
      // K-Drama mejor valorados
      tmdb.get('/discover/tv', { params: { ...ko,  sort_by: 'vote_average.desc', vote_count_gte: 100 } }),
      tmdb.get('/discover/tv', { params: { ...ko2, sort_by: 'vote_average.desc', vote_count_gte: 100 } }),
      // C-Drama (chino)
      tmdb.get('/discover/tv', { params: { ...zh,  with_genres: '18' } }),
      tmdb.get('/discover/tv', { params: { ...zh2, with_genres: '18' } }),
      // Dizi (turco)
      tmdb.get('/discover/tv', { params: { ...tr,  with_genres: '18' } }),
      tmdb.get('/discover/tv', { params: { ...tr2, with_genres: '18' } }),
      // Thai drama
      tmdb.get('/discover/tv', { params: { ...th,  with_genres: '18' } }),
      // Trending asiático
      tmdb.get('/discover/tv', { params: { ...base, with_original_language: 'ko|zh|ja|th', with_genres: '18', sort_by: 'popularity.desc' } }),
      tmdb.get('/discover/tv', { params: { ...base, with_original_language: 'ko|zh|ja|th', with_genres: '18', sort_by: 'popularity.desc', page: 2 } }),
    ]);

    const merge = (r1, r2, filterLang) => {
      const all = [...r1.data.results, ...r2.data.results]
        .filter(s => s.poster_path && s.backdrop_path && (!filterLang || s.original_language === filterLang))
        .map(mapDrama);
      return unique(all);
    };

    // K-dramas trending = filtrar trending global solo coreanos
    const kTrending = [...kTr1.data.results, ...kTr2.data.results]
      .filter(s => s.poster_path && s.backdrop_path && s.original_language === 'ko')
      .map(mapDrama);

    const trendAsian = [...trendA1.data.results, ...trendA2.data.results]
      .filter(s => s.poster_path && s.backdrop_path)
      .map(mapDrama);

    res.json([
      { id: 'kdrama_trending',  label: '🇰🇷 EN TENDENCIA',     title: 'K-Dramas del Momento',   accent: '#ec4899', items: unique(kTrending) },
      { id: 'kdrama_romance',   label: '💗 AMOR COREANO',      title: 'Romance & Melodrama',    accent: '#f43f5e', items: merge(kRom1, kRom2, 'ko') },
      { id: 'kdrama_top',       label: '⭐ TOP K-DRAMA',       title: 'Los Más Queridos',       accent: '#a78bfa', items: merge(kTop1, kTop2, 'ko') },
      { id: 'kdrama_crimen',    label: '🔍 SUSPENSO COREANO',  title: 'Crimen & Thriller',      accent: '#6366f1', items: merge(kCri1, kCri2, 'ko') },
      { id: 'kdrama_historico', label: '👑 JOSEON',            title: 'Drama Histórico',        accent: '#d97706', items: merge(kHis1, kHis2, 'ko') },
      { id: 'cdrama',           label: '🇨🇳 C-DRAMA',          title: 'Dramas Chinos',          accent: '#f59e0b', items: merge(cDr1, cDr2, 'zh') },
      { id: 'dizi_turco',       label: '🇹🇷 DİZİ',             title: 'Telenovelas Turcas',     accent: '#10b981', items: merge(trDr1, trDr2, 'tr') },
      { id: 'drama_asiatico',   label: '🌏 ASIA',              title: 'Todo el Drama Asiático', accent: '#38bdf8', items: unique(trendAsian) },
    ]);
  } catch (err) {
    console.error('Drama categories error:', err.message);
    res.status(500).json({ error: 'Error al cargar categorías de dramas' });
  }
};
