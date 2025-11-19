const express = require('express');
const { webhook, verify } = require('../controllers/whatsappController');

const router = express.Router();

// Meta verification
router.get('/webhook', verify);
// Incoming messages (POST)
router.post('/webhook', express.json(), webhook);

// Simulate AI reply (no send)
router.post('/simulate', express.json(), require('../controllers/whatsappController').simulate);

module.exports = router;
