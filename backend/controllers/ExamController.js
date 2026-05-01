const { sequelize } = require('../config/db');
const {
    ExamConfig,
    ExamVariant,
    ExamAttempt,
    Question,
    Answer
} = require('../models');

const DEFAULT_QUESTIONS_PER_VARIANT = 30;

const addSeconds = (date, seconds) => new Date(new Date(date).getTime() + (seconds * 1000));

class ExamController {
    async getOrCreateConfig() {
        let config = await ExamConfig.findOne({ order: [['id', 'ASC']] });

        if (!config) {
            config = await ExamConfig.create({
                max_mistakes_allowed: 10,
                time_limit_seconds: 3600,
                questions_per_variant: DEFAULT_QUESTIONS_PER_VARIANT
            });
        }

        if (Number(config.questions_per_variant) !== DEFAULT_QUESTIONS_PER_VARIANT) {
            await config.update({ questions_per_variant: DEFAULT_QUESTIONS_PER_VARIANT });
        }

        return config;
    }

    async loadVariantForExam(variantId) {
        return ExamVariant.findByPk(variantId, {
            attributes: ['id', 'is_active'],
            include: [
                {
                    model: Question,
                    attributes: ['id', 'text', 'image_url', 'rule_reference', 'explanation'],
                    through: { attributes: ['position'] },
                    include: [
                        {
                            model: Answer,
                            attributes: ['id', 'text', 'is_correct']
                        }
                    ]
                }
            ]
        });
    }

    buildVariantSnapshot(variant) {
        const orderedQuestions = (Array.isArray(variant.Questions) ? [...variant.Questions] : [])
            .sort((a, b) => Number(a.ExamVariantQuestion?.position || 0) - Number(b.ExamVariantQuestion?.position || 0));

        const questions = orderedQuestions.map((question) => {
            const answers = (Array.isArray(question.Answers) ? [...question.Answers] : [])
                .sort((a, b) => Number(a.id) - Number(b.id));

            const correctAnswer = answers.find((answer) => Boolean(answer.is_correct));

            return {
                id: Number(question.id),
                position: Number(question.ExamVariantQuestion?.position || 0),
                text: question.text,
                image_url: question.image_url || null,
                rule_reference: question.rule_reference || null,
                explanation: question.explanation || null,
                answers: answers.map((answer) => ({
                    id: Number(answer.id),
                    text: answer.text,
                    is_correct: Boolean(answer.is_correct)
                })),
                correct_answer_id: correctAnswer ? Number(correctAnswer.id) : null
            };
        });

        return {
            id: Number(variant.id),
            questions
        };
    }

    serializeQuestionsForClient(variantSnapshot) {
        const questions = Array.isArray(variantSnapshot.questions)
            ? [...variantSnapshot.questions].sort((a, b) => Number(a.position) - Number(b.position))
            : [];

        return questions.map((question, index) => ({
            id: question.id,
            global_index: index + 1,
            text: question.text,
            image_url: question.image_url,
            rule_reference: question.rule_reference,
            explanation: question.explanation,
            answers: Array.isArray(question.answers)
                ? question.answers.map((answer) => ({
                    id: answer.id,
                    text: answer.text,
                    is_correct: Boolean(answer.is_correct)
                }))
                : []
        }));
    }

