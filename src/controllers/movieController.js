const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`
  }
});

const getEmbedUrls = (imdbId, tmdbId) => {
  const id = imdbId || tmdbId;
  return {
    simple: `https://multiembed.mov/?video_id=${id}`,
    vip: `https://multiembed.mov/directstream.php?video_id=${id}`
  };
};

exports.getPopularMovies = async (req, res) => {
  try {
    const response = await tmdb.get('/movie/popular', {
      params: { language: 'es-ES', page: 1 }
    });
    
    // Obtenemos detalles extra para cada película para tener el IMDB ID
    const movies = await Promise.all(response.data.results.map(async m => {
      try {
        const details = await tmdb.get(`/movie/${m.id}`);
        const imdbId = details.data.imdb_id;
        return {
          id: m.id,
          imdbId: imdbId,
          title: m.title,
          overview: m.overview,
          year: new Date(m.release_date).getFullYear(),
          rating: m.vote_average,
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
          embeds: getEmbedUrls(imdbId, m.id)
        };
      } catch (e) {
        return null;
      }
    }));
    
    res.json(movies.filter(m => m !== null));
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con TMDB' });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await tmdb.get(`/movie/${id}`, {
      params: { language: 'es-ES' }
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
      const { query } = req.query;
      const response = await tmdb.get('/search/movie', {
        params: { language: 'es-ES', query: query }
      });
      
      const movies = await Promise.all(response.data.results.map(async m => {
        try {
          const details = await tmdb.get(`/movie/${m.id}`);
          return {
            id: m.id,
            imdbId: details.data.imdb_id,
            title: m.title,
            year: new Date(m.release_date).getFullYear(),
            poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
            embeds: getEmbedUrls(details.data.imdb_id, m.id)
          };
        } catch (e) { return null; }
      }));
      
      res.json(movies.filter(m => m !== null));
    } catch (error) {
      res.status(500).json({ error: 'Error en la búsqueda' });
    }
};