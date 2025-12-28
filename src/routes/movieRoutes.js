const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

router.get('/', movieController.getPopularMovies);
router.get('/search', movieController.searchMovies);
router.get('/:id', movieController.getMovieById);

module.exports = router;