const fs = require('fs').promises;
const path = require('path');

const moviesPath = path.join(__dirname, '../data/movies.json');

exports.getAllMovies = async (req, res) => {
  try {
    const data = await fs.readFile(moviesPath, 'utf8');
    const movies = JSON.parse(data);
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer las películas' });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    const data = await fs.readFile(moviesPath, 'utf8');
    const movies = JSON.parse(data);
    const movie = movies.find(m => m.id === parseInt(req.params.id));
    if (!movie) return res.status(404).json({ error: 'Película no encontrada' });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar la película' });
  }
};