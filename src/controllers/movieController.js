const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0`
  }
});

const getEmbedUrls = (imdbId, tmdbId) => {
  return {
    player1: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    player2: `https://vidplus.to/embed/movie/${tmdbId}`,
    player3: `https://vidsrc.to/embed/movie/${imdbId || tmdbId}`,
    player4: `https://2embed.org/embed/movie/${tmdbId}`,
    player5: `https://embed.su/embed/movie/${tmdbId}`
  };
};

const getRegion = (lang) => {
  if (lang === 'es-MX') return 'MX';
  if (lang === 'es-ES') return 'ES';
  if (lang === 'es-AR') return 'AR';
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
        console.error(`Error fetching details for movie ${m.id}:`, e.message);
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
    const response = await tmdb.get(`/movie/${id}`, {
      params: { language: lang }
    });

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

exports.searchMovies = async (req, res) => {
  try {
    const { query, lang } = req.query;
    const response = await tmdb.get('/search/movie', {
      params: {
        language: lang || 'es-MX',
        query: query,
        include_adult: false
      }
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