    async getInfo(req, res) {
        try {
            const config = await this.getOrCreateConfig();
            const variantsCount = await ExamVariant.count({ where: { is_active: true } });

            return res.status(200).json({
                exam: {
                    variants_count: Number(variantsCount),
                    max_mistakes_allowed: Number(config.max_mistakes_allowed),
                    time_limit_seconds: Number(config.time_limit_seconds),
                    time_limit_minutes: Math.ceil(Number(config.time_limit_seconds) / 60),
                    questions_per_variant: Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT)
                }
            });
        } catch (error) {
            console.error('Ошибка при получении информации об экзамене:', error);
            return res.status(500).json({ error: 'Ошибка при получении информации об экзамене' });
        }
    }

    async start(req, res) {
        try {
            const userId = req.user.id;
            const config = await this.getOrCreateConfig();
            const questionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);

            const variants = await ExamVariant.findAll({
                where: { is_active: true },
                attributes: ['id']
            });

            if (!Array.isArray(variants) || variants.length === 0) {
                return res.status(400).json({ error: 'Нет доступных вариантов экзамена' });
            }

            const randomVariant = variants[Math.floor(Math.random() * variants.length)];
            const variant = await this.loadVariantForExam(randomVariant.id);

            if (!variant) {
                return res.status(404).json({ error: 'Выбранный вариант экзамена не найден' });
            }

            const hasValidQuestions = Array.isArray(variant.Questions) && variant.Questions.length === questionsPerVariant;
            if (!hasValidQuestions) {
                return res.status(400).json({
                    error: `Вариант экзамена должен содержать ровно ${questionsPerVariant} вопросов`
                });
            }

            const invalidQuestion = variant.Questions.find((question) => {
                const answers = Array.isArray(question.Answers) ? question.Answers : [];
                const correctCount = answers.filter((answer) => Boolean(answer.is_correct)).length;
                return answers.length < 2 || correctCount !== 1;
            });

            if (invalidQuestion) {
                return res.status(400).json({
                    error: `Вопрос ${invalidQuestion.id} в варианте невалиден (нужно >=2 ответа и ровно 1 правильный)`
                });
            }

            const variantSnapshot = this.buildVariantSnapshot(variant);
            const questions = this.serializeQuestionsForClient(variantSnapshot);

            const attempt = await ExamAttempt.create({
                user_id: userId,
                exam_variant_id: Number(variant.id),
                max_mistakes_allowed: Number(config.max_mistakes_allowed),
                time_limit_seconds: Number(config.time_limit_seconds),
                score: 0,
                mistakes_count: 0,
                is_passed: null,
                timed_out: false,
                completed_at: null,
                variant_snapshot: variantSnapshot,
                answers_snapshot: []
            });

            const deadlineAt = addSeconds(attempt.started_at, Number(attempt.time_limit_seconds));

            return res.status(201).json({
                message: 'Экзамен начат',
                attempt: {
                    id: attempt.id,
                    started_at: attempt.started_at,
                    deadline_at: deadlineAt,
                    max_mistakes_allowed: Number(attempt.max_mistakes_allowed),
                    time_limit_seconds: Number(attempt.time_limit_seconds),
                    variant: {
                        id: Number(variant.id),
                        questions_count: variantSnapshot.questions.length
                    },
                    questions_total: questions.length,
                    questions
                }
            });
        } catch (error) {
            console.error('Ошибка при старте экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при старте экзамена' });
        }
    }

    async finish(req, res) {
        let transaction;

        try {
            const { attemptId } = req.params;
            const requesterId = req.user.id;
            const requesterRole = req.user.role;
            const incomingAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];

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

            if (attempt.completed_at) {
                return res.status(409).json({ error: 'Попытка экзамена уже завершена' });
            }

            const variantSnapshot = attempt.variant_snapshot && typeof attempt.variant_snapshot === 'object'
                ? attempt.variant_snapshot
                : null;

            if (!variantSnapshot || !Array.isArray(variantSnapshot.questions)) {
                return res.status(500).json({ error: 'Поврежден снимок варианта экзамена' });
            }

            const questions = [...variantSnapshot.questions];

            const selectedAnswerByQuestionId = new Map();
            incomingAnswers.forEach((item) => {
                const questionId = Number(item?.questionId);
                const answerId = Number(item?.answerId);

                if (!Number.isNaN(questionId) && questionId > 0 && !Number.isNaN(answerId) && answerId > 0) {
                    selectedAnswerByQuestionId.set(questionId, answerId);
                }
            });

            let score = 0;
            let mistakesCount = 0;

            const answersSnapshot = questions.map((question) => {
                const selectedAnswerId = selectedAnswerByQuestionId.get(Number(question.id)) || null;
                const selectedAnswer = Array.isArray(question.answers)
                    ? question.answers.find((answer) => Number(answer.id) === Number(selectedAnswerId))
                    : null;
                const correctAnswer = Array.isArray(question.answers)
                    ? question.answers.find((answer) => Boolean(answer.is_correct))
                    : null;

                const isCorrect = Boolean(selectedAnswerId)
                    && Number(selectedAnswerId) === Number(question.correct_answer_id);

                if (isCorrect) {
                    score += 1;
                } else if (selectedAnswerId) {
                    mistakesCount += 1;
                }

                return {
                    question_id: Number(question.id),
                    question_text: question.text,
                    image_url: question.image_url || null,
                    rule_reference: question.rule_reference || null,
                    selected_answer_id: selectedAnswer ? Number(selectedAnswer.id) : null,
                    selected_answer_text: selectedAnswer ? selectedAnswer.text : null,
                    correct_answer_id: correctAnswer ? Number(correctAnswer.id) : null,
                    correct_answer_text: correctAnswer ? correctAnswer.text : null,
                    is_correct: isCorrect
                };
            });

            const deadlineAt = addSeconds(attempt.started_at, Number(attempt.time_limit_seconds));
            const timedOut = new Date() > deadlineAt;
            const maxMistakesAllowed = Number(attempt.max_mistakes_allowed);
            const isPassed = !timedOut && (
                maxMistakesAllowed === 0
                    ? mistakesCount === 0
                    : mistakesCount < maxMistakesAllowed
            );

            transaction = await sequelize.transaction();

            await attempt.update({
                score,
                mistakes_count: mistakesCount,
                is_passed: isPassed,
                timed_out: timedOut,
                completed_at: new Date(),
                answers_snapshot: answersSnapshot
            }, { transaction });

            await transaction.commit();

            return res.status(200).json({
                message: timedOut ? 'Время экзамена истекло' : 'Экзамен завершен',
                result: {
                    attempt_id: Number(attempt.id),
                    exam_variant_id: Number(attempt.exam_variant_id),
                    score,
                    questions_total: questions.length,
                    mistakes_count: mistakesCount,
                    max_mistakes_allowed: Number(attempt.max_mistakes_allowed),
                    is_passed: isPassed,
                    timed_out: timedOut,
                    started_at: attempt.started_at,
                    completed_at: new Date(),
                    deadline_at: deadlineAt
                }
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при завершении экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при завершении экзамена' });
        }
    }

    async getAttemptDetails(req, res) {
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
}

module.exports = ExamController;
