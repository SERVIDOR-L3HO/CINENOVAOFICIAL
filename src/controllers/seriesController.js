const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.TMDB_API_KEY.trim()}`
  }
});

const getEmbedUrls = (imdbId, tmdbId, type = 'movie', season = 1, episode = 1) => {
  const base = 'https://multiembed.mov';
  const player = 'directstream.php';
  const id = imdbId || tmdbId;
  let query = `?video_id=${id}`;
  
  if (type === 'tv') {
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
      year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
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
    
    const externalIds = await tmdb.get(`/tv/${id}/external_ids`);
    const imdbId = externalIds.data.imdb_id;
    
    const s = response.data;
    res.json({
      id: s.id,
      imdbId: imdbId,
      title: s.name,
      overview: s.overview,
      year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
      rating: s.vote_average,
      poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${s.backdrop_path}`,
      seasons: s.seasons.map(season => ({
          number: season.season_number,
          episodes: season.episode_count,
          name: season.name
      }))
    });
  } catch (error) {
    res.status(404).json({ error: 'Serie no encontrada' });
  }
};

exports.searchSeries = async (req, res) => {
    try {
      const { query } = req.query;
      const response = await tmdb.get('/search/tv', {
        params: { language: 'es-ES', query: query }
      });
      
      const series = await Promise.all(response.data.results.map(async s => {
        try {
          const ext = await tmdb.get(`/tv/${s.id}/external_ids`);
          return {
            id: s.id,
            imdbId: ext.data.imdb_id,
            title: s.name,
            year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
            poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
            banner: `https://image.tmdb.org/t/p/original${s.backdrop_path}`,
            type: 'series'
          };
        } catch (e) {
          return {
            id: s.id,
            title: s.name,
            year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
            poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
            type: 'series'
          };
        }
      }));
      
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: 'Error en la búsqueda de series' });
    }
};

exports.getEpisodeEmbed = async (req, res) => {
  try {
    const { id } = req.params;
    const { s, e } = req.query;
    
    const externalIds = await tmdb.get(`/tv/${id}/external_ids`);
    const imdbId = externalIds.data.imdb_id;
    
    // Si no hay IMDB ID, usamos el TMDB ID (id)
    res.json(getEmbedUrls(imdbId || id, id, 'tv', s || 1, e || 1));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el enlace del episodio' });
  }
};