const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Section, Ticket, Question, Answer } = require('../models');

const QUESTIONS_PER_TICKET = 10;

const getSectionSortGroup = (title) => {
    const normalized = String(title || '').trim().toLowerCase();

    if (normalized.startsWith('глава')) {
        return 0;
    }

    if (normalized.startsWith('приложение')) {
        return 1;
    }

    return 2;
};

const compareSectionTitles = (left, right) => {
    const leftTitle = String(left?.title || '');
    const rightTitle = String(right?.title || '');

    const leftGroup = getSectionSortGroup(leftTitle);
    const rightGroup = getSectionSortGroup(rightTitle);

    if (leftGroup !== rightGroup) {
        return leftGroup - rightGroup;
    }

    return leftTitle.localeCompare(rightTitle, 'ru', { numeric: true, sensitivity: 'base' });
};

const getQuestionImagesRoot = () => {
    return process.env.QUESTION_IMAGES_DIR
        ? path.resolve(process.env.QUESTION_IMAGES_DIR)
        : path.resolve(__dirname, '..', '..', 'frontend', 'public', 'theme-images');
};

class AdminQuestionController {
    async createSection(req, res) {
        try {
            const { title } = req.body;

            if (!title || !String(title).trim()) {
                return res.status(400).json({ error: 'Название темы обязательно' });
            }

            const normalizedTitle = String(title).trim();
            const existingSection = await Section.findOne({ where: { title: normalizedTitle } });

            if (existingSection) {
                return res.status(409).json({ error: 'Тема с таким названием уже существует' });
            }

            const section = await Section.create({ title: normalizedTitle });

            return res.status(201).json({
                message: 'Тема успешно создана',
                section
            });
        } catch (error) {
            console.error('Ошибка при создании темы:', error);
            return res.status(500).json({ error: 'Ошибка при создании темы' });
        }
    }

    async updateSection(req, res) {
        try {
            const { sectionId } = req.params;
            const { title } = req.body;

            if (!title || !String(title).trim()) {
                return res.status(400).json({ error: 'Название темы обязательно' });
            }

            const section = await Section.findByPk(sectionId);
            if (!section) {
                return res.status(404).json({ error: 'Тема не найдена' });
            }

            const normalizedTitle = String(title).trim();
            const existingSection = await Section.findOne({
                where: {
                    title: normalizedTitle,
                    id: { [Op.ne]: section.id }
                }
            });

            if (existingSection) {
                return res.status(409).json({ error: 'Тема с таким названием уже существует' });
            }

            await section.update({ title: normalizedTitle });

            return res.status(200).json({
                message: 'Тема успешно обновлена',
                section
            });
        } catch (error) {
            console.error('Ошибка при обновлении темы:', error);
            return res.status(500).json({ error: 'Ошибка при обновлении темы' });
        }
    }

    async createTicket(req, res) {
        try {
            const { title, sectionId, maxMistakesAllowed } = req.body;

            if (!sectionId) {
                return res.status(400).json({ error: 'Для билета необходимо выбрать тему' });
            }

            const section = await Section.findByPk(sectionId);
            if (!section) {
                return res.status(404).json({ error: 'Тема для билета не найдена' });
            }

            const normalizedTitle = title && String(title).trim() ? String(title).trim() : null;
            if (normalizedTitle) {
                const existingTicket = await Ticket.findOne({ where: { title: normalizedTitle } });

                if (existingTicket) {
                    return res.status(409).json({ error: 'Билет с таким названием уже существует' });
                }
            }

            const finalMaxMistakesAllowed = maxMistakesAllowed !== undefined
                ? Number(maxMistakesAllowed)
                : 2;

            if (
                Number.isNaN(finalMaxMistakesAllowed)
                || finalMaxMistakesAllowed < 0
                || finalMaxMistakesAllowed > QUESTIONS_PER_TICKET
            ) {
                return res.status(400).json({
                    error: `Максимум ошибок должен быть от 0 до ${QUESTIONS_PER_TICKET}`
                });
            }

            const ticket = await Ticket.create({
                title: normalizedTitle,
                section_id: section.id,
                max_mistakes_allowed: finalMaxMistakesAllowed
            });

            return res.status(201).json({
                message: 'Билет успешно создан',
                ticket,
                questions_per_ticket: QUESTIONS_PER_TICKET
            });
        } catch (error) {
            console.error('Ошибка при создании билета:', error);
            return res.status(500).json({ error: 'Ошибка при создании билета' });
        }
    }

