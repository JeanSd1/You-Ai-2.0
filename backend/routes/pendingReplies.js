const express = require('express');
const router = express.Router();
const { listPending, markSent } = require('../controllers/pendingRepliesController');
const protect = require('../middleware/auth');

router.get('/', protect, listPending);
router.post('/:id/mark-sent', protect, markSent);

module.exports = router;
