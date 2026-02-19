const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicket,
  addMessage
} = require('../../controllers/boutique/tickets.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.use(authMiddleware(['boutique']));

router.route('/')
  .post(createTicket)
  .get(getTickets);

router.get('/:id', getTicket);
router.post('/:id/messages', addMessage);

module.exports = router;