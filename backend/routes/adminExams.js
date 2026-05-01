const express = require('express');
const AdminExamController = require('../controllers/AdminExamController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const adminExamController = new AdminExamController();

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/config', (req, res) => adminExamController.getConfig(req, res));
router.put('/config', (req, res) => adminExamController.updateConfig(req, res));
router.get('/question-pool', (req, res) => adminExamController.getQuestionPoolForAdmin(req, res));
router.get('/variants', (req, res) => adminExamController.getVariants(req, res));
router.post('/variants', (req, res) => adminExamController.createVariant(req, res));
router.put('/variants/:variantId', (req, res) => adminExamController.updateVariant(req, res));
router.delete('/variants/:variantId', (req, res) => adminExamController.deleteVariant(req, res));

module.exports = router;
