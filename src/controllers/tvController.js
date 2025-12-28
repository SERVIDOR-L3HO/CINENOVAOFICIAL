const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`
  }
});

exports.getTVChannels = async (req, res) => {
  try {
    // TMDB no tiene una sección de "Canales de TV en vivo" como tal, 
    // pero podemos listar las redes de TV más populares o contenido "On the Air".
    const response = await tmdb.get('/network/1', { // Ejemplo con una red (HBO)
        params: { language: 'es-ES' }
    });
    
    // Como alternativa profesional para una "API de Películas y TV", 
    // solemos incluir listas de reproducción o categorías.
    // Aquí simularemos una respuesta de canales basada en redes populares de TMDB.
    const channels = [
      { id: 49, name: 'HBO', logo: 'https://image.tmdb.org/t/p/w500/tuomPhY7UtuPTqqKBbkRvIpH7B.png' },
      { id: 213, name: 'Netflix', logo: 'https://image.tmdb.org/t/p/w500/wwemzKWzjKYJFfCeiB57q3r4Bcm.png' },
      { id: 1024, name: 'Amazon', logo: 'https://image.tmdb.org/t/p/w500/ifhbMqSlIk9vBrhR6v4mC3H6Sdb.png' },
      { id: 2552, name: 'Apple TV+', logo: 'https://image.tmdb.org/t/p/w500/68vAnUfbHkvWnmRj2pZ9Xrm93pU.png' }
    ];
    
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener canales' });
  }
};