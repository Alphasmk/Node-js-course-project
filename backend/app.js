const express = require('express');
const path = require('path');
const { initDb } = require('./config/db');
const userRoutes = require('./routes/users');
const adminQuestionRoutes = require('./routes/adminQuestions');
const adminExamRoutes = require('./routes/adminExams');
const catalogRoutes = require('./routes/catalog');
const examRoutes = require('./routes/exam');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use('/api/users', userRoutes);
app.use('/api/admin/questions', adminQuestionRoutes);
app.use('/api/admin/exams', adminExamRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/exam', examRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'API сервер для ПДД тестирования',
        version: '1.0.0',
        endpoints: {
            users: {
                register: 'POST /api/users/register',
                login: 'POST /api/users/login',
                profile: 'GET /api/users/profile',
                getAll: 'GET /api/users',
                getById: 'GET /api/users/:id',
                update: 'PUT /api/users/:id',
                attempts: 'GET /api/users/:id/attempts',
                stats: 'GET /api/users/:id/stats'
            },
            admin: {
                createSection: 'POST /api/admin/questions/sections',
                createTicket: 'POST /api/admin/questions/tickets',
                updateSection: 'PUT /api/admin/questions/sections/:sectionId',
                updateTicket: 'PUT /api/admin/questions/tickets/:ticketId',
                questionMeta: 'GET /api/admin/questions/meta',
                getTicketQuestions: 'GET /api/admin/questions/tickets/:ticketId/questions',
                createQuestion: 'POST /api/admin/questions',
                updateQuestion: 'PUT /api/admin/questions/:questionId',
                examConfig: 'GET /api/admin/exams/config',
                updateExamConfig: 'PUT /api/admin/exams/config',
                examVariants: 'GET /api/admin/exams/variants'
            },
            catalog: {
                sections: 'GET /api/catalog/sections',
                sectionQuestions: 'GET /api/catalog/sections/:sectionId/questions',
                sectionTickets: 'GET /api/catalog/sections/:sectionId/tickets',
                allTickets: 'GET /api/catalog/tickets'
            },
            exam: {
                info: 'GET /api/exam/info',
                start: 'POST /api/exam/start',
                finish: 'POST /api/exam/:attemptId/finish',
                attemptDetails: 'GET /api/exam/attempts/:attemptId'
            }
        }
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Маршрут не найден',
        path: req.path,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'Размер изображения не должен превышать 5MB'
        });
    }

    if (err.message === 'Допустимы только изображения JPG, PNG, WEBP') {
        return res.status(400).json({
            error: err.message
        });
    }

    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: err.message
    });
});

async function startServer() {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`Сервер запущен на http://localhost:${PORT}`);
            console.log(`Документация доступна на GET /`);
        });
    } catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
