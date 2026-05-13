const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = '/app/theme-images';

if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadRoot);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const fileName = `question-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
        return;
    }

    cb(new Error('Допустимы только изображения JPG, PNG, WEBP'));
};

const uploadQuestionImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = {
    uploadQuestionImage
};
