import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import axios from '../api/axios';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!formData.username.trim() || !formData.password) {
      setMessageType('error');
      setMessage('Заполните имя пользователя и пароль');
      return;
    }

    if (!isLogin) {
      if (!formData.email.trim()) {
        setMessageType('error');
        setMessage('Введите email');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setMessageType('error');
        setMessage('Пароли не совпадают');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post('/api/users/login', {
          username: formData.username.trim(),
          password: formData.password
        });

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        setMessageType('success');
        setMessage('Успешно вошли в систему!');
        setTimeout(() => {
          onLogin(response.data.user);
        }, 500);
      } else {
        await axios.post('/api/users/register', {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password
        });

        setMessageType('success');
        setMessage('Успешно зарегистрировались! Пожалуйста, войдите.');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        setIsLogin(true);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.error || error.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="auth-card" elevation={3}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1">
              {isLogin ? 'Вход' : 'Регистрация'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
            {isLogin ? 'Введите свои данные для входа' : 'Заполните форму для регистрации'}
            </Typography>
          </Box>

        {message && (
          <Alert severity={messageType === 'error' ? 'error' : 'success'} onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}

          <Box component="form" onSubmit={handleSubmit}>
          {!isLogin && (
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              type="email"
              required
            />
          )}

            <TextField
              fullWidth
              margin="normal"
              label="Имя пользователя"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              required
            />

            <TextField
              fullWidth
              margin="normal"
              label="Пароль"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />

          {!isLogin && (
            <TextField
              fullWidth
              margin="normal"
              label="Подтвердите пароль"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              required
            />
          )}

            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </Box>

        <div className="form-switch">
          <Typography variant="body2">
            {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          </Typography>
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </Link>
        </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default Auth;
