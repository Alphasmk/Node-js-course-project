const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: { 
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false
    }
}, { tableName: 'roles', timestamps: false });

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
}, { 
    tableName: 'users', 
    timestamps: true, 
    updatedAt: false,
    underscored: true 
});

const Section = sequelize.define('Section', {
    title: { type: DataTypes.STRING(255), unique: true, allowNull: false }
}, { tableName: 'sections', timestamps: false });

const Ticket = sequelize.define('Ticket', {
    title: { type: DataTypes.STRING(100), allowNull: true },
    section_id: { type: DataTypes.INTEGER, allowNull: true },
    max_mistakes_allowed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 }
}, { tableName: 'tickets', timestamps: false });

const Question = sequelize.define('Question', {
    url: { type: DataTypes.STRING(255) },
    text: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING(255) },
    rule_reference: { type: DataTypes.STRING(50) },
    explanation: { type: DataTypes.TEXT }
}, { tableName: 'questions', timestamps: false });

const Answer = sequelize.define('Answer', {
    text: { type: DataTypes.TEXT, allowNull: false },
    is_correct: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'answers', timestamps: false });

const TicketAttempt = sequelize.define('TicketAttempt', {
    score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_passed: { type: DataTypes.BOOLEAN },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    answers_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }
}, { 
    tableName: 'ticket_attempts', 
    timestamps: true, 
    createdAt: 'attempted_at',
    updatedAt: false,
    underscored: true 
});

const TicketMistake = sequelize.define('TicketMistake', {
    rule_reference: { type: DataTypes.STRING(50) }
}, { tableName: 'ticket_mistakes', timestamps: false, underscored: true });

const ExamConfig = sequelize.define('ExamConfig', {
    max_mistakes_allowed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    time_limit_seconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3600 },
    questions_per_variant: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 }
}, { tableName: 'exam_config', timestamps: false, underscored: true });

const ExamVariant = sequelize.define('ExamVariant', {
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'exam_variants', timestamps: false, underscored: true });

const ExamVariantQuestion = sequelize.define('ExamVariantQuestion', {
    position: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'exam_variant_questions',
    timestamps: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ['exam_variant_id', 'question_id'] },
        { unique: true, fields: ['exam_variant_id', 'position'] }
    ]
});

const ExamAttempt = sequelize.define('ExamAttempt', {
    max_mistakes_allowed: { type: DataTypes.INTEGER, allowNull: false },
    time_limit_seconds: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    mistakes_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_passed: { type: DataTypes.BOOLEAN, allowNull: true },
    timed_out: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    variant_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    answers_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }
}, {
    tableName: 'exam_attempts',
    timestamps: true,
    createdAt: 'started_at',
    updatedAt: false,
    underscored: true
});

const SectionProgress = sequelize.define('SectionProgress', {
}, { 
    tableName: 'section_progress', 
    timestamps: true, 
    createdAt: 'answered_at', 
    updatedAt: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_id', 'section_id', 'question_id'] }
    ]
});

Role.hasMany(User, { foreignKey: 'role_id', onDelete: 'RESTRICT' });
User.belongsTo(Role, { foreignKey: 'role_id' });

Question.hasMany(Answer, { foreignKey: 'question_id', onDelete: 'CASCADE' });
Answer.belongsTo(Question, { foreignKey: 'question_id' });

Question.belongsToMany(Section, { 
    through: 'question_sections', 
    foreignKey: 'question_id', 
    otherKey: 'section_id', 
    timestamps: false,
    onDelete: 'CASCADE'
});
Section.belongsToMany(Question, { 
    through: 'question_sections', 
    foreignKey: 'section_id', 
    otherKey: 'question_id', 
    timestamps: false,
    onDelete: 'CASCADE'
});

Section.hasMany(Ticket, { foreignKey: 'section_id', onDelete: 'SET NULL' });
Ticket.belongsTo(Section, { foreignKey: 'section_id' });

Question.belongsToMany(Ticket, { 
    through: 'question_tickets', 
    foreignKey: 'question_id', 
    otherKey: 'ticket_id', 
    timestamps: false,
    onDelete: 'CASCADE'
});
Ticket.belongsToMany(Question, { 
    through: 'question_tickets', 
    foreignKey: 'ticket_id', 
    otherKey: 'question_id', 
    timestamps: false,
    onDelete: 'CASCADE'
});

