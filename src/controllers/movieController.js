const axios = require('axios');

const TMDB_TOKEN = process.env.TMDB_API_KEY;
if (!TMDB_TOKEN) throw new Error('TMDB_API_KEY secret is required. Set it in Replit Secrets.');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_TOKEN}`
  }
});

const getEmbedUrls = (imdbId, tmdbId) => {
  return {
    latino: [
      { name: 'Servidor 1', url: `https://unlimplay.com/play/embed/movie/${tmdbId}?sub=es&lang=es&audio=es&muted=0&autoplay=1`, quality: '1080p' },
      { name: 'Servidor 2', url: `https://embed69.org/f/${imdbId || tmdbId}`, quality: 'HD' }
    ],
    castellano: [
      { name: 'Servidor 1', url: `https://unlimplay.com/play/embed/movie/${tmdbId}?sub=es&lang=es&audio=es&muted=0&autoplay=1`, quality: '1080p' },
      { name: 'Servidor 2', url: `https://embed69.org/f/${imdbId || tmdbId}`, quality: 'HD' }
    ],
    original: [
      { name: 'Servidor 1', url: `https://unlimplay.com/play/embed/movie/${tmdbId}?sub=es&lang=es&audio=es&muted=0&autoplay=1`, quality: '1080p' },
      { name: 'Servidor 2', url: `https://embed69.org/f/${imdbId || tmdbId}`, quality: 'HD' }
    ]
  };
};

const getRegion = (lang) => {
  if (lang === 'es-MX') return 'MX';
  if (lang === 'es-ES') return 'ES';
  if (lang === 'en-US') return 'US';
  return 'MX';
};

exports.getPopularMovies = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-MX';
    const region = getRegion(lang);

    const response = await tmdb.get('/discover/movie', {
      params: {
        language: lang,
        sort_by: 'popularity.desc',
        include_adult: false,
        page: 1,
        region: region
      }
    });

    const movies = await Promise.all(response.data.results.map(async m => {
      try {
        const details = await tmdb.get(`/movie/${m.id}`, { params: { language: lang } });
        const imdbId = details.data.imdb_id;
        return {
          id: m.id,
          imdbId: imdbId,
          title: m.title || details.data.title,
          overview: m.overview || details.data.overview,
          year: new Date(m.release_date || details.data.release_date).getFullYear(),
          rating: m.vote_average,
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
          embeds: getEmbedUrls(imdbId, m.id)
        };
      } catch (e) {
        return {
          id: m.id,
          title: m.title,
          overview: m.overview,
          year: new Date(m.release_date).getFullYear(),
          rating: m.vote_average,
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
          embeds: getEmbedUrls(null, m.id)
        };
      }
    }));

    res.json(movies.filter(m => m !== null && m.poster && m.banner));
  } catch (error) {
    console.error('TMDB Controller Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al conectar con TMDB', details: error.message });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || 'es-ES';
    const response = await tmdb.get(`/movie/${id}`, { params: { language: lang } });
    const m = response.data;
    res.json({
      id: m.id,
      imdbId: m.imdb_id,
      title: m.title,
      overview: m.overview,
      year: new Date(m.release_date).getFullYear(),
      rating: m.vote_average,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      embeds: getEmbedUrls(m.imdb_id, m.id)
    });
  } catch (error) {
    res.status(404).json({ error: 'Película no encontrada' });
  }
};

exports.getMovieCategories = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-ES';
    const region = getRegion(lang);
    const mapMovie = m => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
      rating: m.vote_average,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      banner: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
    });
    const p = (genre, page = 1) => ({ language: lang, with_genres: genre, sort_by: 'popularity.desc', include_adult: false, page });
    const [
      t1, t2, tr1, tr2,
      a1, a2, d1, d2, c1, c2,
      h1, h2, sf1, sf2, th1, th2,
      an1, an2, ro1, ro2
    ] = await Promise.all([
      tmdb.get('/trending/movie/week', { params: { language: lang, page: 1 } }),
      tmdb.get('/trending/movie/week', { params: { language: lang, page: 2 } }),
      tmdb.get('/movie/top_rated', { params: { language: lang, region, page: 1 } }),
      tmdb.get('/movie/top_rated', { params: { language: lang, region, page: 2 } }),
      tmdb.get('/discover/movie', { params: p(28, 1) }),
      tmdb.get('/discover/movie', { params: p(28, 2) }),
      tmdb.get('/discover/movie', { params: p(18, 1) }),
      tmdb.get('/discover/movie', { params: p(18, 2) }),
      tmdb.get('/discover/movie', { params: p(35, 1) }),
      tmdb.get('/discover/movie', { params: p(35, 2) }),
      tmdb.get('/discover/movie', { params: p(27, 1) }),
      tmdb.get('/discover/movie', { params: p(27, 2) }),
      tmdb.get('/discover/movie', { params: p(878, 1) }),
      tmdb.get('/discover/movie', { params: p(878, 2) }),
      tmdb.get('/discover/movie', { params: p(53, 1) }),
      tmdb.get('/discover/movie', { params: p(53, 2) }),
      tmdb.get('/discover/movie', { params: p(16, 1) }),
      tmdb.get('/discover/movie', { params: p(16, 2) }),
      tmdb.get('/discover/movie', { params: p(10749, 1) }),
      tmdb.get('/discover/movie', { params: p(10749, 2) }),
    ]);
    const merge = (r1, r2) => [...r1.data.results, ...r2.data.results]
      .filter(m => m.poster_path && m.backdrop_path)
      .map(mapMovie);
    res.json([
      { id: 'trending',   label: 'EN TENDENCIA',        title: 'Tendencias',          accent: '#38bdf8', items: merge(t1, t2) },
      { id: 'top_rated',  label: 'TOP GLOBAL',           title: 'Mejor Calificadas',   accent: '#facc15', items: merge(tr1, tr2) },
      { id: 'action',     label: 'ADRENALINA',           title: 'Acción & Aventura',   accent: '#3b82f6', items: merge(a1, a2) },
      { id: 'drama',      label: 'EMOCIONES',            title: 'Drama',               accent: '#a78bfa', items: merge(d1, d2) },
      { id: 'comedy',     label: 'ENTRETENIMIENTO',      title: 'Comedia',             accent: '#34d399', items: merge(c1, c2) },
      { id: 'horror',     label: 'OSCURIDAD',            title: 'Terror & Horror',     accent: '#f43f5e', items: merge(h1, h2) },
      { id: 'scifi',      label: 'FUTURO',               title: 'Ciencia Ficción',     accent: '#22d3ee', items: merge(sf1, sf2) },
      { id: 'thriller',   label: 'SUSPENSO',             title: 'Thriller',            accent: '#60a5fa', items: merge(th1, th2) },
      { id: 'animation',  label: 'ARTE EN MOVIMIENTO',   title: 'Animación',           accent: '#e879f9', items: merge(an1, an2) },
      { id: 'romance',    label: 'AMOR & PASIÓN',         title: 'Romance',             accent: '#fb7185', items: merge(ro1, ro2) },
    ]);
  } catch (error) {
    console.error('Categories error:', error.message);
    res.status(500).json({ error: 'Error al cargar categorías' });
  }
};

