const express = require('express');
const router = express.Router();
const animeController = require('../controllers/animeController');

router.get('/search', animeController.searchAnime);
router.get('/categories', animeController.getAnimeCategories);

module.exports = router;
