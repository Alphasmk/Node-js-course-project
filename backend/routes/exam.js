const express = require('express');
const ExamController = require('../controllers/ExamController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const examController = new ExamController();

router.get('/info', (req, res) => examController.getInfo(req, res));

router.post('/start', authMiddleware, (req, res) => examController.start(req, res));
router.post('/:attemptId/finish', authMiddleware, (req, res) => examController.finish(req, res));
router.get('/attempts/:attemptId', authMiddleware, (req, res) => examController.getAttemptDetails(req, res));

module.exports = router;
