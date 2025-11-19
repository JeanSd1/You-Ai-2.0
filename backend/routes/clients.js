const express = require('express');
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  markPaid,
  updateCredentials,
  toggleActive,
} = require('../controllers/clientController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createClient);
router.post('/:id/mark-paid', protect, markPaid);
router.put('/:id/credentials', protect, updateCredentials);
router.post('/:id/toggle-active', protect, toggleActive);
router.get('/', protect, getClients);
router.get('/:id', protect, getClientById);
router.put('/:id', protect, updateClient);
router.delete('/:id', protect, deleteClient);

module.exports = router;
