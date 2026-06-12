const express = require('express');
const router = express.Router();
const animeController = require('../controllers/animeController');

router.get('/search', animeController.searchAnime);
router.get('/categories', animeController.getAnimeCategories);
router.get('/:id/henaojara', animeController.getHenaojaraEmbed);

module.exports = router;
