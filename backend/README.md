# ПДД Backend API

Backend для системы тестирования на знание правил дорожного движения.

## Установка

```bash
npm install
```

## Запуск 

Локально:
```bash
npm start           # Запуск сервера
npm run dev         # Запуск с nodemon (автоперезагрузка)
```

С Docker:
```bash
docker-compose up --build
```

Сервер будет доступен на `http://localhost:3000`

## API Endpoints

### Пользователи

#### Регистрация
```
POST /api/users/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Авторизация
```
POST /api/users/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}
```

#### Получить профиль (авторизованный пользователь)
```
GET /api/users/profile
Authorization: Bearer <token>
```

#### Получить всех пользователей (с пагинацией)
```
GET /api/users?page=1&limit=20
```

#### Получить пользователя по ID
```
GET /api/users/:id
```

#### Обновить пользователя
```
PUT /api/users/:id
Content-Type: application/json

{
  "username": "new_username",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "roleId": 1
}
```

#### Получить попытки пользователя
```
GET /api/users/:id/attempts?page=1&limit=20&ticketId=5
```

#### Получить статистику пользователя
```
GET /api/users/:id/stats
```
Возвращает:
- total_attempts - всего попыток
- passed_attempts - пройденных попыток
- pass_rate - процент успешности
- average_score - средний балл
- max_score - максимальный балл

## Роли

В системе есть две роли:
- `user` (обычный пользователь) - по умолчанию
- `admin` (администратор)

## Структура проекта

```
backend/
├── config/
│   └── db.js              # Конфигурация БД
├── controllers/
│   └── UserController.js  # Логика API для пользователей
├── models/
│   └── index.js          # Определение моделей и связей
├── routes/
│   └── users.js          # Маршруты для пользователей
├── app.js                # Главное приложение
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Переменные окружения

- `PORT` - порт сервера (по умолчанию 3000)
- `NODE_ENV` - окружение (development/production)

## БД

PostgreSQL с автоматической синхронизацией схемы.

### Таблицы:
- `roles` - роли пользователей (user, admin)
- `users` - пользователи
- `sections` - темы тестов
- `tickets` - билеты (наборы вопросов)
- `questions` - вопросы
- `answers` - варианты ответов
- `ticket_attempts` - попытки прохождения билетов
- `ticket_mistakes` - ошибки в попытках
- `section_progress` - прогресс по темам
