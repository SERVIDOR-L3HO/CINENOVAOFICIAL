exports.getTVChannels = async (req, res) => {
  try {
    const channels = [
      { 
        id: 1, 
        title: 'HBO Max', 
        overview: 'Acceso a series y películas premium',
        year: 2024,
        rating: 8.5,
        poster: 'https://image.tmdb.org/t/p/w500/tuomPhY7UtuPTqqKBbkRvIpH7B.png',
        banner: 'https://image.tmdb.org/t/p/w1280/hqXc8DlZHmNEYvV6L3nMAT2wDYO.jpg',
        embeds: { vip: 'https://www.youtube.com/embed/jNQXAC9IVRw?autoplay=1' }
      },
      { 
        id: 2, 
        title: 'Transmisión Deportiva En Vivo', 
        overview: 'Los mejores partidos y eventos deportivos en directo',
        year: 2024,
        rating: 8.0,
        poster: 'https://image.tmdb.org/t/p/w500/wwemzKWzjKYJFfCeiB57q3r4Bcm.png',
        banner: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1280&h=720&fit=crop',
        embeds: { vip: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1' }
      },
      { 
        id: 3, 
        title: 'Noticias 24/7', 
        overview: 'Cobertura de noticias en vivo y actualizaciones',
        year: 2024,
        rating: 7.8,
        poster: 'https://image.tmdb.org/t/p/w500/ifhbMqSlIk9vBrhR6v4mC3H6Sdb.png',
        banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1280&h=720&fit=crop',
        embeds: { vip: 'https://www.youtube.com/embed/2L47V8J2_gI?autoplay=1' }
      },
      { 
        id: 4, 
        title: 'Películas Clásicas', 
        overview: 'Transmisión de películas clásicas del cine mundial',
        year: 2024,
        rating: 8.2,
        poster: 'https://image.tmdb.org/t/p/w500/68vAnUfbHkvWnmRj2pZ9Xrm93pU.png',
        banner: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1280&h=720&fit=crop',
        embeds: { vip: 'https://www.youtube.com/embed/M7lc1BCxL00?autoplay=1' }
      },
      { 
        id: 5, 
        title: 'Música y Entretenimiento', 
        overview: 'Conciertos y shows de entretenimiento en vivo',
        year: 2024,
        rating: 8.7,
        poster: 'https://image.tmdb.org/t/p/w500/8y31QaRvWmXMRFw3SlOvsNlmCl2.png',
        banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1280&h=720&fit=crop',
        embeds: { vip: 'https://www.youtube.com/embed/1bcEvF0P4-8?autoplay=1' }
      },
      { 
        id: 6, 
        title: 'Documentales En Vivo', 
        overview: 'Documentales fascinantes transmitidos en directo',
        year: 2024,
        rating: 8.4,
        poster: 'https://image.tmdb.org/t/p/w500/iDbIEoE37A63rsYS0Ydxvm3GXyC.png',
        banner: 'https://images.unsplash.com/photo-1533241749411-a585d60d3a86?w=1280&h=720&fit=crop',
        embeds: { vip: 'https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1' }
      }
    ];
    
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener canales' });
  }
};