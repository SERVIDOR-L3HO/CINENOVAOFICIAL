const axios = require('axios');

const TMDB_TOKEN = process.env.TMDB_API_KEY;

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_TOKEN}`
  }
});

const getEmbedUrls = (imdbId, tmdbId, season = 1, episode = 1) => {
  const useImdb = imdbId || null;
  return {
    latino: [
      {
        name: 'Servidor 1',
        url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=38bdf8&autoplay=true&title=false`,
        quality: 'HD'
      }
    ],
    castellano: [
      { name: 'Servidor 2', url: `https://unlimplay.com/play/embed/tv/${tmdbId}/${season}/${episode}?sub=es&lang=es&audio=es&muted=0&autoplay=1`, quality: '1080p' }
    ],
    original: [
      { name: 'Servidor 3', url: `https://vaplayer.ru/embed/tv/${imdbId || tmdbId}/${season}/${episode}?sub=es&lang=es&audio=es&muted=0&autoplay=1`, quality: 'HD' }
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
    const lang = req.query.lang || 'es-MX';
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
    const base = { language: lang, sort_by: 'popularity.desc', include_adult: false };
    const b2 = { ...base, page: 2 };
    const [
      t1, t2, tr1, tr2,
      sp1, sp2, nv1, nv2, sc1, sc2,
      dr1, dr2, co1, co2, cr1, cr2,
      sf1, sf2, an1, an2, dc1, dc2
    ] = await Promise.all([
      tmdb.get('/trending/tv/week', { params: { language: lang, page: 1 } }),
      tmdb.get('/trending/tv/week', { params: { language: lang, page: 2 } }),
      tmdb.get('/tv/top_rated', { params: { language: lang, page: 1 } }),
      tmdb.get('/tv/top_rated', { params: { language: lang, page: 2 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_original_language: 'es' } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_original_language: 'es' } }),
      tmdb.get('/discover/tv', { params: { ...base, with_original_language: 'es', with_genres: 18, sort_by: 'vote_count.desc' } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_original_language: 'es', with_genres: 18, sort_by: 'vote_count.desc' } }),
      tmdb.get('/discover/tv', { params: { ...base, with_original_language: 'es', with_genres: 80 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_original_language: 'es', with_genres: 80 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_genres: 18 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_genres: 18 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_genres: 35 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_genres: 35 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_genres: 80 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_genres: 80 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_genres: 10765 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_genres: 10765 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_genres: 16 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_genres: 16 } }),
      tmdb.get('/discover/tv', { params: { ...base, with_genres: 99 } }),
      tmdb.get('/discover/tv', { params: { ...b2,   with_genres: 99 } }),
    ]);
    const merge = (r1, r2) => [...r1.data.results, ...r2.data.results]
      .filter(s => s.poster_path && s.backdrop_path).map(mapSeries);
    res.json([
      { id: 'trending',      label: 'EN TENDENCIA',        title: 'Series del Momento',    accent: '#38bdf8', items: merge(t1, t2) },
      { id: 'en_espanol',    label: '🇲🇽 PRODUCCIÓN LATINA', title: 'Series en Español',     accent: '#3b82f6', items: merge(sp1, sp2) },
      { id: 'novelas',       label: '❤️ DRAMA LATINO',     title: 'Telenovelas & Drama',    accent: '#f43f5e', items: merge(nv1, nv2) },
      { id: 'crimen_latino', label: '🔫 SUSPENSO LATINO',  title: 'Crimen & Narco',         accent: '#dc2626', items: merge(sc1, sc2) },
      { id: 'top_rated',     label: 'TOP GLOBAL',          title: 'Mejor Calificadas',      accent: '#facc15', items: merge(tr1, tr2) },
      { id: 'drama',         label: 'EMOCIONES',           title: 'Drama Internacional',    accent: '#a78bfa', items: merge(dr1, dr2) },
      { id: 'comedy',        label: 'ENTRETENIMIENTO',     title: 'Comedia',                accent: '#34d399', items: merge(co1, co2) },
      { id: 'crime',         label: 'MISTERIO',            title: 'Crimen & Policíaca',     accent: '#fb7185', items: merge(cr1, cr2) },
      { id: 'scifi',         label: 'FUTURO',              title: 'Ciencia Ficción',        accent: '#22d3ee', items: merge(sf1, sf2) },
      { id: 'animation',     label: 'ARTE EN MOVIMIENTO',  title: 'Animación',              accent: '#e879f9', items: merge(an1, an2) },
      { id: 'documentary',   label: 'CONOCIMIENTO',        title: 'Documental',             accent: '#60a5fa', items: merge(dc1, dc2) },
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
    const [details, credits, externalIds, videosLang, videosEn] = await Promise.all([
      tmdb.get(`/tv/${id}`, { params: { language: lang } }),
      tmdb.get(`/tv/${id}/credits`, { params: { language: lang } }),
      tmdb.get(`/tv/${id}/external_ids`),
      tmdb.get(`/tv/${id}/videos`, { params: { language: lang } }),
      tmdb.get(`/tv/${id}/videos`, { params: { language: 'en-US' } })
    ]);
    const s = details.data;
    const imdbId = externalIds.data.imdb_id;
    const creators = s.created_by && s.created_by.length > 0 ? s.created_by.map(c => c.name) : null;
    const cast = credits.data.cast.slice(0, 8).map(a => ({
      name: a.name,
      character: a.character,
      photo: a.profile_path ? `https://image.tmdb.org/t/p/w185${a.profile_path}` : null
    }));

    const allVideos = [...(videosLang.data.results || []), ...(videosEn.data.results || [])];
    const trailer = allVideos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      || allVideos.find(v => v.site === 'YouTube');
    const trailerKey = trailer ? trailer.key : null;

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
      trailerKey: trailerKey,
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
      params: { language: lang || 'es-MX', query, include_adult: false }
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
          popularity: s.popularity || 0,
          type: 'series'
        };
      } catch (e) {
        return {
          id: s.id,
          title: s.name,
          year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
          poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
          popularity: s.popularity || 0,
          type: 'series'
        };
      }
    }));

    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Error en la búsqueda de series' });
  }
};

