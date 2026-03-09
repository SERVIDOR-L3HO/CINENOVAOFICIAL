const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0`
  }
});

const getEmbedUrls = (imdbId, tmdbId) => {
  const imdb = imdbId || `tmdb:${tmdbId}`;
  return {
    latino: [
      { name: 'SUPERVIDEO', url: `https://verhdlink.cam/movie/${imdbId || tmdbId}`, quality: '1080p' },
      { name: 'MULTIVIDEO', url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`, quality: 'HD' },
      { name: 'VIDLINK', url: `https://vidlink.pro/movie/${tmdbId}`, quality: '4K' }
    ],
    castellano: [
      { name: 'SUPERVIDEO', url: `https://verhdlink.cam/movie/${imdbId || tmdbId}`, quality: '1080p' },
      { name: 'VIDSRC', url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, quality: '1080p' },
      { name: '2EMBED', url: `https://2embed.org/embed/movie/${tmdbId}`, quality: 'HD' }
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
    const params = (genre) => ({ language: lang, with_genres: genre, sort_by: 'popularity.desc', include_adult: false });
    const [trending, topRated, action, drama, comedy, horror, scifi, thriller, animation, romance] = await Promise.all([
      tmdb.get('/trending/movie/week', { params: { language: lang } }),
      tmdb.get('/movie/top_rated', { params: { language: lang, region } }),
      tmdb.get('/discover/movie', { params: params(28) }),
      tmdb.get('/discover/movie', { params: params(18) }),
      tmdb.get('/discover/movie', { params: params(35) }),
      tmdb.get('/discover/movie', { params: params(27) }),
      tmdb.get('/discover/movie', { params: params(878) }),
      tmdb.get('/discover/movie', { params: params(53) }),
      tmdb.get('/discover/movie', { params: params(16) }),
      tmdb.get('/discover/movie', { params: params(10749) }),
    ]);
    res.json([
      { id: 'trending', label: 'EN TENDENCIA', title: 'Tendencias', accent: '#38bdf8', items: trending.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'top_rated', label: 'TOP GLOBAL', title: 'Mejor Calificadas', accent: '#facc15', items: topRated.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'action', label: 'ADRENALINA', title: 'Acción & Aventura', accent: '#f97316', items: action.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'drama', label: 'EMOCIONES', title: 'Drama', accent: '#a78bfa', items: drama.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'comedy', label: 'ENTRETENIMIENTO', title: 'Comedia', accent: '#34d399', items: comedy.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'horror', label: 'OSCURIDAD', title: 'Terror & Horror', accent: '#f43f5e', items: horror.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'scifi', label: 'FUTURO', title: 'Ciencia Ficción', accent: '#22d3ee', items: scifi.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'thriller', label: 'SUSPENSO', title: 'Thriller', accent: '#fb923c', items: thriller.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'animation', label: 'ARTE EN MOVIMIENTO', title: 'Animación', accent: '#e879f9', items: animation.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
      { id: 'romance', label: 'AMOR & PASIÓN', title: 'Romance', accent: '#fb7185', items: romance.data.results.filter(m => m.poster_path && m.backdrop_path).slice(0, 20).map(mapMovie) },
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
    const [details, credits] = await Promise.all([
      tmdb.get(`/movie/${id}`, { params: { language: lang } }),
      tmdb.get(`/movie/${id}/credits`, { params: { language: lang } })
    ]);
    const m = details.data;
    const director = credits.data.crew.find(p => p.job === 'Director');
    const cast = credits.data.cast.slice(0, 8).map(a => a.name);
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
      embeds: getEmbedUrls(m.imdb_id, m.id)
    });
  } catch (error) {
    res.status(404).json({ error: 'Detalles no encontrados' });
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
          embeds: getEmbedUrls(details.data.imdb_id, m.id)
        };
      } catch (e) {
        return {
          id: m.id,
          title: m.title,
          year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          embeds: getEmbedUrls(null, m.id)
        };
      }
    }));

    res.json(movies.filter(m => m !== null));
  } catch (error) {
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
};
