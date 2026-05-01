const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Role, TicketAttempt, Ticket, TicketMistake, Question, Answer, ExamAttempt, ExamVariant } = require('../models');
const { sequelize } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'pdd-secret-key-change-in-production';
const QUESTIONS_PER_TICKET = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class UserController {
    async createUser(req, res) {
        try {
            const { username, email, password, roleId } = req.body;
            if (!username || !email || !password) {
                return res.status(400).json({ 
                    error: 'Пожалуйста, заполните все поля: username, email, password' 
                });
            }

            const existingUser = await User.findOne({ 
                where: { username } 
            });
            if (existingUser) {
                return res.status(409).json({ 
                    error: 'Пользователь с таким именем уже существует' 
                });
            }

            const existingEmail = await User.findOne({ 
                where: { email } 
            });
            if (existingEmail) {
                return res.status(409).json({ 
                    error: 'Email уже зарегистрирован' 
                });
            }

            let finalRoleId = roleId;
            if (!finalRoleId) {
                const userRole = await Role.findOne({ where: { name: 'user' } });
                finalRoleId = userRole.id;
            } else {
                
                const role = await Role.findByPk(finalRoleId);
                if (!role) {
                    return res.status(400).json({ 
                        error: 'Указанная роль не существует' 
                    });
                }
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await User.create({
                username,
                email,
                password_hash: passwordHash,
                role_id: finalRoleId
            });

            return res.status(201).json({
                message: 'Пользователь успешно создан',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role_id: user.role_id,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            console.error('Ошибка при создании пользователя:', error);
            return res.status(500).json({ 
                error: 'Ошибка при создании пользователя' 
            });
        }
    }

    async registration(req, res) {
        return this.createUser(req, res);
    }

    async login(req, res) {
        try {
            const { username, email, password } = req.body;

            if (!password || (!username && !email)) {
                return res.status(400).json({ 
                    error: 'Пожалуйста, введите username/email и пароль' 
                });
            }

            const where = username 
                ? { username } 
                : { email };

            const user = await User.findOne({ 
                where,
                include: [{ model: Role, attributes: ['id', 'name'] }]
            });

            if (!user) {
                return res.status(401).json({ 
                    error: 'Пользователь не найден' 
                });
            }

            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ 
                    error: 'Неверный пароль' 
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.Role ? user.Role.name : 'user'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                message: 'Успешная авторизация',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.Role ? user.Role.name : null,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            console.error('Ошибка при авторизации:', error);
            return res.status(500).json({ 
                error: 'Ошибка при авторизации' 
            });
        }
    }

    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findByPk(id, {
                attributes: { exclude: ['password_hash'] },
                include: [{ model: Role, attributes: ['id', 'name'] }]
            });

            if (!user) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }

            return res.status(200).json(user);
        } catch (error) {
            console.error('Ошибка при получении пользователя:', error);
            return res.status(500).json({ 
                error: 'Ошибка при получении пользователя' 
            });
        }
    }

    async getAllUsers(req, res) {
        try {
            const { limit = 20, page = 1 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await User.findAndCountAll({
                attributes: { exclude: ['password_hash'] },
                include: [{ model: Role, attributes: ['id', 'name'] }],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']]
            });

            return res.status(200).json({
                total: count,
                limit: parseInt(limit),
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                users: rows
            });
        } catch (error) {
            console.error('Ошибка при получении пользователей:', error);
            return res.status(500).json({ 
                error: 'Ошибка при получении пользователей' 
            });
        }
    }

    async getAllList(req, res) {
        return this.getAllUsers(req, res);
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { username, email, password, roleId } = req.body;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            if (requesterId !== parseInt(id) && requesterRole !== 'admin') {
                return res.status(403).json({ 
                    error: 'Вы можете обновлять только свой профиль' 
                });
            }

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }

            if (username && username !== user.username) {
                const existingUser = await User.findOne({ 
                    where: { username } 
                });
                if (existingUser) {
                    return res.status(409).json({ 
                        error: 'Это имя пользователя уже используется' 
                    });
                }
                user.username = username;
            }

            if (email && email !== user.email) {
                const normalizedEmail = String(email).trim();

                if (!EMAIL_PATTERN.test(normalizedEmail)) {
                    return res.status(400).json({
                        error: 'Некорректный формат email'
                    });
                }

                const existingEmail = await User.findOne({ 
                    where: { email: normalizedEmail } 
                });
                if (existingEmail) {
                    return res.status(409).json({ 
                        error: 'Этот email уже используется' 
                    });
                }
                user.email = normalizedEmail;
            }

            if (password) user.password_hash = await bcrypt.hash(password, 10);

            if (roleId) {
                if (requesterRole !== 'admin') {
                    return res.status(403).json({ 
                        error: 'Только администратор может менять роли' 
                    });
                }
                
                const role = await Role.findByPk(roleId);
                if (!role) {
                    return res.status(400).json({ 
                        error: 'Указанная роль не существует. Доступные роли: user, admin' 
                    });
                }
                user.role_id = roleId;
            }

            await user.save();

            return res.status(200).json({
                message: 'Пользователь успешно обновлен',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role_id: user.role_id,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
            return res.status(500).json({ 
                error: 'Ошибка при обновлении пользователя' 
            });
        }
    }

    async startTicketAttempt(req, res) {
        try {
            const { ticketId } = req.body;
            const userId = req.user.id;

            if (!ticketId) {
                return res.status(400).json({ error: 'Не указан билет для прохождения' });
            }

            const ticket = await Ticket.findByPk(ticketId, {
                attributes: ['id', 'title'],
                include: [
                    {
                        model: Question,
                        attributes: ['id'],
                        through: { attributes: [] }
                    }
                ]
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const questionsCount = Array.isArray(ticket.Questions) ? ticket.Questions.length : 0;
            if (questionsCount !== QUESTIONS_PER_TICKET) {
                return res.status(400).json({
                    error: `Билет должен содержать ровно ${QUESTIONS_PER_TICKET} вопросов`
                });
            }

            const attempt = await TicketAttempt.create({
                user_id: userId,
                ticket_id: ticket.id,
                score: 0,
                is_passed: null,
                completed_at: null,
                answers_snapshot: []
            });

            return res.status(201).json({
                message: 'Попытка прохождения создана',
                attempt: {
                    id: attempt.id,
                    user_id: attempt.user_id,
                    ticket_id: attempt.ticket_id,
                    score: attempt.score,
                    is_passed: attempt.is_passed,
                    attempted_at: attempt.attempted_at,
                    completed_at: attempt.completed_at
                }
            });
        } catch (error) {
            console.error('Ошибка при создании попытки:', error);
            return res.status(500).json({ error: 'Ошибка при создании попытки' });
        }
    }

    async finishTicketAttempt(req, res) {
        let transaction;

        try {
            const { attemptId } = req.params;
            const { answers } = req.body;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            const attempt = await TicketAttempt.findByPk(attemptId, {
                include: [
                    {
                        model: Ticket,
                        attributes: ['id', 'title', 'max_mistakes_allowed'],
                        include: [
                            {
                                model: Question,
                                attributes: ['id', 'text', 'image_url', 'rule_reference'],
                                through: { attributes: [] },
                                include: [
                                    {
                                        model: Answer,
                                        attributes: ['id', 'text', 'is_correct']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            if (!attempt) {
                return res.status(404).json({ error: 'Попытка не найдена' });
            }

            if (requesterRole !== 'admin' && Number(attempt.user_id) !== Number(requesterId)) {
                return res.status(403).json({ error: 'Нет доступа к этой попытке' });
            }

            if (attempt.completed_at) {
                return res.status(409).json({ error: 'Попытка уже завершена' });
            }

            const ticketQuestions = Array.isArray(attempt.Ticket?.Questions) ? attempt.Ticket.Questions : [];
            if (ticketQuestions.length !== QUESTIONS_PER_TICKET) {
                return res.status(400).json({
                    error: `Билет должен содержать ровно ${QUESTIONS_PER_TICKET} вопросов`
                });
            }

            const normalizedAnswers = Array.isArray(answers) ? answers : [];
            const selectedAnswerByQuestionId = new Map();

            normalizedAnswers.forEach((item) => {
                const questionId = Number(item?.questionId);
                const answerId = Number(item?.answerId);

                if (!Number.isNaN(questionId) && questionId > 0 && !Number.isNaN(answerId) && answerId > 0) {
                    selectedAnswerByQuestionId.set(questionId, answerId);
                }
            });

            let correctCount = 0;
            const mistakes = [];

            const answersSnapshot = ticketQuestions.map((question) => {
                const questionAnswers = Array.isArray(question.Answers)
                    ? [...question.Answers].sort((a, b) => a.id - b.id)
                    : [];

                const correctAnswer = questionAnswers.find((answer) => answer.is_correct);
                const selectedAnswerId = selectedAnswerByQuestionId.get(Number(question.id)) || null;
                const selectedAnswer = selectedAnswerId
                    ? questionAnswers.find((answer) => Number(answer.id) === Number(selectedAnswerId))
                    : null;

                const isCorrect = Boolean(correctAnswer)
                    && Boolean(selectedAnswer)
                    && Number(correctAnswer.id) === Number(selectedAnswer.id);

                if (isCorrect) {
                    correctCount += 1;
                } else {
                    mistakes.push({
                        question_id: question.id,
                        rule_reference: question.rule_reference || null
                    });
                }

                return {
                    question_id: question.id,
                    question_text: question.text,
                    image_url: question.image_url || null,
                    rule_reference: question.rule_reference || null,
                    selected_answer_id: selectedAnswer ? selectedAnswer.id : null,
                    selected_answer_text: selectedAnswer ? selectedAnswer.text : null,
                    correct_answer_id: correctAnswer ? correctAnswer.id : null,
                    correct_answer_text: correctAnswer ? correctAnswer.text : null,
                    is_correct: isCorrect
                };
            });

            const maxMistakesAllowed = Number(attempt.Ticket?.max_mistakes_allowed ?? 2);
            const isPassed = mistakes.length <= maxMistakesAllowed;
            const passThreshold = Math.max(0, QUESTIONS_PER_TICKET - maxMistakesAllowed);

            transaction = await sequelize.transaction();

            await TicketMistake.destroy({
                where: { attempt_id: attempt.id },
                transaction
            });

            if (mistakes.length > 0) {
                await TicketMistake.bulkCreate(
                    mistakes.map((mistake) => ({
                        attempt_id: attempt.id,
                        question_id: mistake.question_id,
                        rule_reference: mistake.rule_reference
                    })),
                    { transaction }
                );
            }

            await attempt.update(
                {
                    score: correctCount,
                    is_passed: isPassed,
                    completed_at: new Date(),
                    answers_snapshot: answersSnapshot
                },
                { transaction }
            );

            await transaction.commit();

            return res.status(200).json({
                message: 'Попытка успешно завершена',
                result: {
                    attempt_id: attempt.id,
                    ticket_id: attempt.ticket_id,
                    score: correctCount,
                    questions_total: QUESTIONS_PER_TICKET,
                    is_passed: isPassed,
                    pass_threshold: passThreshold,
                    max_mistakes_allowed: maxMistakesAllowed,
                    mistakes_count: mistakes.length
                }
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при завершении попытки:', error);
            return res.status(500).json({ error: 'Ошибка при завершении попытки' });
        }
    }

    async getUserExamAttempts(req, res) {
        try {
            const { id } = req.params;
            const { limit = 20, page = 1 } = req.query;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            if (requesterRole !== 'admin' && Number(requesterId) !== Number(id)) {
                return res.status(403).json({ error: 'Вы можете видеть только свои попытки' });
            }

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await ExamAttempt.findAndCountAll({
                where: { user_id: id },
                attributes: [
                    'id',
                    'exam_variant_id',
                    'score',
                    'mistakes_count',
                    'is_passed',
                    'timed_out',
                    'started_at',
                    'completed_at'
                ],
                include: [
                    {
                        model: ExamVariant,
                        attributes: ['id']
                    }
                ],
                order: [['started_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return res.status(200).json({
                total: count,
                limit: parseInt(limit),
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                attempts: rows
            });
        } catch (error) {
            console.error('Ошибка при получении попыток экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при получении попыток экзамена' });
        }
    }

    async getUserExamAttemptDetails(req, res) {
        try {
            const { attemptId } = req.params;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            const attempt = await ExamAttempt.findByPk(attemptId, {
                include: [
                    {
                        model: ExamVariant,
                        attributes: ['id']
                    }
                ]
            });

            if (!attempt) {
                return res.status(404).json({ error: 'Попытка экзамена не найдена' });
            }

            if (requesterRole !== 'admin' && Number(attempt.user_id) !== Number(requesterId)) {
                return res.status(403).json({ error: 'Нет доступа к этой попытке экзамена' });
            }

            const snapshot = Array.isArray(attempt.answers_snapshot) ? attempt.answers_snapshot : [];
            const answers = requesterRole === 'admin'
                ? snapshot
                : snapshot.map((item) => ({
                    question_id: item.question_id,
                    question_text: item.question_text,
                    image_url: item.image_url,
                    rule_reference: item.rule_reference,
                    selected_answer_text: item.selected_answer_text,
                    correct_answer_text: item.correct_answer_text,
                    is_correct: item.is_correct
                }));

            return res.status(200).json({
                attempt: {
                    id: attempt.id,
                    user_id: attempt.user_id,
                    exam_variant_id: attempt.exam_variant_id,
                    score: attempt.score,
                    mistakes_count: attempt.mistakes_count,
                    max_mistakes_allowed: attempt.max_mistakes_allowed,
                    is_passed: attempt.is_passed,
                    timed_out: attempt.timed_out,
                    started_at: attempt.started_at,
                    completed_at: attempt.completed_at,
                    questions_total: snapshot.length,
                    answers
                }
            });
        } catch (error) {
            console.error('Ошибка при получении деталей экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при получении деталей экзамена' });
        }
    }

    async getTicketStatsByUsers(req, res) {
        try {
            const { ticketId } = req.params;
            const { limit = 20, page = 1 } = req.query;

            const normalizedTicketId = Number(ticketId);
            if (Number.isNaN(normalizedTicketId) || normalizedTicketId <= 0) {
                return res.status(400).json({ error: 'Некорректный ID билета' });
            }

            const ticket = await Ticket.findByPk(normalizedTicketId, {
                attributes: ['id', 'title']
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const attempts = await TicketAttempt.findAll({
                where: { ticket_id: normalizedTicketId },
                attributes: ['id', 'user_id', 'score', 'is_passed', 'attempted_at', 'completed_at'],
                include: [
                    {
                        model: User,
                        attributes: ['id', 'username', 'email']
                    }
                ],
                order: [['attempted_at', 'DESC']]
            });

            const overall = {
                total_attempts: attempts.length,
                completed_attempts: attempts.filter((attempt) => Boolean(attempt.completed_at)).length,
                passed_attempts: attempts.filter((attempt) => Boolean(attempt.completed_at) && Boolean(attempt.is_passed)).length
            };

            const byUser = new Map();

            attempts.forEach((attempt) => {
                const user = attempt.User;
                if (!user) {
                    return;
                }

                const userId = Number(user.id);
                if (!byUser.has(userId)) {
                    byUser.set(userId, {
                        user_id: userId,
                        username: user.username,
                        email: user.email,
                        total_attempts: 0,
                        completed_attempts: 0,
                        passed_attempts: 0,
                        best_score: null,
                        last_attempt_at: null
                    });
                }

                const userStats = byUser.get(userId);
                userStats.total_attempts += 1;

                if (attempt.completed_at) {
                    userStats.completed_attempts += 1;
                }

                if (attempt.completed_at && attempt.is_passed) {
                    userStats.passed_attempts += 1;
                }

                const attemptScore = Number(attempt.score ?? 0);
                if (userStats.best_score === null || attemptScore > userStats.best_score) {
                    userStats.best_score = attemptScore;
                }

                const attemptedAt = attempt.attempted_at ? new Date(attempt.attempted_at) : null;
                if (attemptedAt && (!userStats.last_attempt_at || attemptedAt > new Date(userStats.last_attempt_at))) {
                    userStats.last_attempt_at = attempt.attempted_at;
                }
            });

            const usersStats = Array.from(byUser.values())
                .map((item) => ({
                    ...item,
                    pass_rate: item.completed_attempts > 0
                        ? (item.passed_attempts / item.completed_attempts * 100).toFixed(2) + '%'
                        : '0%'
                }))
                .sort((a, b) => {
                    const dateA = a.last_attempt_at ? new Date(a.last_attempt_at).getTime() : 0;
                    const dateB = b.last_attempt_at ? new Date(b.last_attempt_at).getTime() : 0;
                    return dateB - dateA;
                });

            const normalizedLimit = Math.max(1, Number(limit) || 20);
            const normalizedPage = Math.max(1, Number(page) || 1);
            const offset = (normalizedPage - 1) * normalizedLimit;
            const pagedUsersStats = usersStats.slice(offset, offset + normalizedLimit);

            return res.status(200).json({
                ticket: {
                    id: ticket.id,
                    title: ticket.title
                },
                overall: {
                    ...overall,
                    pass_rate: overall.completed_attempts > 0
                        ? (overall.passed_attempts / overall.completed_attempts * 100).toFixed(2) + '%'
                        : '0%'
                },
                total_users: usersStats.length,
                limit: normalizedLimit,
                page: normalizedPage,
                pages: Math.ceil(usersStats.length / normalizedLimit),
                users: pagedUsersStats
            });
        } catch (error) {
            console.error('Ошибка при получении статистики по билету:', error);
            return res.status(500).json({ error: 'Ошибка при получении статистики по билету' });
        }
    }

    async getAttemptDetails(req, res) {
        try {
            const { attemptId } = req.params;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            const attempt = await TicketAttempt.findByPk(attemptId, {
                include: [
                    {
                        model: Ticket,
                        attributes: ['id', 'title']
                    }
                ]
            });

            if (!attempt) {
                return res.status(404).json({ error: 'Попытка не найдена' });
            }

            if (requesterRole !== 'admin' && Number(attempt.user_id) !== Number(requesterId)) {
                return res.status(403).json({ error: 'Нет доступа к этой попытке' });
            }

            const snapshot = Array.isArray(attempt.answers_snapshot) ? attempt.answers_snapshot : [];
            const answers = requesterRole === 'admin'
                ? snapshot
                : snapshot.map((item) => ({
                    question_id: item.question_id,
                    question_text: item.question_text,
                    image_url: item.image_url,
                    rule_reference: item.rule_reference,
                    is_correct: item.is_correct
                }));

            return res.status(200).json({
                attempt: {
                    id: attempt.id,
                    user_id: attempt.user_id,
                    ticket_id: attempt.ticket_id,
                    ticket_title: attempt.Ticket ? attempt.Ticket.title : null,
                    score: attempt.score,
                    is_passed: attempt.is_passed,
                    attempted_at: attempt.attempted_at,
                    completed_at: attempt.completed_at,
                    questions_total: snapshot.length || QUESTIONS_PER_TICKET,
                    answers
                }
            });
        } catch (error) {
            console.error('Ошибка при получении деталей попытки:', error);
            return res.status(500).json({ error: 'Ошибка при получении деталей попытки' });
        }
    }

    async getUserAttempts(req, res) {
        try {
            const { id } = req.params;
            const { ticketId, limit = 20, page = 1 } = req.query;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            if (requesterRole !== 'admin' && Number(requesterId) !== Number(id)) {
                return res.status(403).json({
                    error: 'Вы можете видеть только свои попытки'
                });
            }

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }

            const offset = (page - 1) * limit;

            const where = { user_id: id };
            if (ticketId) where.ticket_id = ticketId;

            const { count, rows } = await TicketAttempt.findAndCountAll({
                where,
                attributes: [
                    'id',
                    'user_id',
                    'ticket_id',
                    'score',
                    'is_passed',
                    'attempted_at',
                    'completed_at'
                ],
                include: [
                    { 
                        model: Ticket, 
                        attributes: ['id', 'title']
                    },
                    { 
                        model: TicketMistake, 
                        attributes: ['id', 'rule_reference'],
                        include: [{ 
                            model: Question, 
                            attributes: ['id', 'text', 'rule_reference'] 
                        }]
                    }
                ],
                order: [['attempted_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return res.status(200).json({
                total: count,
                limit: parseInt(limit),
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                attempts: rows
            });
        } catch (error) {
            console.error('Ошибка при получении попыток:', error);
            return res.status(500).json({ 
                error: 'Ошибка при получении попыток' 
            });
        }
    }

    async getUserStats(req, res) {
        try {
            const { id } = req.params;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;

            if (requesterId !== parseInt(id) && requesterRole !== 'admin') {
                return res.status(403).json({ 
                    error: 'Вы можете видеть только свою статистику' 
                });
            }

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }

            const totalAttempts = await TicketAttempt.count({
                where: { user_id: id }
            });

            const completedAttempts = await TicketAttempt.count({
                where: {
                    user_id: id,
                    completed_at: { [Op.not]: null }
                }
            });

            const inProgressAttempts = await TicketAttempt.count({
                where: {
                    user_id: id,
                    completed_at: null
                }
            });

            const passedAttempts = await TicketAttempt.count({
                where: {
                    user_id: id,
                    is_passed: true,
                    completed_at: { [Op.not]: null }
                }
            });

            const examTotalAttempts = await ExamAttempt.count({
                where: { user_id: id }
            });

            const examCompletedAttempts = await ExamAttempt.count({
                where: {
                    user_id: id,
                    completed_at: { [Op.not]: null }
                }
            });

            const examPassedAttempts = await ExamAttempt.count({
                where: {
                    user_id: id,
                    is_passed: true,
                    completed_at: { [Op.not]: null }
                }
            });

            const avgScoreResult = await TicketAttempt.findAll({
                where: {
                    user_id: id,
                    completed_at: { [Op.not]: null }
                },
                attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avg_score']],
                raw: true
            });

            const maxScore = await TicketAttempt.findAll({
                where: {
                    user_id: id,
                    completed_at: { [Op.not]: null }
                },
                attributes: [[sequelize.fn('MAX', sequelize.col('score')), 'max_score']],
                raw: true
            });

            const avgScore = avgScoreResult[0].avg_score ? parseFloat(avgScoreResult[0].avg_score).toFixed(2) : 0;
            const maxScoreValue = maxScore[0].max_score ? maxScore[0].max_score : 0;

            return res.status(200).json({
                user_id: id,
                username: user.username,
                email: user.email,
                total_attempts: totalAttempts,
                completed_attempts: completedAttempts,
                in_progress_attempts: inProgressAttempts,
                passed_attempts: passedAttempts,
                pass_rate: completedAttempts > 0 ? (passedAttempts / completedAttempts * 100).toFixed(2) + '%' : '0%',
                average_score: avgScore,
                max_score: maxScoreValue,
                exam_total_attempts: examTotalAttempts,
                exam_completed_attempts: examCompletedAttempts,
                exam_passed_attempts: examPassedAttempts,
                exam_pass_rate: examCompletedAttempts > 0 ? (examPassedAttempts / examCompletedAttempts * 100).toFixed(2) + '%' : '0%'
            });
        } catch (error) {
            console.error('Ошибка при получении статистики:', error);
            return res.status(500).json({ 
                error: 'Ошибка при получении статистики' 
            });
        }
    }

    async check(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Не авторизирован'
                });
            }

            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password_hash'] },
                include: [{ model: Role, attributes: ['id', 'name'] }]
            });

            return res.status(200).json(user);
        } catch (error) {
            console.error('Ошибка при проверке авторизации:', error);
            return res.status(401).json({
                error: 'Ошибка при проверке авторизации'
            });
        }
    }
}

module.exports = UserController;