exports.getMoreByCategory = async (req, res) => {
  try {
    const { category, page, lang } = req.query;
    const p = parseInt(page) || 3;
    const l = lang || 'es-MX';
    const base = { language: l, sort_by: 'popularity.desc', include_adult: false, page: p };

    const categoryMap = {
      trending:      () => tmdb.get('/trending/tv/week',  { params: { language: l, page: p } }),
      top_rated:     () => tmdb.get('/tv/top_rated',      { params: { language: l, page: p } }),
      en_espanol:    () => tmdb.get('/discover/tv',       { params: { ...base, with_original_language: 'es' } }),
      novelas:       () => tmdb.get('/discover/tv',       { params: { ...base, with_original_language: 'es', with_genres: 18 } }),
      crimen_latino: () => tmdb.get('/discover/tv',       { params: { ...base, with_original_language: 'es', with_genres: 80 } }),
      drama:         () => tmdb.get('/discover/tv',       { params: { ...base, with_genres: 18 } }),
      comedy:        () => tmdb.get('/discover/tv',       { params: { ...base, with_genres: 35 } }),
      crime:         () => tmdb.get('/discover/tv',       { params: { ...base, with_genres: 80 } }),
      scifi:         () => tmdb.get('/discover/tv',       { params: { ...base, with_genres: 10765 } }),
      animation:     () => tmdb.get('/discover/tv',       { params: { ...base, with_genres: 16 } }),
      documentary:   () => tmdb.get('/discover/tv',       { params: { ...base, with_genres: 99 } }),
    };

    const fetcher = categoryMap[category];
    if (!fetcher) return res.status(400).json({ error: 'Categoría inválida' });

    const response = await fetcher();
    const items = response.data.results
      .filter(s => s.poster_path)
      .map(s => ({
        id: s.id,
        title: s.name,
        overview: s.overview,
        year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
        rating: s.vote_average,
        poster: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
        banner: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : null,
        type: 'series'
      }));

    res.json(items);
  } catch (error) {
    console.error('getMoreByCategory series error:', error.message);
    res.status(500).json({ error: 'Error al cargar más contenido' });
  }
};

exports.getSeasonEpisodes = async (req, res) => {
  try {
    const { id, season } = req.params;
    const lang = req.query.lang || 'es-MX';
    const response = await tmdb.get(`/tv/${id}/season/${season}`, { params: { language: lang } });
    const episodes = (response.data.episodes || []).map(ep => ({
      number: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      runtime: ep.runtime,
      thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
      airDate: ep.air_date
    }));
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener episodios de la temporada' });
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
