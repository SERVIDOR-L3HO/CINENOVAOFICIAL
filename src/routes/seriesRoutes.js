const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/seriesController');

router.get('/', seriesController.getAllSeries);
router.get('/search', seriesController.searchSeries);
router.get('/categories', seriesController.getSeriesCategories);
router.get('/:id/details', seriesController.getSeriesDetails);
router.get('/:id/episode', seriesController.getEpisodeEmbed);
router.get('/:id', seriesController.getSeriesById);

module.exports = router;