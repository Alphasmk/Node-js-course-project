import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import axios from '../api/axios';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UserList({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [alert, setAlert] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editValues, setEditValues] = useState({ username: '', email: '' });
  const currentRole = currentUser?.role || currentUser?.Role?.name;

  const fetchUsers = useCallback(async (page = 1) => {
    setAlert(null);

    try {
      const response = await axios.get(`/api/users?page=${page}&limit=${pageSize}`);
      setUsers(response.data.users);
      setCurrentPage(page);
      setTotal(response.data.total || 0);
      setAlert({ type: 'success', message: 'Пользователи загружены' });
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.error || 'Ошибка при загрузке пользователей' });
      console.error(error);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [fetchUsers, currentPage]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditModalVisible(true);
    setEditValues({ username: user.username, email: user.email });
  };

  const saveEdit = async () => {
    try {
      if (!editValues.username.trim() || !editValues.email.trim()) {
        setAlert({ type: 'error', message: 'Заполните имя и email' });
        return;
      }

      if (!EMAIL_PATTERN.test(editValues.email.trim())) {
        setAlert({ type: 'error', message: 'Введите корректный email' });
        return;
      }

      await axios.put(`/api/users/${editingUser.id}`, {
        username: editValues.username.trim(),
        email: editValues.email.trim()
      });

      setAlert({ type: 'success', message: 'Пользователь обновлен' });
      setEditModalVisible(false);
      setEditingUser(null);
      fetchUsers(currentPage);
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.error || 'Ошибка при обновлении' });
    }
  };

  const formatCreatedDate = (user) => {
    const rawValue = user?.created_at || user?.createdAt;
    if (!rawValue) {
      return '-';
    }

    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Список пользователей</Typography>

      {alert && (
        <Alert
          sx={{ my: 2 }}
          severity={alert.type === 'error' ? 'error' : 'success'}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const canModify = currentUser.id === user.id || currentRole === 'admin';
              return (
                <TableRow key={user.id} hover>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatCreatedDate(user)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end">
                      <Button variant="text" onClick={() => handleEdit(user)} disabled={!canModify}>
                        Изменить
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={Math.max(currentPage - 1, 0)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          onPageChange={(_, nextPage) => fetchUsers(nextPage + 1)}
        />
      </TableContainer>

      <Dialog open={editModalVisible} onClose={() => setEditModalVisible(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редактировать пользователя</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Имя пользователя"
            value={editValues.username}
            onChange={(event) => setEditValues((prev) => ({ ...prev, username: event.target.value }))}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={editValues.email}
            onChange={(event) => setEditValues((prev) => ({ ...prev, email: event.target.value }))}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditModalVisible(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveEdit}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserList;