exports.getMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || 'es-ES';
    const [details, credits, videosLang, videosEn] = await Promise.all([
      tmdb.get(`/movie/${id}`, { params: { language: lang } }),
      tmdb.get(`/movie/${id}/credits`, { params: { language: lang } }),
      tmdb.get(`/movie/${id}/videos`, { params: { language: lang } }),
      tmdb.get(`/movie/${id}/videos`, { params: { language: 'en-US' } })
    ]);
    const m = details.data;
    const director = credits.data.crew.find(p => p.job === 'Director');
    const cast = credits.data.cast.slice(0, 8).map(a => a.name);

    const allVideos = [...(videosLang.data.results || []), ...(videosEn.data.results || [])];
    const trailer = allVideos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      || allVideos.find(v => v.site === 'YouTube');
    const trailerKey = trailer ? trailer.key : null;

    res.json({
      id: m.id,
      imdbId: m.imdb_id,
      title: m.title,
      overview: m.overview,
      year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
      runtime: m.runtime,
      rating: m.vote_average,
      votes: m.vote_count,
      genres: m.genres.map(g => g.name),
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      director: director ? director.name : null,
      cast: cast,
      trailerKey: trailerKey,
      embeds: getEmbedUrls(m.imdb_id, m.id)
    });
  } catch (error) {
    res.status(404).json({ error: 'Detalles no encontrados' });
  }
};

exports.getMoreByCategory = async (req, res) => {
  try {
    const { category, page, lang } = req.query;
    const p = parseInt(page) || 3;
    const l = lang || 'es-MX';
    const region = getRegion(l);

    const categoryMap = {
      trending:  () => tmdb.get('/trending/movie/week',  { params: { language: l, page: p } }),
      top_rated: () => tmdb.get('/movie/top_rated',      { params: { language: l, region, page: p } }),
      action:    () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 28,    sort_by: 'popularity.desc', page: p } }),
      drama:     () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 18,    sort_by: 'popularity.desc', page: p } }),
      comedy:    () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 35,    sort_by: 'popularity.desc', page: p } }),
      horror:    () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 27,    sort_by: 'popularity.desc', page: p } }),
      scifi:     () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 878,   sort_by: 'popularity.desc', page: p } }),
      thriller:  () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 53,    sort_by: 'popularity.desc', page: p } }),
      animation: () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 16,    sort_by: 'popularity.desc', page: p } }),
      romance:   () => tmdb.get('/discover/movie',       { params: { language: l, with_genres: 10749, sort_by: 'popularity.desc', page: p } }),
    };

    const fetcher = categoryMap[category];
    if (!fetcher) return res.status(400).json({ error: 'Categoría inválida' });

    const response = await fetcher();
    const items = response.data.results
      .filter(m => m.poster_path)
      .map(m => ({
        id: m.id,
        title: m.title || m.name,
        overview: m.overview,
        year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
        rating: m.vote_average,
        poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        banner: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
      }));

    res.json(items);
  } catch (error) {
    console.error('getMoreByCategory error:', error.message);
    res.status(500).json({ error: 'Error al cargar más contenido' });
  }
};

exports.searchMovies = async (req, res) => {
  try {
    const { query, lang } = req.query;
    const response = await tmdb.get('/search/movie', {
      params: { language: lang || 'es-MX', query: query, include_adult: false }
    });

    const movies = await Promise.all(response.data.results.map(async m => {
      try {
        const details = await tmdb.get(`/movie/${m.id}`, { params: { language: lang || 'es-MX' } });
        return {
          id: m.id,
          imdbId: details.data.imdb_id,
          title: m.title,
          year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          popularity: m.popularity || 0,
          embeds: getEmbedUrls(details.data.imdb_id, m.id)
        };
      } catch (e) {
        return {
          id: m.id,
          title: m.title,
          year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          popularity: m.popularity || 0,
          embeds: getEmbedUrls(null, m.id)
        };
      }
    }));

    res.json(movies.filter(m => m !== null));
  } catch (error) {
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
};