    async updateTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const { title, sectionId, maxMistakesAllowed } = req.body;

            const ticket = await Ticket.findByPk(ticketId, {
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

            if (!sectionId) {
                return res.status(400).json({ error: 'Для билета необходимо выбрать тему' });
            }

            const section = await Section.findByPk(sectionId);
            if (!section) {
                return res.status(404).json({ error: 'Тема для билета не найдена' });
            }

            const normalizedTitle = title && String(title).trim() ? String(title).trim() : null;
            if (normalizedTitle) {
                const existingTicket = await Ticket.findOne({
                    where: {
                        title: normalizedTitle,
                        id: { [Op.ne]: ticket.id }
                    }
                });

                if (existingTicket) {
                    return res.status(409).json({ error: 'Билет с таким названием уже существует' });
                }
            }

            const finalMaxMistakesAllowed = maxMistakesAllowed !== undefined
                ? Number(maxMistakesAllowed)
                : Number(ticket.max_mistakes_allowed ?? 2);

            if (
                Number.isNaN(finalMaxMistakesAllowed)
                || finalMaxMistakesAllowed < 0
                || finalMaxMistakesAllowed > QUESTIONS_PER_TICKET
            ) {
                return res.status(400).json({
                    error: `Максимум ошибок должен быть числом от 0 до ${QUESTIONS_PER_TICKET}`
                });
            }

            let transaction;
            try {
                transaction = await sequelize.transaction();

                await ticket.update(
                    {
                        title: normalizedTitle,
                        section_id: section.id,
                        max_mistakes_allowed: finalMaxMistakesAllowed
                    },
                    { transaction }
                );

                if (Array.isArray(ticket.Questions) && ticket.Questions.length > 0) {
                    const questionIds = ticket.Questions.map((question) => question.id);
                    const ticketQuestions = await Question.findAll({
                        where: { id: questionIds },
                        include: [
                            {
                                model: Section,
                                attributes: ['id'],
                                through: { attributes: [] }
                            }
                        ],
                        transaction
                    });

                    await Promise.all(ticketQuestions.map(async (question) => {
                        const hasSection = Array.isArray(question.Sections)
                            && question.Sections.some((questionSection) => Number(questionSection.id) === Number(section.id));
                        if (!hasSection) {
                            await question.addSection(section, { transaction });
                        }
                    }));
                }

                await transaction.commit();
            } catch (error) {
                if (transaction) {
                    await transaction.rollback();
                }
                throw error;
            }

            return res.status(200).json({
                message: 'Билет успешно обновлен',
                ticket: {
                    id: ticket.id,
                    title: normalizedTitle,
                    section_id: section.id,
                    section_title: section.title,
                    max_mistakes_allowed: finalMaxMistakesAllowed
                }
            });
        } catch (error) {
            console.error('Ошибка при обновлении билета:', error);
            return res.status(500).json({ error: 'Ошибка при обновлении билета' });
        }
    }

    async deleteSection(req, res) {
        try {
            const { sectionId } = req.params;

            const section = await Section.findByPk(sectionId);
            if (!section) {
                return res.status(404).json({ error: 'Тема не найдена' });
            }

            const ticketsCount = await Ticket.count({ where: { section_id: section.id } });
            if (ticketsCount > 0) {
                return res.status(409).json({
                    error: `Нельзя удалить тему: сначала удалите привязанные билеты (${ticketsCount})`
                });
            }

            await section.destroy();

            return res.status(200).json({
                message: 'Тема успешно удалена'
            });
        } catch (error) {
            console.error('Ошибка при удалении темы:', error);
            return res.status(500).json({ error: 'Ошибка при удалении темы' });
        }
    }

