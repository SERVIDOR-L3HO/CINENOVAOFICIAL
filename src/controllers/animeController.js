const axios = require('axios');

const TMDB_TOKEN = process.env.TMDB_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0';

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_TOKEN}`
  }
});

const mapAnime = s => ({
  id: s.id,
  title: s.name || s.title,
  overview: s.overview,
  rating: s.vote_average,
  poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
  banner: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : null,
  type: 'series'
});

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