User.hasMany(TicketAttempt, { foreignKey: 'user_id', onDelete: 'CASCADE' });
TicketAttempt.belongsTo(User, { foreignKey: 'user_id' });

Ticket.hasMany(TicketAttempt, { foreignKey: 'ticket_id', onDelete: 'CASCADE' });
TicketAttempt.belongsTo(Ticket, { foreignKey: 'ticket_id' });

TicketAttempt.hasMany(TicketMistake, { foreignKey: 'attempt_id', onDelete: 'CASCADE' });
TicketMistake.belongsTo(TicketAttempt, { foreignKey: 'attempt_id' });

Question.hasMany(TicketMistake, { foreignKey: 'question_id', onDelete: 'CASCADE' });
TicketMistake.belongsTo(Question, { foreignKey: 'question_id' });

ExamVariant.belongsToMany(Question, {
    through: ExamVariantQuestion,
    foreignKey: 'exam_variant_id',
    otherKey: 'question_id',
    timestamps: false,
    onDelete: 'CASCADE'
});
Question.belongsToMany(ExamVariant, {
    through: ExamVariantQuestion,
    foreignKey: 'question_id',
    otherKey: 'exam_variant_id',
    timestamps: false,
    onDelete: 'CASCADE'
});

ExamVariant.hasMany(ExamVariantQuestion, { foreignKey: 'exam_variant_id', onDelete: 'CASCADE' });
ExamVariantQuestion.belongsTo(ExamVariant, { foreignKey: 'exam_variant_id' });

Question.hasMany(ExamVariantQuestion, { foreignKey: 'question_id', onDelete: 'CASCADE' });
ExamVariantQuestion.belongsTo(Question, { foreignKey: 'question_id' });

User.hasMany(ExamAttempt, { foreignKey: 'user_id', onDelete: 'CASCADE' });
ExamAttempt.belongsTo(User, { foreignKey: 'user_id' });

ExamVariant.hasMany(ExamAttempt, { foreignKey: 'exam_variant_id', onDelete: 'SET NULL' });
ExamAttempt.belongsTo(ExamVariant, { foreignKey: 'exam_variant_id' });

User.hasMany(SectionProgress, { foreignKey: 'user_id', onDelete: 'CASCADE' });
SectionProgress.belongsTo(User, { foreignKey: 'user_id' });

Section.hasMany(SectionProgress, { foreignKey: 'section_id', onDelete: 'CASCADE' });
SectionProgress.belongsTo(Section, { foreignKey: 'section_id' });

Question.hasMany(SectionProgress, { foreignKey: 'question_id', onDelete: 'CASCADE' });
SectionProgress.belongsTo(Question, { foreignKey: 'question_id' });

async function initializeDefaultRoles() {
    try {
        const bcrypt = require('bcrypt');
        
        const userRole = await Role.findOne({ where: { name: 'user' } });
        if (!userRole) {
            await Role.create({ name: 'user' });
            console.log('Роль "user" создана');
        }

        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        if (!adminRole) {
            await Role.create({ name: 'admin' });
            console.log('Роль "admin" создана');
        }

        const adminRoleRecord = await Role.findOne({ where: { name: 'admin' } });
        const adminCount = await User.count({ where: { role_id: adminRoleRecord.id } });

        if (adminCount === 0) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            
            await User.create({
                username: 'admin',
                email: 'admin@pdd.local',
                password_hash: passwordHash,
                role_id: adminRoleRecord.id
            });
            console.log('Администратор создан (username: admin, password: admin123)');
        }

        const examConfig = await ExamConfig.findOne();
        if (!examConfig) {
            await ExamConfig.create({
                max_mistakes_allowed: 10,
                time_limit_seconds: 3600,
                questions_per_variant: 30
            });
            console.log('Конфигурация экзамена создана');
        }
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
    }
}

module.exports = {
    Role,
    User,
    Section,
    Ticket,
    Question,
    Answer,
    TicketAttempt,
    TicketMistake,
    ExamConfig,
    ExamVariant,
    ExamVariantQuestion,
    ExamAttempt,
    SectionProgress,
    initializeDefaultRoles
};
