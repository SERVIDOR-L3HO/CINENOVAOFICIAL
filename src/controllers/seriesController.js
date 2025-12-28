const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`
  }
});

const getEmbedUrls = (id, type = 'tv', season = null, episode = null) => {
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

exports.getAllSeries = async (req, res) => {
  try {
    const response = await tmdb.get('/tv/popular', {
      params: { language: 'es-ES', page: 1 }
    });
    
    const series = response.data.results.map(s => ({
      id: s.id,
      title: s.name,
      overview: s.overview,
      year: new Date(s.first_air_date).getFullYear(),
      rating: s.vote_average,
      poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${s.backdrop_path}`,
      type: 'series'
    }));
    
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con TMDB' });
  }
};

exports.getSeriesById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await tmdb.get(`/tv/${id}`, {
      params: { language: 'es-ES' }
    });
    
    const s = response.data;
    res.json({
      id: s.id,
      title: s.name,
      overview: s.overview,
      year: new Date(s.first_air_date).getFullYear(),
      rating: s.vote_average,
      poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${s.backdrop_path}`,
      seasons: s.number_of_seasons,
      episodes: s.number_of_episodes
    });
  } catch (error) {
    res.status(404).json({ error: 'Serie no encontrada en TMDB' });
  }
};

exports.getEpisodeEmbed = (req, res) => {
  const { id } = req.params;
  const { s, e } = req.query;
  
  if (!s || !e) return res.status(400).json({ error: 'Se requiere temporada (s) y episodio (e)' });
  
  res.json(getEmbedUrls(id, 'tv', s, e));
};