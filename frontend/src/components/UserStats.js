import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from '../api/axios';

function UserStats({ currentUser, onRetakeTicket }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [users, setUsers] = useState([]);
  const [alert, setAlert] = useState(null);
  const [statsSection, setStatsSection] = useState('attempts');

  const [attempts, setAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsPage, setAttemptsPage] = useState(0);
  const [attemptsRowsPerPage, setAttemptsRowsPerPage] = useState(10);
  const [attemptsTotal, setAttemptsTotal] = useState(0);

  const [attemptDetailsLoading, setAttemptDetailsLoading] = useState(false);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [attemptDialogOpen, setAttemptDialogOpen] = useState(false);
  const [attemptDetailsPage, setAttemptDetailsPage] = useState(0);
  const [attemptDetailsRowsPerPage, setAttemptDetailsRowsPerPage] = useState(10);

  const [examAttempts, setExamAttempts] = useState([]);
  const [examAttemptsLoading, setExamAttemptsLoading] = useState(false);
  const [examAttemptsPage, setExamAttemptsPage] = useState(0);
  const [examAttemptsRowsPerPage, setExamAttemptsRowsPerPage] = useState(10);
  const [examAttemptsTotal, setExamAttemptsTotal] = useState(0);
  const [examAttemptDetailsLoading, setExamAttemptDetailsLoading] = useState(false);
  const [examAttemptDetails, setExamAttemptDetails] = useState(null);
  const [examAttemptDialogOpen, setExamAttemptDialogOpen] = useState(false);
  const [examAttemptDetailsPage, setExamAttemptDetailsPage] = useState(0);
  const [examAttemptDetailsRowsPerPage, setExamAttemptDetailsRowsPerPage] = useState(10);

  const [tickets, setTickets] = useState([]);
  const [selectedTicketStatsId, setSelectedTicketStatsId] = useState('');
  const [ticketStatsLoading, setTicketStatsLoading] = useState(false);
  const [ticketStats, setTicketStats] = useState(null);
  const [ticketStatsUsers, setTicketStatsUsers] = useState([]);
  const [ticketStatsTotalUsers, setTicketStatsTotalUsers] = useState(0);
  const [ticketStatsPage, setTicketStatsPage] = useState(0);
  const [ticketStatsRowsPerPage, setTicketStatsRowsPerPage] = useState(10);

  const isAdmin = (currentUser?.role || currentUser?.Role?.name) === 'admin';

  const formatDateTime = (value) => {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString();
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/users?limit=100');
      setUsers(response.data.users || []);
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке списка пользователей' });
      console.error(error);
    }
  }, []);

  const fetchTicketsForAdminStats = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    try {
      const response = await axios.get('/api/admin/questions/meta');
      const loadedTickets = response.data.tickets || [];
      setTickets(loadedTickets);

      if (!selectedTicketStatsId && loadedTickets.length > 0) {
        setSelectedTicketStatsId(loadedTickets[0].id);
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке билетов для статистики' });
      console.error(error);
    }
  }, [isAdmin, selectedTicketStatsId]);

  const fetchStats = useCallback(async () => {
    if (!selectedUserId) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get(`/api/users/${selectedUserId}/stats`);
      setStats(response.data);
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке статистики' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  const fetchAttempts = useCallback(async () => {
    if (!selectedUserId) {
      return;
    }

    setAttemptsLoading(true);

    try {
      const response = await axios.get(
        `/api/users/${selectedUserId}/attempts?limit=${attemptsRowsPerPage}&page=${attemptsPage + 1}`
      );
      setAttempts(response.data.attempts || []);
      setAttemptsTotal(Number(response.data.total || 0));
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке попыток пользователя' });
      console.error(error);
    } finally {
      setAttemptsLoading(false);
    }
  }, [selectedUserId, attemptsPage, attemptsRowsPerPage]);

  const fetchExamAttempts = useCallback(async () => {
    if (!selectedUserId) {
      return;
    }

    setExamAttemptsLoading(true);

    try {
      const response = await axios.get(
        `/api/users/${selectedUserId}/exam-attempts?limit=${examAttemptsRowsPerPage}&page=${examAttemptsPage + 1}`
      );
      setExamAttempts(response.data.attempts || []);
      setExamAttemptsTotal(Number(response.data.total || 0));
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке попыток экзамена' });
      console.error(error);
    } finally {
      setExamAttemptsLoading(false);
    }
  }, [selectedUserId, examAttemptsPage, examAttemptsRowsPerPage]);

  const fetchTicketStatsByUsers = useCallback(async () => {
    if (!isAdmin || !selectedTicketStatsId) {
      setTicketStats(null);
      setTicketStatsUsers([]);
      setTicketStatsTotalUsers(0);
      return;
    }

    setTicketStatsLoading(true);

    try {
      const response = await axios.get(
        `/api/users/admin/tickets/${selectedTicketStatsId}/stats?limit=${ticketStatsRowsPerPage}&page=${ticketStatsPage + 1}`
      );

      setTicketStats(response.data || null);
      setTicketStatsUsers(response.data.users || []);
      setTicketStatsTotalUsers(Number(response.data.total_users || 0));
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке статистики по билету' });
      console.error(error);
      setTicketStats(null);
      setTicketStatsUsers([]);
      setTicketStatsTotalUsers(0);
    } finally {
      setTicketStatsLoading(false);
    }
  }, [isAdmin, selectedTicketStatsId, ticketStatsRowsPerPage, ticketStatsPage]);

  const fetchAttemptDetails = async (attemptId) => {
    if (!attemptId) {
      return;
    }

    setAttemptDetailsLoading(true);

    try {
      const response = await axios.get(`/api/users/attempts/${attemptId}`);
      setAttemptDetails(response.data.attempt || null);
      setAttemptDetailsPage(0);
      setAttemptDialogOpen(true);
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке деталей попытки' });
      console.error(error);
    } finally {
      setAttemptDetailsLoading(false);
    }
  };

  const fetchExamAttemptDetails = async (attemptId) => {
    if (!attemptId) {
      return;
    }

    setExamAttemptDetailsLoading(true);

    try {
      const response = await axios.get(`/api/users/exam-attempts/${attemptId}`);
      setExamAttemptDetails(response.data.attempt || null);
      setExamAttemptDetailsPage(0);
      setExamAttemptDialogOpen(true);
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка при загрузке деталей экзамена' });
      console.error(error);
    } finally {
      setExamAttemptDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchTicketsForAdminStats();
    } else {
      setUsers([currentUser]);
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser, fetchUsers, fetchTicketsForAdminStats, isAdmin]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    setAlert(null);
    fetchStats();
    fetchAttempts();
  }, [selectedUserId, fetchStats, fetchAttempts]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    fetchExamAttempts();
  }, [selectedUserId, fetchExamAttempts]);

  useEffect(() => {
    setAttemptsPage(0);
  }, [selectedUserId]);

  useEffect(() => {
    setExamAttemptsPage(0);
  }, [selectedUserId]);

  useEffect(() => {
    setTicketStatsPage(0);
  }, [selectedTicketStatsId]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    fetchTicketStatsByUsers();
  }, [isAdmin, fetchTicketStatsByUsers]);

  useEffect(() => {
    if (!isAdmin && statsSection === 'ticket-stats') {
      setStatsSection('attempts');
    }
  }, [isAdmin, statsSection]);

  const canRetakeAttempt = Boolean(
    attemptDetails?.ticket_id
    && typeof onRetakeTicket === 'function'
    && Number(attemptDetails?.user_id) === Number(currentUser?.id)
  );

  const handleRetakeFromAttempt = () => {
    if (!canRetakeAttempt) {
      return;
    }

    onRetakeTicket(attemptDetails.ticket_id);
    setAttemptDialogOpen(false);
  };

  const paginatedAttemptDetailsAnswers = (attemptDetails?.answers || []).slice(
    attemptDetailsPage * attemptDetailsRowsPerPage,
    attemptDetailsPage * attemptDetailsRowsPerPage + attemptDetailsRowsPerPage
  );

  const paginatedExamAttemptDetailsAnswers = (examAttemptDetails?.answers || []).slice(
    examAttemptDetailsPage * examAttemptDetailsRowsPerPage,
    examAttemptDetailsPage * examAttemptDetailsRowsPerPage + examAttemptDetailsRowsPerPage
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Статистика и попытки</Typography>

      {alert && (
        <Alert
          severity={alert.type === 'error' ? 'error' : 'success'}
          onClose={() => setAlert(null)}
          sx={{ mt: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      <Card sx={{ mt: 2, mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Typography sx={{ minWidth: 140 }} fontWeight={600}>Пользователь</Typography>
            {isAdmin ? (
              <FormControl fullWidth>
                <InputLabel id="user-select-label">Пользователь</InputLabel>
                <Select
                  labelId="user-select-label"
                  value={selectedUserId}
                  label="Пользователь"
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography>{currentUser.username} ({currentUser.email})</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress size={48} />
        </Box>
      ) : stats ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))'
              },
              gap: 2
            }}
          >
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Всего попыток</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.total_attempts || 0}</Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Завершенных</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.completed_attempts || 0}</Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Не завершен</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.in_progress_attempts || 0}</Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Успешных</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.passed_attempts || 0}</Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Процент успеха</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.pass_rate || '0%'}</Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Средний / Макс балл</Typography>
                <Typography variant="h4" fontWeight={700}>
                  {stats.average_score || 0} / {stats.max_score || 0}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Экзаменов / Сдано</Typography>
                <Typography variant="h4" fontWeight={700}>
                  {stats.exam_total_attempts || 0} / {stats.exam_passed_attempts || 0}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Процент экзаменов</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.exam_pass_rate || '0%'}</Typography>
              </CardContent>
            </Card>
          </Box>

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ pb: 0 }}>
              <Tabs
                value={statsSection}
                onChange={(_, value) => setStatsSection(value)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab value="attempts" label="История попыток" />
                <Tab value="exams" label="История экзаменов" />
                {isAdmin && <Tab value="ticket-stats" label="Статистика пользователей по билетам" />}
              </Tabs>
            </CardContent>
          </Card>

          {statsSection === 'attempts' && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>История попыток</Typography>

              {attemptsLoading ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={80}>ID</TableCell>
                          <TableCell>Билет</TableCell>
                          <TableCell width={130}>Балл</TableCell>
                          <TableCell width={130}>Статус</TableCell>
                          <TableCell width={180}>Начато</TableCell>
                          <TableCell width={180}>Завершено</TableCell>
                          <TableCell align="right" width={160}>Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attempts.map((attempt) => (
                          <TableRow key={attempt.id} hover>
                            <TableCell>{attempt.id}</TableCell>
                            <TableCell>{attempt.Ticket?.title || `Билет #${attempt.ticket_id}`}</TableCell>
                            <TableCell>{attempt.score}</TableCell>
                            <TableCell>
                              {attempt.completed_at
                                ? (attempt.is_passed ? 'Сдан' : 'Не сдан')
                                : 'Не завершен'}
                            </TableCell>
                            <TableCell>{formatDateTime(attempt.attempted_at)}</TableCell>
                            <TableCell>{formatDateTime(attempt.completed_at)}</TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                startIcon={<VisibilityIcon />}
                                disabled={attemptDetailsLoading}
                                onClick={() => fetchAttemptDetails(attempt.id)}
                              >
                                Просмотр
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!attemptsLoading && attempts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <Typography variant="body2" color="text.secondary">
                                У выбранного пользователя пока нет попыток.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={attemptsTotal}
                    page={attemptsPage}
                    onPageChange={(_, nextPage) => setAttemptsPage(nextPage)}
                    rowsPerPage={attemptsRowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setAttemptsRowsPerPage(Number(event.target.value));
                      setAttemptsPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 20, 50]}
                    labelRowsPerPage="На странице"
                  />
                </>
              )}
            </CardContent>
          </Card>
          )}

          {statsSection === 'exams' && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>История экзаменов</Typography>

              {examAttemptsLoading ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={80}>ID</TableCell>
                          <TableCell>Экзамен</TableCell>
                          <TableCell width={130}>Балл</TableCell>
                          <TableCell width={130}>Ошибок</TableCell>
                          <TableCell width={130}>Статус</TableCell>
                          <TableCell width={180}>Начато</TableCell>
                          <TableCell width={180}>Завершено</TableCell>
                          <TableCell align="right" width={160}>Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {examAttempts.map((attempt) => (
                          <TableRow key={attempt.id} hover>
                            <TableCell>{attempt.id}</TableCell>
                            <TableCell>Экзамен #{attempt.exam_variant_id}</TableCell>
                            <TableCell>{attempt.score}</TableCell>
                            <TableCell>{attempt.mistakes_count}</TableCell>
                            <TableCell>
                              {attempt.completed_at
                                ? (attempt.is_passed ? 'Сдан' : (attempt.timed_out ? 'Время вышло' : 'Не сдан'))
                                : 'Не завершен'}
                            </TableCell>
                            <TableCell>{formatDateTime(attempt.started_at)}</TableCell>
                            <TableCell>{formatDateTime(attempt.completed_at)}</TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                startIcon={<VisibilityIcon />}
                                disabled={examAttemptDetailsLoading}
                                onClick={() => fetchExamAttemptDetails(attempt.id)}
                              >
                                Просмотр
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!examAttemptsLoading && examAttempts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <Typography variant="body2" color="text.secondary">
                                У выбранного пользователя пока нет попыток экзамена.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={examAttemptsTotal}
                    page={examAttemptsPage}
                    onPageChange={(_, nextPage) => setExamAttemptsPage(nextPage)}
                    rowsPerPage={examAttemptsRowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setExamAttemptsRowsPerPage(Number(event.target.value));
                      setExamAttemptsPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 20, 50]}
                    labelRowsPerPage="На странице"
                  />
                </>
              )}
            </CardContent>
          </Card>
          )}

          {isAdmin && statsSection === 'ticket-stats' && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Статистика пользователей по билету</Typography>

                  <FormControl fullWidth>
                    <InputLabel id="ticket-stats-select-label">Билет</InputLabel>
                    <Select
                      labelId="ticket-stats-select-label"
                      label="Билет"
                      value={selectedTicketStatsId}
                      onChange={(event) => setSelectedTicketStatsId(event.target.value)}
                    >
                      {tickets.map((ticket) => (
                        <MenuItem key={ticket.id} value={ticket.id}>
                          {(ticket.title || `Билет ${ticket.id}`)
                            + ` (${ticket.questions_count}/${ticket.questions_required})`
                            + ` - ${ticket.section_title || 'Без темы'}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {ticketStatsLoading ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : !selectedTicketStatsId ? (
                    <Typography variant="body2" color="text.secondary">
                      Выберите билет для просмотра статистики.
                    </Typography>
                  ) : (
                    <>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                          gap: 1.5
                        }}
                      >
                        <Card variant="outlined">
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">Попыток</Typography>
                            <Typography variant="h5" fontWeight={700}>{ticketStats?.overall?.total_attempts || 0}</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">Завершено</Typography>
                            <Typography variant="h5" fontWeight={700}>{ticketStats?.overall?.completed_attempts || 0}</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">Сдано</Typography>
                            <Typography variant="h5" fontWeight={700}>{ticketStats?.overall?.passed_attempts || 0}</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">Процент сдачи</Typography>
                            <Typography variant="h5" fontWeight={700}>{ticketStats?.overall?.pass_rate || '0%'}</Typography>
                          </CardContent>
                        </Card>
                      </Box>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Пользователь</TableCell>
                              <TableCell>Email</TableCell>
                              <TableCell width={110}>Попыток</TableCell>
                              <TableCell width={110}>Завершено</TableCell>
                              <TableCell width={110}>Сдано</TableCell>
                              <TableCell width={130}>Процент</TableCell>
                              <TableCell width={120}>Лучший балл</TableCell>
                              <TableCell width={180}>Последняя попытка</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {ticketStatsUsers.map((item) => (
                              <TableRow key={`ticket-user-${item.user_id}`} hover>
                                <TableCell>{item.username || `ID ${item.user_id}`}</TableCell>
                                <TableCell>{item.email || '-'}</TableCell>
                                <TableCell>{item.total_attempts}</TableCell>
                                <TableCell>{item.completed_attempts}</TableCell>
                                <TableCell>{item.passed_attempts}</TableCell>
                                <TableCell>{item.pass_rate}</TableCell>
                                <TableCell>{item.best_score ?? 0}</TableCell>
                                <TableCell>{formatDateTime(item.last_attempt_at)}</TableCell>
                              </TableRow>
                            ))}

                            {!ticketStatsLoading && ticketStatsUsers.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8}>
                                  <Typography variant="body2" color="text.secondary">
                                    По выбранному билету пока нет попыток.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <TablePagination
                        component="div"
                        count={ticketStatsTotalUsers}
                        page={ticketStatsPage}
                        onPageChange={(_, nextPage) => setTicketStatsPage(nextPage)}
                        rowsPerPage={ticketStatsRowsPerPage}
                        onRowsPerPageChange={(event) => {
                          setTicketStatsRowsPerPage(Number(event.target.value));
                          setTicketStatsPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        labelRowsPerPage="На странице"
                      />
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent>
            <Typography>Статистика не найдена</Typography>
          </CardContent>
        </Card>
      )}

      <Dialog open={attemptDialogOpen} onClose={() => setAttemptDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Детали попытки</DialogTitle>
        <DialogContent>
          {!attemptDetails ? (
            <Typography color="text.secondary">Нет данных попытки.</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography>Билет: <strong>{attemptDetails.ticket_title || `#${attemptDetails.ticket_id}`}</strong></Typography>
              <Typography>Балл: <strong>{attemptDetails.score}</strong> / <strong>{attemptDetails.questions_total}</strong></Typography>
              <Typography>
                Статус: <strong>{attemptDetails.completed_at
                  ? (attemptDetails.is_passed ? 'Сдан' : 'Не сдан')
                  : 'Не завершен'}</strong>
              </Typography>
              <Typography>Начато: <strong>{formatDateTime(attemptDetails.attempted_at)}</strong></Typography>
              <Typography>Завершено: <strong>{formatDateTime(attemptDetails.completed_at)}</strong></Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={70}>#</TableCell>
                      <TableCell>Вопрос</TableCell>
                      <TableCell width={120}>Результат</TableCell>
                      <TableCell width={160}>Пункт ПДД</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAttemptDetailsAnswers.map((item, index) => (
                      <TableRow key={`${attemptDetails.id}-${item.question_id}`} hover>
                        <TableCell>{attemptDetailsPage * attemptDetailsRowsPerPage + index + 1}</TableCell>
                        <TableCell>{item.question_text}</TableCell>
                        <TableCell>{item.is_correct ? 'Верно' : 'Ошибка'}</TableCell>
                        <TableCell>{item.rule_reference || '-'}</TableCell>
                      </TableRow>
                    ))}

                    {(!attemptDetails.answers || attemptDetails.answers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary">
                            По этой попытке нет сохраненного снимка ответов.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={(attemptDetails.answers || []).length}
                page={attemptDetailsPage}
                onPageChange={(_, nextPage) => setAttemptDetailsPage(nextPage)}
                rowsPerPage={attemptDetailsRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setAttemptDetailsRowsPerPage(Number(event.target.value));
                  setAttemptDetailsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                labelRowsPerPage="На странице"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttemptDialogOpen(false)}>Закрыть</Button>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={handleRetakeFromAttempt}
            disabled={!canRetakeAttempt}
          >
            Пройти еще раз
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={examAttemptDialogOpen} onClose={() => setExamAttemptDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Детали экзамена</DialogTitle>
        <DialogContent>
          {!examAttemptDetails ? (
            <Typography color="text.secondary">Нет данных попытки экзамена.</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography>Экзамен: <strong>#{examAttemptDetails.exam_variant_id}</strong></Typography>
              <Typography>Балл: <strong>{examAttemptDetails.score}</strong> / <strong>{examAttemptDetails.questions_total}</strong></Typography>
              <Typography>
                Ошибок: <strong>{examAttemptDetails.mistakes_count}</strong> (допустимо {examAttemptDetails.max_mistakes_allowed})
              </Typography>
              <Typography>
                Статус: <strong>{examAttemptDetails.timed_out ? 'Время вышло' : (examAttemptDetails.is_passed ? 'Сдан' : 'Не сдан')}</strong>
              </Typography>
              <Typography>Начато: <strong>{formatDateTime(examAttemptDetails.started_at)}</strong></Typography>
              <Typography>Завершено: <strong>{formatDateTime(examAttemptDetails.completed_at)}</strong></Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={70}>#</TableCell>
                      <TableCell>Вопрос</TableCell>
                      <TableCell width={120}>Ответ</TableCell>
                      <TableCell width={120}>Результат</TableCell>
                      <TableCell width={160}>Пункт ПДД</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedExamAttemptDetailsAnswers.map((item, index) => (
                      <TableRow key={`${examAttemptDetails.id}-${item.question_id}`} hover>
                        <TableCell>{examAttemptDetailsPage * examAttemptDetailsRowsPerPage + index + 1}</TableCell>
                        <TableCell>{item.question_text}</TableCell>
                        <TableCell>{item.selected_answer_text || 'Без ответа'}</TableCell>
                        <TableCell>{
                          item.selected_answer_text
                            ? (item.is_correct ? 'Верно' : 'Ошибка')
                            : 'Без ответа'
                        }</TableCell>
                        <TableCell>{item.rule_reference || '-'}</TableCell>
                      </TableRow>
                    ))}

                    {(!examAttemptDetails.answers || examAttemptDetails.answers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">
                            По этой попытке экзамена нет сохраненного снимка ответов.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={(examAttemptDetails.answers || []).length}
                page={examAttemptDetailsPage}
                onPageChange={(_, nextPage) => setExamAttemptDetailsPage(nextPage)}
                rowsPerPage={examAttemptDetailsRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setExamAttemptDetailsRowsPerPage(Number(event.target.value));
                  setExamAttemptDetailsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                labelRowsPerPage="На странице"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExamAttemptDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserStats;
