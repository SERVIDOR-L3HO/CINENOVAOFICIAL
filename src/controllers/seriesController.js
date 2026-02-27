const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0`
  }
});

const getEmbedUrls = (imdbId, tmdbId, type = 'movie', season = 1, episode = 1, lang = 'es') => {
  const id = imdbId || tmdbId;
  return {
    player1: `https://supervideo.cc/e/${id}/${season}/${episode}`
  };
};

exports.getAllSeries = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-MX';
    const response = await tmdb.get('/tv/popular', {
      params: { language: lang, page: 1 }
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
    const lang = req.query.lang || 'es-ES';
    const response = await tmdb.get(`/tv/${id}`, {
      params: { language: lang }
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
      const { query, lang } = req.query;
      const response = await tmdb.get('/search/tv', {
        params: { language: lang || 'es-MX', query: query, include_adult: false }
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
    const { s, e, lang } = req.query;
    
    const externalIds = await tmdb.get(`/tv/${id}/external_ids`);
    const imdbId = externalIds.data.imdb_id;
    
    res.json(getEmbedUrls(imdbId || id, id, 'tv', s || 1, e || 1, lang || 'es-ES'));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el enlace del episodio' });
  }
};