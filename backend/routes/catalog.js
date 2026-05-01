const express = require('express');
const CatalogController = require('../controllers/CatalogController');

const router = express.Router();
const catalogController = new CatalogController();

router.get('/sections', (req, res) => catalogController.getSections(req, res));
router.get('/sections/:sectionId/questions', (req, res) => catalogController.getSectionQuestions(req, res));
router.get('/sections/:sectionId/tickets', (req, res) => catalogController.getSectionTickets(req, res));
router.get('/tickets', (req, res) => catalogController.getAllTickets(req, res));
router.get('/tickets/:ticketId/questions', (req, res) => catalogController.getTicketQuestionsForPassing(req, res));

module.exports = router;
