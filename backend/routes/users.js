const express = require('express');
const UserController = require('../controllers/UserController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const userController = new UserController();

router.post('/register', (req, res) => userController.registration(req, res));

router.post('/login', (req, res) => userController.login(req, res));

router.get('/profile', authMiddleware, (req, res) => userController.check(req, res));

router.get('/', authMiddleware, requireRole('admin'), (req, res) => userController.getAllUsers(req, res));

router.get('/admin/tickets/:ticketId/stats', authMiddleware, requireRole('admin'), (req, res) => userController.getTicketStatsByUsers(req, res));

router.post('/attempts/start', authMiddleware, (req, res) => userController.startTicketAttempt(req, res));

router.post('/attempts/:attemptId/finish', authMiddleware, (req, res) => userController.finishTicketAttempt(req, res));

router.get('/attempts/:attemptId', authMiddleware, (req, res) => userController.getAttemptDetails(req, res));

router.get('/:id/exam-attempts', authMiddleware, (req, res) => userController.getUserExamAttempts(req, res));

router.get('/exam-attempts/:attemptId', authMiddleware, (req, res) => userController.getUserExamAttemptDetails(req, res));

router.get('/:id', authMiddleware, (req, res) => userController.getUserById(req, res));

router.put('/:id', authMiddleware, (req, res) => userController.updateUser(req, res));

router.get('/:id/attempts', authMiddleware, (req, res) => userController.getUserAttempts(req, res));

router.get('/:id/stats', authMiddleware, (req, res) => userController.getUserStats(req, res));

module.exports = router;
