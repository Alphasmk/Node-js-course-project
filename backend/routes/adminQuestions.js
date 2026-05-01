const express = require('express');
const AdminQuestionController = require('../controllers/AdminQuestionController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadQuestionImage } = require('../middleware/upload');

const router = express.Router();
const adminQuestionController = new AdminQuestionController();

router.use(authMiddleware);
router.use(requireRole('admin'));

router.post('/sections', (req, res) => adminQuestionController.createSection(req, res));
router.post('/tickets', (req, res) => adminQuestionController.createTicket(req, res));
router.put('/sections/:sectionId', (req, res) => adminQuestionController.updateSection(req, res));
router.put('/tickets/:ticketId', (req, res) => adminQuestionController.updateTicket(req, res));
router.delete('/sections/:sectionId', (req, res) => adminQuestionController.deleteSection(req, res));
router.delete('/tickets/:ticketId', (req, res) => adminQuestionController.deleteTicket(req, res));
router.get('/meta', (req, res) => adminQuestionController.getQuestionMeta(req, res));
router.get('/unassigned', (req, res) => adminQuestionController.getUnassignedQuestions(req, res));
router.get('/tickets/:ticketId/questions', (req, res) => adminQuestionController.getTicketQuestions(req, res));
router.post('/tickets/:ticketId/questions/:questionId', (req, res) => adminQuestionController.addQuestionToTicket(req, res));
router.delete('/tickets/:ticketId/questions/:questionId', (req, res) => adminQuestionController.removeQuestionFromTicket(req, res));
router.post(
    '/',
    uploadQuestionImage.single('image'),
    (req, res) => adminQuestionController.createQuestion(req, res)
);
router.delete('/:questionId', (req, res) => adminQuestionController.deleteQuestion(req, res));
router.put(
    '/:questionId',
    uploadQuestionImage.single('image'),
    (req, res) => adminQuestionController.updateQuestion(req, res)
);

module.exports = router;
