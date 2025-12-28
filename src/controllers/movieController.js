const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`
  }
});

const getEmbedUrls = (id, type = 'movie', season = null, episode = null) => {
  const base = 'https://multiembed.mov';
  const player = 'directstream.php';
  let query = `?video_id=${id}`;
  
  if (type === 'tv' && season && episode) {
    query += `&s=${season}&e=${episode}`;
  }
  
  return {
    simple: `${base}/${query}`,
    vip: `${base}/${player}${query}`
  };
};

exports.getPopularMovies = async (req, res) => {
  try {
    const response = await tmdb.get('/movie/popular', {
      params: { language: 'es-ES', page: 1 }
    });
    
    const movies = response.data.results.map(m => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      year: new Date(m.release_date).getFullYear(),
      rating: m.vote_average,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      embeds: getEmbedUrls(m.id, 'movie')
    }));
    
    res.json(movies);
  } catch (error) {
    console.error('TMDB Error:', error.message);
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
      title: m.title,
      overview: m.overview,
      year: new Date(m.release_date).getFullYear(),
      rating: m.vote_average,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      embeds: getEmbedUrls(m.id, 'movie')
    });
  } catch (error) {
    res.status(404).json({ error: 'Película no encontrada en TMDB' });
  }
};