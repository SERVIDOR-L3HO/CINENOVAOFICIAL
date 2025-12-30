const express = require('express');
const router = express.Router();
const tvController = require('../controllers/tvController');

router.get('/', tvController.getTVChannels);
router.get('/channels', tvController.getTVChannels);

module.exports = router;