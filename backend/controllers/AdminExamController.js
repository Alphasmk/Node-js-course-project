const { sequelize } = require('../config/db');
const {
    ExamConfig,
    ExamVariant,
    ExamVariantQuestion,
    Question,
    Section,
    Answer
} = require('../models');

const DEFAULT_QUESTIONS_PER_VARIANT = 30;

const normalizePercent = (value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        return null;
    }
    return Math.max(0, Math.min(100, parsed));
};

const convertPercentToMistakesAllowed = (percent, questionsPerVariant) => {
    const safeQuestionsCount = Math.max(1, Number(questionsPerVariant) || DEFAULT_QUESTIONS_PER_VARIANT);
    return Math.round((safeQuestionsCount * percent) / 100);
};

const convertMistakesAllowedToPercent = (mistakesAllowed, questionsPerVariant) => {
    const safeQuestionsCount = Math.max(1, Number(questionsPerVariant) || DEFAULT_QUESTIONS_PER_VARIANT);
    return Math.round((Number(mistakesAllowed || 0) / safeQuestionsCount) * 100);
};

const normalizeQuestionIds = (questionIds) => {
    if (!Array.isArray(questionIds)) {
        return [];
    }

    const parsed = questionIds
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value) && value > 0);

    return [...new Set(parsed)];
};

class AdminExamController {
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

    async getQuestionPool() {
        const questions = await Question.findAll({
            attributes: ['id', 'text'],
            include: [
                {
                    model: Answer,
                    attributes: ['id', 'is_correct']
                },
                {
                    model: Section,
                    attributes: ['id', 'title'],
                    through: { attributes: [] }
                }
            ],
            order: [['id', 'ASC']]
        });

        return questions
            .filter((question) => {
                const answers = Array.isArray(question.Answers) ? question.Answers : [];
                const correctAnswers = answers.filter((answer) => Boolean(answer.is_correct));
                return answers.length >= 2 && correctAnswers.length === 1;
            })
            .map((question) => ({
                id: Number(question.id),
                text: question.text,
                section_title: Array.isArray(question.Sections) && question.Sections[0]
                    ? question.Sections[0].title
                    : 'Без темы'
            }));
    }

    async validateVariantQuestions(questionIds, expectedCount) {
        if (!Array.isArray(questionIds) || questionIds.length !== expectedCount) {
            return {
                ok: false,
                error: `Вариант экзамена должен содержать ровно ${expectedCount} вопросов`
            };
        }

        const normalized = normalizeQuestionIds(questionIds);
        if (normalized.length !== expectedCount) {
            return {
                ok: false,
                error: 'В одном варианте экзамена вопросы не должны повторяться'
            };
        }

        const questions = await Question.findAll({
            where: { id: normalized },
            attributes: ['id'],
            include: [
                {
                    model: Answer,
                    attributes: ['id', 'is_correct']
                }
            ]
        });

        if (questions.length !== expectedCount) {
            return {
                ok: false,
                error: 'Часть вопросов не найдена'
            };
        }

        const invalidQuestions = questions
            .filter((question) => {
                const answers = Array.isArray(question.Answers) ? question.Answers : [];
                const correctAnswers = answers.filter((answer) => Boolean(answer.is_correct));
                return answers.length < 2 || correctAnswers.length !== 1;
            })
            .map((question) => question.id);

        if (invalidQuestions.length > 0) {
            return {
                ok: false,
                error: `Часть вопросов не подходит для экзамена (должно быть >=2 ответа и 1 правильный). ID: ${invalidQuestions.join(', ')}`
            };
        }

        return {
            ok: true,
            questionIds: normalized
        };
    }

    serializeVariant(variant, questionsPerVariant) {
        const questions = Array.isArray(variant.Questions) ? [...variant.Questions] : [];

        const mappedQuestions = questions
            .map((question) => ({
                id: question.id,
                text: question.text,
                section_title: Array.isArray(question.Sections) && question.Sections[0]
                    ? question.Sections[0].title
                    : 'Без темы',
                position: Number(question.ExamVariantQuestion?.position || 0)
            }))
            .sort((a, b) => a.position - b.position);

        return {
            id: variant.id,
            is_active: Boolean(variant.is_active),
            questions_required: questionsPerVariant,
            questions_count: mappedQuestions.length,
            questions: mappedQuestions,
            is_complete: mappedQuestions.length === questionsPerVariant
        };
    }

