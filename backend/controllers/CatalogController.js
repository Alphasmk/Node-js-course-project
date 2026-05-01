const { Section, Question, Ticket, Answer } = require('../models');

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

class CatalogController {
    async getSections(req, res) {
        try {
            const sections = await Section.findAll({
                attributes: ['id', 'title'],
                include: [
                    {
                        model: Question,
                        attributes: ['id'],
                        through: { attributes: [] }
                    },
                    {
                        model: Ticket,
                        attributes: ['id'],
                        include: [
                            {
                                model: Question,
                                attributes: ['id'],
                                through: { attributes: [] }
                            }
                        ]
                    }
                ],
                order: [['title', 'ASC']]
            });

            const payload = sections.map((section) => {
                const completeTicketsCount = Array.isArray(section.Tickets)
                    ? section.Tickets.filter((ticket) => Array.isArray(ticket.Questions) && ticket.Questions.length === QUESTIONS_PER_TICKET).length
                    : 0;

                return {
                    id: section.id,
                    title: section.title,
                    questions_count: Array.isArray(section.Questions) ? section.Questions.length : 0,
                    tickets_count: completeTicketsCount
                };
            }).sort(compareSectionTitles);

            return res.status(200).json({ sections: payload });
        } catch (error) {
            console.error('Ошибка при получении списка тем:', error);
            return res.status(500).json({ error: 'Ошибка при получении списка тем' });
        }
    }

    async getSectionQuestions(req, res) {
        try {
            const { sectionId } = req.params;

            const section = await Section.findByPk(sectionId, {
                attributes: ['id', 'title'],
                include: [
                    {
                        model: Question,
                        attributes: ['id', 'text', 'image_url', 'rule_reference', 'explanation'],
                        through: { attributes: [] },
                        include: [
                            {
                                model: Answer,
                                attributes: ['id', 'text', 'is_correct']
                            }
                        ]
                    }
                ]
            });

            if (!section) {
                return res.status(404).json({ error: 'Тема не найдена' });
            }

            const payloadQuestions = Array.isArray(section.Questions)
                ? section.Questions
                    .sort((a, b) => a.id - b.id)
                    .map((question) => ({
                        id: question.id,
                        text: question.text,
                        image_url: question.image_url,
                        rule_reference: question.rule_reference,
                        explanation: question.explanation,
                        answers: Array.isArray(question.Answers)
                            ? question.Answers
                                .sort((a, b) => a.id - b.id)
                                .map((answer) => ({
                                    id: answer.id,
                                    text: answer.text,
                                    is_correct: answer.is_correct
                                }))
                            : []
                    }))
                : [];

            return res.status(200).json({
                section: {
                    id: section.id,
                    title: section.title
                },
                questions: payloadQuestions
            });
        } catch (error) {
            console.error('Ошибка при получении вопросов темы:', error);
            return res.status(500).json({ error: 'Ошибка при получении вопросов темы' });
        }
    }

    async getSectionTickets(req, res) {
        try {
            const { sectionId } = req.params;

            const section = await Section.findByPk(sectionId, {
                attributes: ['id', 'title']
            });

            if (!section) {
                return res.status(404).json({ error: 'Тема не найдена' });
            }

            const tickets = await Ticket.findAll({
                where: { section_id: sectionId },
                attributes: ['id', 'title', 'max_mistakes_allowed'],
                include: [
                    {
                        model: Question,
                        attributes: ['id'],
                        through: { attributes: [] }
                    }
                ],
                order: [['id', 'ASC']]
            });

            const payload = tickets
                .map((ticket) => ({
                    id: ticket.id,
                    title: ticket.title,
                    max_mistakes_allowed: Number(ticket.max_mistakes_allowed ?? 2),
                    questions_count: Array.isArray(ticket.Questions) ? ticket.Questions.length : 0,
                    questions_required: QUESTIONS_PER_TICKET,
                    is_complete: Array.isArray(ticket.Questions) && ticket.Questions.length === QUESTIONS_PER_TICKET
                }))
                .filter((ticket) => ticket.is_complete);

            return res.status(200).json({
                section: {
                    id: section.id,
                    title: section.title
                },
                tickets: payload
            });
        } catch (error) {
            console.error('Ошибка при получении билетов темы:', error);
            return res.status(500).json({ error: 'Ошибка при получении билетов темы' });
        }
    }

    async getAllTickets(req, res) {
        try {
            const tickets = await Ticket.findAll({
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
            });

            const payload = tickets
                .map((ticket) => ({
                    id: ticket.id,
                    title: ticket.title,
                    section_id: ticket.Section ? ticket.Section.id : null,
                    section_title: ticket.Section ? ticket.Section.title : 'Без темы',
                    max_mistakes_allowed: Number(ticket.max_mistakes_allowed ?? 2),
                    questions_count: Array.isArray(ticket.Questions) ? ticket.Questions.length : 0,
                    questions_required: QUESTIONS_PER_TICKET,
                    is_complete: Array.isArray(ticket.Questions) && ticket.Questions.length === QUESTIONS_PER_TICKET
                }))
                .filter((ticket) => ticket.is_complete);

            return res.status(200).json({ tickets: payload });
        } catch (error) {
            console.error('Ошибка при получении общего списка билетов:', error);
            return res.status(500).json({ error: 'Ошибка при получении списка билетов' });
        }
    }

    async getTicketQuestionsForPassing(req, res) {
        try {
            const { ticketId } = req.params;

            const ticket = await Ticket.findByPk(ticketId, {
                attributes: ['id', 'title', 'max_mistakes_allowed'],
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
                            }
                        ]
                    }
                ]
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const questions = Array.isArray(ticket.Questions) ? ticket.Questions : [];
            if (questions.length !== QUESTIONS_PER_TICKET) {
                return res.status(400).json({
                    error: `Билет должен содержать ровно ${QUESTIONS_PER_TICKET} вопросов`
                });
            }

            const payloadQuestions = questions
                .sort((a, b) => a.id - b.id)
                .map((question) => ({
                    id: question.id,
                    text: question.text,
                    image_url: question.image_url,
                    rule_reference: question.rule_reference,
                    explanation: question.explanation,
                    answers: Array.isArray(question.Answers)
                        ? question.Answers
                            .sort((a, b) => a.id - b.id)
                            .map((answer) => ({
                                id: answer.id,
                                text: answer.text,
                                is_correct: Boolean(answer.is_correct)
                            }))
                        : []
                }));

            return res.status(200).json({
                ticket: {
                    id: ticket.id,
                    title: ticket.title,
                    section_id: ticket.Section ? ticket.Section.id : null,
                    section_title: ticket.Section ? ticket.Section.title : null,
                    max_mistakes_allowed: Number(ticket.max_mistakes_allowed ?? 2),
                    questions_count: payloadQuestions.length,
                    questions_required: QUESTIONS_PER_TICKET
                },
                questions: payloadQuestions
            });
        } catch (error) {
            console.error('Ошибка при получении билета для прохождения:', error);
            return res.status(500).json({ error: 'Ошибка при получении билета' });
        }
    }
}

module.exports = CatalogController;
