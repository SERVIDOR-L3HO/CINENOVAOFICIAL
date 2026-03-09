const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NmQ5YTgzNGQ0NDEzNzAwYjQ5MWNjMjY4OTIxNDdhYSIsIm5iZiI6MTc1MjQ1NjQ4My4zNDUsInN1YiI6IjY4NzQ1ZDIzNjIwNzU1OWUwNDVhZTRjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Mm-GBMnPS_WUAslIwTiewd6khCIFIqR4XDBqTlT9Yx0`
  }
});

const getEmbedUrls = (imdbId, tmdbId, season = 1, episode = 1) => {
  const useImdb = imdbId || null;
  return {
    latino: [
      {
        name: 'SUPERVIDEO',
        url: useImdb
          ? `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`
          : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
        quality: 'HD'
      },
      { name: 'VIDLINK', url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, quality: '4K' },
      {
        name: 'VIDSRC',
        url: useImdb
          ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`
          : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
        quality: '1080p'
      }
    ],
    castellano: [
      { name: 'VIDSRC+', url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, quality: '1080p' },
      { name: 'AUTOEMBED', url: `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`, quality: 'HD' },
      { name: 'VIDAPI', url: `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`, quality: 'HD' }
    ]
  };
};

const getRegion = (lang) => {
  if (lang === 'es-MX') return 'MX';
  if (lang === 'es-ES') return 'ES';
  if (lang === 'en-US') return 'US';
  return 'MX';
};

exports.getAllSeries = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-MX';
    const region = getRegion(lang);
    const response = await tmdb.get('/tv/popular', {
      params: { language: lang, page: 1, region: region }
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
    const response = await tmdb.get(`/tv/${id}`, { params: { language: lang } });
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

exports.getSeriesCategories = async (req, res) => {
  try {
    const lang = req.query.lang || 'es-ES';
    const mapSeries = s => ({
      id: s.id,
      title: s.name,
      overview: s.overview,
      year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
      rating: s.vote_average,
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
      banner: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : null,
      type: 'series'
    });
    const params = (genre) => ({ language: lang, with_genres: genre, sort_by: 'popularity.desc', include_adult: false });
    const [trending, topRated, drama, comedy, crime, scifi, animation, reality, documentary] = await Promise.all([
      tmdb.get('/trending/tv/week', { params: { language: lang } }),
      tmdb.get('/tv/top_rated', { params: { language: lang } }),
      tmdb.get('/discover/tv', { params: params(18) }),
      tmdb.get('/discover/tv', { params: params(35) }),
      tmdb.get('/discover/tv', { params: params(80) }),
      tmdb.get('/discover/tv', { params: params(10765) }),
      tmdb.get('/discover/tv', { params: params(16) }),
      tmdb.get('/discover/tv', { params: params(10764) }),
      tmdb.get('/discover/tv', { params: params(99) }),
    ]);
    res.json([
      { id: 'trending', label: 'EN TENDENCIA', title: 'Series del Momento', accent: '#38bdf8', items: trending.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'top_rated', label: 'TOP GLOBAL', title: 'Mejor Calificadas', accent: '#facc15', items: topRated.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'drama', label: 'EMOCIONES', title: 'Drama', accent: '#a78bfa', items: drama.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'crime', label: 'MISTERIO', title: 'Crimen & Policíaca', accent: '#f43f5e', items: crime.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'comedy', label: 'ENTRETENIMIENTO', title: 'Comedia', accent: '#34d399', items: comedy.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'scifi', label: 'FUTURO', title: 'Ciencia Ficción', accent: '#22d3ee', items: scifi.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'animation', label: 'ARTE EN MOVIMIENTO', title: 'Animación', accent: '#e879f9', items: animation.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
      { id: 'documentary', label: 'CONOCIMIENTO', title: 'Documental', accent: '#fb923c', items: documentary.data.results.filter(s => s.poster_path && s.backdrop_path).slice(0, 20).map(mapSeries) },
    ]);
  } catch (error) {
    console.error('Series categories error:', error.message);
    res.status(500).json({ error: 'Error al cargar categorías de series' });
  }
};

exports.getSeriesDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || 'es-ES';
    const [details, credits, externalIds] = await Promise.all([
      tmdb.get(`/tv/${id}`, { params: { language: lang } }),
      tmdb.get(`/tv/${id}/credits`, { params: { language: lang } }),
      tmdb.get(`/tv/${id}/external_ids`)
    ]);
    const s = details.data;
    const imdbId = externalIds.data.imdb_id;
    const creators = s.created_by && s.created_by.length > 0 ? s.created_by.map(c => c.name) : null;
    const cast = credits.data.cast.slice(0, 8).map(a => a.name);
    res.json({
      id: s.id,
      imdbId: imdbId,
      title: s.name,
      overview: s.overview,
      year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
      seasons: s.number_of_seasons,
      episodes: s.number_of_episodes,
      rating: s.vote_average,
      votes: s.vote_count,
      genres: s.genres.map(g => g.name),
      poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
      banner: `https://image.tmdb.org/t/p/original${s.backdrop_path}`,
      creators: creators,
      cast: cast,
      type: 'series',
      seasonsList: s.seasons.map(season => ({
        number: season.season_number,
        episodes: season.episode_count,
        name: season.name
      }))
    });
  } catch (error) {
    res.status(404).json({ error: 'Detalles no encontrados' });
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
    const { s, e } = req.query;
    const externalIds = await tmdb.get(`/tv/${id}/external_ids`);
    const imdbId = externalIds.data.imdb_id;
    res.json(getEmbedUrls(imdbId, id, s || 1, e || 1));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el enlace del episodio' });
  }
};