    async getQuestionPoolForAdmin(req, res) {
        try {
            const questionPool = await this.getQuestionPool();
            return res.status(200).json({ questions: questionPool });
        } catch (error) {
            console.error('Ошибка при получении пула вопросов для экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при получении списка вопросов' });
        }
    }

    async getConfig(req, res) {
        try {
            const config = await this.getOrCreateConfig();
            const questionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);
            const maxMistakesAllowed = Number(config.max_mistakes_allowed);
            const maxMistakesPercent = convertMistakesAllowedToPercent(maxMistakesAllowed, questionsPerVariant);

            return res.status(200).json({
                config: {
                    max_mistakes_allowed: maxMistakesAllowed,
                    max_mistakes_percent: maxMistakesPercent,
                    time_limit_seconds: Number(config.time_limit_seconds),
                    time_limit_minutes: Math.ceil(Number(config.time_limit_seconds) / 60),
                    questions_per_variant: questionsPerVariant
                }
            });
        } catch (error) {
            console.error('Ошибка при получении конфигурации экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при получении конфигурации экзамена' });
        }
    }

    async updateConfig(req, res) {
        try {
            const config = await this.getOrCreateConfig();
            const questionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);
            const incomingPercent = normalizePercent(req.body?.maxMistakesPercent);
            const timeLimitMinutes = Number(req.body?.timeLimitMinutes);

            if (incomingPercent === null) {
                return res.status(400).json({ error: 'Процент ошибок для экзамена должен быть числом от 0 до 100' });
            }

            if (Number.isNaN(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 300) {
                return res.status(400).json({ error: 'Время экзамена должно быть числом от 1 до 300 минут' });
            }

            const maxMistakesAllowed = convertPercentToMistakesAllowed(incomingPercent, questionsPerVariant);

            await config.update({
                max_mistakes_allowed: Math.floor(maxMistakesAllowed),
                time_limit_seconds: Math.floor(timeLimitMinutes) * 60,
                questions_per_variant: DEFAULT_QUESTIONS_PER_VARIANT
            });

            const updatedQuestionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);
            const updatedMaxMistakesAllowed = Number(config.max_mistakes_allowed);
            const updatedMaxMistakesPercent = convertMistakesAllowedToPercent(
                updatedMaxMistakesAllowed,
                updatedQuestionsPerVariant
            );

            return res.status(200).json({
                message: 'Настройки экзамена обновлены',
                config: {
                    max_mistakes_allowed: updatedMaxMistakesAllowed,
                    max_mistakes_percent: updatedMaxMistakesPercent,
                    time_limit_seconds: Number(config.time_limit_seconds),
                    time_limit_minutes: Math.ceil(Number(config.time_limit_seconds) / 60),
                    questions_per_variant: updatedQuestionsPerVariant
                }
            });
        } catch (error) {
            console.error('Ошибка при обновлении конфигурации экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при обновлении конфигурации экзамена' });
        }
    }

    async getVariants(req, res) {
        try {
            const config = await this.getOrCreateConfig();
            const questionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);

            const variants = await ExamVariant.findAll({
                attributes: ['id', 'is_active'],
                include: [
                    {
                        model: Question,
                        attributes: ['id', 'text'],
                        through: { attributes: ['position'] },
                        include: [
                            {
                                model: Section,
                                attributes: ['id', 'title']
                            }
                        ]
                    }
                ],
                order: [['id', 'ASC']]
            });

            return res.status(200).json({
                variants: variants.map((variant) => this.serializeVariant(variant, questionsPerVariant)),
                questions_per_variant: questionsPerVariant
            });
        } catch (error) {
            console.error('Ошибка при получении вариантов экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при получении вариантов экзамена' });
        }
    }

    async createVariant(req, res) {
        let transaction;

        try {
            const config = await this.getOrCreateConfig();
            const questionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);
            const questionIds = Array.isArray(req.body?.questionIds) ? req.body.questionIds : [];

            const validation = await this.validateVariantQuestions(questionIds, questionsPerVariant);
            if (!validation.ok) {
                return res.status(400).json({ error: validation.error });
            }

            transaction = await sequelize.transaction();

            const variant = await ExamVariant.create({ is_active: true }, { transaction });

            await ExamVariantQuestion.bulkCreate(
                validation.questionIds.map((questionId, index) => ({
                    exam_variant_id: variant.id,
                    question_id: questionId,
                    position: index + 1
                })),
                { transaction }
            );

            await transaction.commit();

            return res.status(201).json({
                message: 'Вариант экзамена создан',
                variant: {
                    id: variant.id,
                    is_active: variant.is_active
                }
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при создании варианта экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при создании варианта экзамена' });
        }
    }

    async updateVariant(req, res) {
        let transaction;

        try {
            const { variantId } = req.params;
            const variant = await ExamVariant.findByPk(variantId);

            if (!variant) {
                return res.status(404).json({ error: 'Вариант экзамена не найден' });
            }

            const config = await this.getOrCreateConfig();
            const questionsPerVariant = Number(config.questions_per_variant || DEFAULT_QUESTIONS_PER_VARIANT);

            const hasQuestionIds = Object.prototype.hasOwnProperty.call(req.body || {}, 'questionIds');
            const hasIsActive = Object.prototype.hasOwnProperty.call(req.body || {}, 'isActive');

            const updatedData = {};

            if (hasIsActive) {
                updatedData.is_active = Boolean(req.body.isActive);
            }

            let validatedQuestionIds = null;
            if (hasQuestionIds) {
                const validation = await this.validateVariantQuestions(req.body.questionIds, questionsPerVariant);
                if (!validation.ok) {
                    return res.status(400).json({ error: validation.error });
                }
                validatedQuestionIds = validation.questionIds;
            }

            transaction = await sequelize.transaction();

            if (Object.keys(updatedData).length > 0) {
                await variant.update(updatedData, { transaction });
            }

            if (validatedQuestionIds) {
                await ExamVariantQuestion.destroy({
                    where: { exam_variant_id: variant.id },
                    transaction
                });

                await ExamVariantQuestion.bulkCreate(
                    validatedQuestionIds.map((questionId, index) => ({
                        exam_variant_id: variant.id,
                        question_id: questionId,
                        position: index + 1
                    })),
                    { transaction }
                );
            }

            await transaction.commit();

            return res.status(200).json({
                message: 'Вариант экзамена обновлен'
            });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Ошибка при обновлении варианта экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при обновлении варианта экзамена' });
        }
    }

    async deleteVariant(req, res) {
        try {
            const { variantId } = req.params;

            const variant = await ExamVariant.findByPk(variantId);
            if (!variant) {
                return res.status(404).json({ error: 'Вариант экзамена не найден' });
            }

            await ExamVariantQuestion.destroy({ where: { exam_variant_id: variant.id } });
            await variant.destroy();

            return res.status(200).json({ message: 'Вариант экзамена удален' });
        } catch (error) {
            console.error('Ошибка при удалении варианта экзамена:', error);
            return res.status(500).json({ error: 'Ошибка при удалении варианта экзамена' });
        }
    }
}

module.exports = AdminExamController;
