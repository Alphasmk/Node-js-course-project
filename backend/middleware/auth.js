const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Токен не предоставлен' });
        }

        const token = authHeader.substring(7); 
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Ошибка при проверке токена:', error.message);
        return res.status(401).json({ error: 'Невалидный или истёкший токен' });
    }
};

const requireRole = (roleNames) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const allowedRoles = Array.isArray(roleNames) ? roleNames : [roleNames];
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Требуется роль: ${allowedRoles.join(' или ')}. У вас роль: ${req.user.role}` 
            });
        }

        next();
    };
};

module.exports = { authMiddleware, requireRole };
