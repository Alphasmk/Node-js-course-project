const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('pdd_db', 'postgres', 'postgres123', {
    host: 'postgres',
    dialect: 'postgres',
    logging: false,
});

async function initDb() {
    try {
        await sequelize.authenticate();
        console.log('Соединение с БД успешно установлено.');
        
        const { initializeDefaultRoles } = require('../models');
        
        await sequelize.sync({ alter: true }); 
        console.log('Таблицы успешно синхронизированы.');
        
        await initializeDefaultRoles();
    } catch (error) {
        console.error('Ошибка подключения к БД:', error);
    }
}

module.exports = {
    sequelize,
    initDb
};