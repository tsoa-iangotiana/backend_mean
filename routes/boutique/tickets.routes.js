const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicket,
  addMessage
} = require('../../controllers/boutique/tickets.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.use(protect, estBoutique);

router.route('/')
  .post(createTicket)
  .get(getTickets);

router.get('/:id', getTicket);
router.post('/:id/messages', addMessage);

module.exports = router;