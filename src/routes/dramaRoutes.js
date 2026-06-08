const express = require('express');
const router = express.Router();
const dramaController = require('../controllers/dramaController');

router.get('/categories', dramaController.getDramaCategories);

module.exports = router;
