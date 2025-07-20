const { Router } = require('express');
const router = Router();
const aiController = require('../controllers/ai.controller')

router.get('/get-result',aiController.getResult)

module.exports = router;