    async deleteTicket(req, res) {
        let transaction;

        try {
            const { ticketId } = req.params;

            const ticket = await Ticket.findByPk(ticketId, {
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

            const detachedQuestions = Array.isArray(ticket.Questions) ? ticket.Questions.length : 0;

            transaction = await sequelize.transaction();
            await ticket.setQuestions([], { transaction });
            await ticket.destroy({ transaction });
            await transaction.commit();

            return res.status(200).json({
                message: 'Билет успешно удален',
                detached_questions: detachedQuestions
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при удалении билета:', error);
            return res.status(500).json({ error: 'Ошибка при удалении билета' });
        }
    }

    async removeQuestionFromTicket(req, res) {
        let transaction;

        try {
            const { ticketId, questionId } = req.params;

            const ticket = await Ticket.findByPk(ticketId, {
                attributes: ['id', 'title']
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const question = await Question.findByPk(questionId, {
                attributes: ['id', 'text']
            });

            if (!question) {
                return res.status(404).json({ error: 'Вопрос не найден' });
            }

            const hasRelation = await ticket.hasQuestion(question);
            if (!hasRelation) {
                return res.status(404).json({ error: 'Этот вопрос не привязан к выбранному билету' });
            }

            transaction = await sequelize.transaction();
            await ticket.removeQuestion(question, { transaction });
            await transaction.commit();

            const remainingQuestions = await ticket.countQuestions();

            return res.status(200).json({
                message: 'Вопрос удален из билета',
                ticket: {
                    id: ticket.id,
                    title: ticket.title,
                    questions_count: remainingQuestions,
                    questions_required: QUESTIONS_PER_TICKET,
                    is_complete: remainingQuestions === QUESTIONS_PER_TICKET
                }
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при удалении вопроса из билета:', error);
            return res.status(500).json({ error: 'Ошибка при удалении вопроса из билета' });
        }
    }

    async addQuestionToTicket(req, res) {
        let transaction;

        try {
            const { ticketId, questionId } = req.params;

            const ticket = await Ticket.findByPk(ticketId, {
                attributes: ['id', 'title', 'section_id'],
                include: [
                    {
                        model: Section,
                        attributes: ['id', 'title']
                    }
                ]
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            if (!ticket.section_id) {
                return res.status(400).json({ error: 'У билета не задана тема' });
            }

            const question = await Question.findByPk(questionId, {
                attributes: ['id', 'text'],
                include: [
                    {
                        model: Section,
                        attributes: ['id'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id', 'title'],
                        through: { attributes: [] }
                    }
                ]
            });

            if (!question) {
                return res.status(404).json({ error: 'Вопрос не найден' });
            }

            const hasRelation = await ticket.hasQuestion(question);
            if (hasRelation) {
                return res.status(409).json({ error: 'Вопрос уже привязан к этому билету' });
            }

            if (Array.isArray(question.Tickets) && question.Tickets.length > 0) {
                return res.status(409).json({
                    error: 'Можно добавить только неприкрепленный вопрос. Сначала удалите его из текущего билета.'
                });
            }

            const hasTargetSection = Array.isArray(question.Sections)
                && question.Sections.some((section) => Number(section.id) === Number(ticket.section_id));

            if (!hasTargetSection) {
                return res.status(400).json({ error: 'Тема вопроса не совпадает с темой выбранного билета' });
            }

            const currentQuestionsInTicket = await ticket.countQuestions();
            if (currentQuestionsInTicket >= QUESTIONS_PER_TICKET) {
                return res.status(400).json({
                    error: `В билете может быть только ${QUESTIONS_PER_TICKET} вопросов`
                });
            }

            transaction = await sequelize.transaction();
            await ticket.addQuestion(question, { transaction });
            await transaction.commit();

            const nextQuestionsInTicket = await ticket.countQuestions();

            return res.status(200).json({
                message: 'Вопрос добавлен в билет',
                ticket: {
                    id: ticket.id,
                    title: ticket.title,
                    section_id: ticket.section_id,
                    section_title: ticket.Section ? ticket.Section.title : null,
                    questions_count: nextQuestionsInTicket,
                    questions_required: QUESTIONS_PER_TICKET,
                    is_complete: nextQuestionsInTicket === QUESTIONS_PER_TICKET
                }
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при добавлении вопроса в билет:', error);
            return res.status(500).json({ error: 'Ошибка при добавлении вопроса в билет' });
        }
    }

    async getUnassignedQuestions(req, res) {
        try {
            const { sectionId } = req.query;
            const normalizedSectionId = sectionId ? Number(sectionId) : null;

            if (sectionId && (Number.isNaN(normalizedSectionId) || normalizedSectionId <= 0)) {
                return res.status(400).json({ error: 'Некорректный фильтр темы' });
            }

            const questions = await Question.findAll({
                attributes: ['id', 'text', 'rule_reference', 'explanation'],
                include: [
                    {
                        model: Answer,
                        attributes: ['id']
                    },
                    {
                        model: Section,
                        attributes: ['id', 'title'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id'],
                        through: { attributes: [] }
                    }
                ],
                order: [['id', 'DESC']]
            });

            const unassignedQuestions = questions
                .filter((question) => !Array.isArray(question.Tickets) || question.Tickets.length === 0)
                .filter((question) => {
                    if (!normalizedSectionId) {
                        return true;
                    }

                    return Array.isArray(question.Sections)
                        && question.Sections.some((section) => Number(section.id) === normalizedSectionId);
                })
                .map((question) => {
                    const primarySection = Array.isArray(question.Sections) && question.Sections[0]
                        ? question.Sections[0]
                        : null;

                    return {
                        id: question.id,
                        text: question.text,
                        rule_reference: question.rule_reference,
                        explanation: question.explanation,
                        answers_count: Array.isArray(question.Answers) ? question.Answers.length : 0,
                        section_id: primarySection ? primarySection.id : null,
                        section_title: primarySection ? primarySection.title : null
                    };
                });

            return res.status(200).json({
                questions: unassignedQuestions,
                total: unassignedQuestions.length
            });
        } catch (error) {
            console.error('Ошибка при получении неприкрепленных вопросов:', error);
            return res.status(500).json({ error: 'Ошибка при получении неприкрепленных вопросов' });
        }
    }

    async getQuestionMeta(req, res) {
        try {
            const [sections, tickets] = await Promise.all([
                Section.findAll({
                    attributes: ['id', 'title'],
                    order: [['title', 'ASC']]
                }),
                Ticket.findAll({
                    attributes: ['id', 'title', 'max_mistakes_allowed'],
                    include: [
                        {
                            model: Section,
                            attributes: ['id', 'title']
                        },
                        {
                            model: Question,
                            attributes: ['id'],
                            through: { attributes: [] }
                        }
                    ],
                    order: [['id', 'ASC']]
                })
            ]);

            const serializedTickets = tickets.map((ticket) => {
                const questionsCount = Array.isArray(ticket.Questions) ? ticket.Questions.length : 0;
                return {
                    id: ticket.id,
                    title: ticket.title,
                    section_id: ticket.Section ? ticket.Section.id : null,
                    section_title: ticket.Section ? ticket.Section.title : null,
                    questions_count: questionsCount,
                    questions_required: QUESTIONS_PER_TICKET,
                    is_complete: questionsCount === QUESTIONS_PER_TICKET,
                    can_add_questions: questionsCount < QUESTIONS_PER_TICKET,
                    max_mistakes_allowed: Number(ticket.max_mistakes_allowed ?? 2)
                };
            });

            const serializedSections = sections
                .map((section) => ({
                    id: section.id,
                    title: section.title
                }))
                .sort(compareSectionTitles);

            return res.status(200).json({
                sections: serializedSections,
                tickets: serializedTickets,
                questions_per_ticket: QUESTIONS_PER_TICKET
            });
        } catch (error) {
            console.error('Ошибка при получении метаданных вопросов:', error);
            return res.status(500).json({ error: 'Ошибка при получении тем/билетов' });
        }
    }

    async getTicketQuestions(req, res) {
        try {
            const { ticketId } = req.params;

            const ticket = await Ticket.findByPk(ticketId, {
                attributes: ['id', 'title', 'section_id', 'max_mistakes_allowed'],
                include: [
                    {
                        model: Section,
                        attributes: ['id', 'title']
                    },
                    {
                        model: Question,
                        attributes: ['id', 'text', 'image_url', 'rule_reference', 'explanation'],
                        through: { attributes: [] },
                        include: [
                            {
                                model: Answer,
                                attributes: ['id', 'text', 'is_correct']
                            },
                            {
                                model: Section,
                                attributes: ['id', 'title'],
                                through: { attributes: [] }
                            }
                        ]
                    }
                ]
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const serializedQuestions = Array.isArray(ticket.Questions)
                ? ticket.Questions.map((question) => {
                    const section = Array.isArray(question.Sections) && question.Sections.length > 0
                        ? question.Sections[0]
                        : null;

                    const answers = Array.isArray(question.Answers)
                        ? question.Answers
                            .sort((a, b) => a.id - b.id)
                            .map((answer) => ({
                                id: answer.id,
                                text: answer.text,
                                is_correct: answer.is_correct
                            }))
                        : [];

                    return {
                        id: question.id,
                        text: question.text,
                        image_url: question.image_url,
                        rule_reference: question.rule_reference,
                        explanation: question.explanation,
                        section_id: section ? section.id : null,
                        section_title: section ? section.title : null,
                        ticket_id: ticket.id,
                        ticket_title: ticket.title,
                        answers
                    };
                })
                : [];

            return res.status(200).json({
                ticket: {
                    id: ticket.id,
                    title: ticket.title,
                    section_id: ticket.Section ? ticket.Section.id : null,
                    section_title: ticket.Section ? ticket.Section.title : null,
                    max_mistakes_allowed: Number(ticket.max_mistakes_allowed ?? 2),
                    questions_count: serializedQuestions.length,
                    questions_required: QUESTIONS_PER_TICKET,
                    is_complete: serializedQuestions.length === QUESTIONS_PER_TICKET
                },
                questions: serializedQuestions
            });
        } catch (error) {
            console.error('Ошибка при получении вопросов билета:', error);
            return res.status(500).json({ error: 'Ошибка при получении вопросов билета' });
        }
    }

    async createQuestion(req, res) {
        const uploadedImagePath = req.file ? `/theme-images/${req.file.filename}` : null;
        let transaction;

        try {
            const {
                text,
                sectionId,
                ticketId,
                answers,
                correctAnswer,
                explanation,
                ruleReference,
                url,
                imageUrl
            } = req.body;

            if (!text || !text.trim()) {
                return this.cleanupAndFail(req.file, res, 400, 'Текст вопроса обязателен');
            }

            if (!sectionId) {
                return this.cleanupAndFail(req.file, res, 400, 'Не выбрана тема ПДД');
            }

            if (!correctAnswer) {
                return this.cleanupAndFail(req.file, res, 400, 'Укажите номер правильного ответа');
            }

            const parsedAnswers = this.parseAnswers(answers);

            if (!parsedAnswers || parsedAnswers.length < 2 || parsedAnswers.length > 6) {
                return this.cleanupAndFail(req.file, res, 400, 'Нужно указать от 2 до 6 вариантов ответов');
            }

            const normalizedAnswers = parsedAnswers
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean);

            if (normalizedAnswers.length !== parsedAnswers.length) {
                return this.cleanupAndFail(req.file, res, 400, 'Все варианты ответов должны быть непустыми');
            }

            const correctIndex = Number(correctAnswer);
            if (Number.isNaN(correctIndex) || correctIndex < 1 || correctIndex > normalizedAnswers.length) {
                return this.cleanupAndFail(req.file, res, 400, 'Номер правильного ответа вне допустимого диапазона');
            }

            const section = await Section.findByPk(sectionId);
            if (!section) {
                return this.cleanupAndFail(req.file, res, 404, 'Тема ПДД не найдена');
            }

            let ticket = null;
            if (ticketId) {
                ticket = await Ticket.findByPk(ticketId);
                if (!ticket) {
                    return this.cleanupAndFail(req.file, res, 404, 'Билет не найден');
                }

                if (!ticket.section_id || Number(ticket.section_id) !== Number(section.id)) {
                    return this.cleanupAndFail(req.file, res, 400, 'Выбранный билет не относится к выбранной теме');
                }

                const currentQuestionsInTicket = await ticket.countQuestions();
                if (currentQuestionsInTicket >= QUESTIONS_PER_TICKET) {
                    return this.cleanupAndFail(
                        req.file,
                        res,
                        400,
                        `В билете может быть только ${QUESTIONS_PER_TICKET} вопросов`
                    );
                }
            }

            transaction = await sequelize.transaction();

            const providedImageUrl = imageUrl && String(imageUrl).trim()
                ? String(imageUrl).trim()
                : null;

            const question = await Question.create({
                text: text.trim(),
                url: url && String(url).trim() ? String(url).trim() : null,
                image_url: uploadedImagePath || providedImageUrl,
                rule_reference: ruleReference ? String(ruleReference).trim() : null,
                explanation: explanation && String(explanation).trim()
                    ? String(explanation).trim()
                    : null
            }, { transaction });

            await question.addSection(section, { transaction });

            if (ticket) {
                await question.addTicket(ticket, { transaction });
            }

            const answersToCreate = normalizedAnswers.map((answerText, index) => ({
                question_id: question.id,
                text: answerText,
                is_correct: index + 1 === correctIndex
            }));

            await Answer.bulkCreate(answersToCreate, { transaction });

            await transaction.commit();

            const createdQuestion = await Question.findByPk(question.id, {
                include: [
                    {
                        model: Answer,
                        attributes: ['id', 'text', 'is_correct']
                    },
                    {
                        model: Section,
                        attributes: ['id', 'title'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id', 'title'],
                        through: { attributes: [] }
                    }
                ]
            });

            return res.status(201).json({
                message: 'Вопрос успешно добавлен',
                question: createdQuestion
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при создании вопроса:', error);
            this.removeFile(req.file);

            return res.status(500).json({
                error: 'Ошибка при добавлении вопроса'
            });
        }
    }

    async updateQuestion(req, res) {
        const uploadedImagePath = req.file ? `/theme-images/${req.file.filename}` : null;
        let transaction;

        try {
            const { questionId } = req.params;
            const {
                text,
                sectionId,
                ticketId,
                answers,
                correctAnswer,
                explanation,
                ruleReference,
                removeImage,
                url,
                imageUrl
            } = req.body;

            const question = await Question.findByPk(questionId, {
                include: [
                    {
                        model: Section,
                        attributes: ['id'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id'],
                        through: { attributes: [] }
                    },
                    {
                        model: Answer,
                        attributes: ['id', 'text', 'is_correct']
                    }
                ]
            });

            if (!question) {
                return this.cleanupAndFail(req.file, res, 404, 'Вопрос не найден');
            }

            const normalizedText = text && String(text).trim();
            if (!normalizedText) {
                return this.cleanupAndFail(req.file, res, 400, 'Текст вопроса обязателен');
            }

            const parsedAnswers = this.parseAnswers(answers);
            if (!parsedAnswers || parsedAnswers.length < 2 || parsedAnswers.length > 6) {
                return this.cleanupAndFail(req.file, res, 400, 'Нужно указать от 2 до 6 вариантов ответов');
            }

            const normalizedAnswers = parsedAnswers
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean);

            if (normalizedAnswers.length !== parsedAnswers.length) {
                return this.cleanupAndFail(req.file, res, 400, 'Все варианты ответов должны быть непустыми');
            }

            const correctIndex = Number(correctAnswer);
            if (Number.isNaN(correctIndex) || correctIndex < 1 || correctIndex > normalizedAnswers.length) {
                return this.cleanupAndFail(req.file, res, 400, 'Номер правильного ответа вне допустимого диапазона');
            }

            const targetSectionId = sectionId
                ? Number(sectionId)
                : (Array.isArray(question.Sections) && question.Sections[0] ? question.Sections[0].id : null);

            if (!targetSectionId) {
                return this.cleanupAndFail(req.file, res, 400, 'Не выбрана тема ПДД');
            }

            const section = await Section.findByPk(targetSectionId);
            if (!section) {
                return this.cleanupAndFail(req.file, res, 404, 'Тема ПДД не найдена');
            }

            const normalizedTicketValue = this.normalizeOptionalNumberField(ticketId);
            if (normalizedTicketValue.invalid) {
                return this.cleanupAndFail(req.file, res, 400, 'Некорректный билет');
            }

            const currentTicketId = Array.isArray(question.Tickets) && question.Tickets[0]
                ? Number(question.Tickets[0].id)
                : null;

            const nextTicketId = normalizedTicketValue.provided
                ? normalizedTicketValue.value
                : currentTicketId;

            let ticket = null;
            if (nextTicketId) {
                ticket = await Ticket.findByPk(nextTicketId);
                if (!ticket) {
                    return this.cleanupAndFail(req.file, res, 404, 'Билет не найден');
                }

                if (!ticket.section_id || Number(ticket.section_id) !== Number(section.id)) {
                    return this.cleanupAndFail(req.file, res, 400, 'Выбранный билет не относится к выбранной теме');
                }

                const isMovingToAnotherTicket = Number(currentTicketId) !== Number(ticket.id);
                if (isMovingToAnotherTicket) {
                    const currentQuestionsInTicket = await ticket.countQuestions();
                    if (currentQuestionsInTicket >= QUESTIONS_PER_TICKET) {
                        return this.cleanupAndFail(
                            req.file,
                            res,
                            400,
                            `В билете может быть только ${QUESTIONS_PER_TICKET} вопросов`
                        );
                    }
                }
            }

            transaction = await sequelize.transaction();

            const previousImageUrl = question.image_url;
            const providedImageUrl = imageUrl && String(imageUrl).trim()
                ? String(imageUrl).trim()
                : null;

            const nextImageUrl = uploadedImagePath
                ? uploadedImagePath
                : (String(removeImage) === 'true' ? null : (providedImageUrl || question.image_url));

            await question.update({
                text: normalizedText,
                url: url && String(url).trim() ? String(url).trim() : question.url,
                image_url: nextImageUrl,
                rule_reference: ruleReference && String(ruleReference).trim()
                    ? String(ruleReference).trim()
                    : null,
                explanation: explanation && String(explanation).trim()
                    ? String(explanation).trim()
                    : null
            }, { transaction });

            await question.setSections([section], { transaction });
            await question.setTickets(ticket ? [ticket] : [], { transaction });

            await Answer.destroy({ where: { question_id: question.id }, transaction });
            await Answer.bulkCreate(
                normalizedAnswers.map((answerText, index) => ({
                    question_id: question.id,
                    text: answerText,
                    is_correct: index + 1 === correctIndex
                })),
                { transaction }
            );

            await transaction.commit();

            const shouldDeleteOldImage = uploadedImagePath
                || String(removeImage) === 'true'
                || (
                    providedImageUrl
                    && previousImageUrl
                    && previousImageUrl !== providedImageUrl
                    && previousImageUrl.startsWith('/theme-images/')
                );
            if (shouldDeleteOldImage && previousImageUrl && previousImageUrl.startsWith('/theme-images/') && previousImageUrl !== uploadedImagePath) {
                this.removeStoredImageByUrl(previousImageUrl);
            }

            const updatedQuestion = await Question.findByPk(question.id, {
                include: [
                    {
                        model: Answer,
                        attributes: ['id', 'text', 'is_correct']
                    },
                    {
                        model: Section,
                        attributes: ['id', 'title'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id', 'title'],
                        through: { attributes: [] }
                    }
                ]
            });

            return res.status(200).json({
                message: 'Вопрос успешно обновлен',
                question: updatedQuestion
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при обновлении вопроса:', error);
            this.removeFile(req.file);

            return res.status(500).json({
                error: 'Ошибка при обновлении вопроса'
            });
        }
    }

    async deleteQuestion(req, res) {
        let transaction;

        try {
            const { questionId } = req.params;

            const question = await Question.findByPk(questionId, {
                include: [
                    {
                        model: Section,
                        attributes: ['id'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id'],
                        through: { attributes: [] }
                    }
                ]
            });

            if (!question) {
                return res.status(404).json({ error: 'Вопрос не найден' });
            }

            const imageUrl = question.image_url;

            transaction = await sequelize.transaction();

            await Answer.destroy({ where: { question_id: question.id }, transaction });
            await question.setSections([], { transaction });
            await question.setTickets([], { transaction });
            await question.destroy({ transaction });

            await transaction.commit();

            if (imageUrl && imageUrl.startsWith('/theme-images/')) {
                this.removeStoredImageByUrl(imageUrl);
            }

            return res.status(200).json({
                message: 'Вопрос успешно удален'
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при удалении вопроса:', error);
            return res.status(500).json({ error: 'Ошибка при удалении вопроса' });
        }
    }

    normalizeOptionalNumberField(value) {
        if (value === undefined) {
            return { provided: false, value: null, invalid: false };
        }

        if (value === null || value === '') {
            return { provided: true, value: null, invalid: false };
        }

        const numericValue = Number(value);
        if (Number.isNaN(numericValue) || numericValue <= 0) {
            return { provided: true, value: null, invalid: true };
        }

        return { provided: true, value: numericValue, invalid: false };
    }

    parseAnswers(answers) {
        if (Array.isArray(answers)) {
            return answers;
        }

        if (typeof answers === 'string') {
            try {
                const parsed = JSON.parse(answers);
                return Array.isArray(parsed) ? parsed : null;
            } catch (error) {
                return null;
            }
        }

        return null;
    }

    cleanupAndFail(file, res, statusCode, message) {
        this.removeFile(file);
        return res.status(statusCode).json({ error: message });
    }

    removeStoredImageByUrl(imageUrl) {
        if (!imageUrl) {
            return;
        }

        const normalizedPath = String(imageUrl).replace('/theme-images/', '');
        if (!normalizedPath || normalizedPath === imageUrl) {
            return;
        }

        const absolutePath = path.resolve(getQuestionImagesRoot(), normalizedPath);
        if (!fs.existsSync(absolutePath)) {
            return;
        }

        try {
            fs.unlinkSync(absolutePath);
        } catch (error) {
            console.error('Не удалось удалить старое изображение вопроса:', error.message);
        }
    }

    removeFile(file) {
        if (!file || !file.path) {
            return;
        }

        try {
            const absolutePath = path.resolve(file.path);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        } catch (error) {
            console.error('Не удалось удалить файл после ошибки:', error.message);
        }
    }
}

module.exports = AdminQuestionController;
