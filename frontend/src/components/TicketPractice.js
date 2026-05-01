import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import axios from '../api/axios';

function TicketPractice({ startRequest, onStartRequestConsumed, isAuthenticated = false, onRequireAuth }) {
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [startingAttempt, setStartingAttempt] = useState(false);
  const [attemptSubmitting, setAttemptSubmitting] = useState(false);

  const [attemptId, setAttemptId] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [wrongLeftMap, setWrongLeftMap] = useState({});

  const [attemptResult, setAttemptResult] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [alert, setAlert] = useState(null);

  const lastHandledStartNonceRef = useRef(null);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const currentSelectedAnswerId = currentQuestion
    ? Number(selectedAnswers[currentQuestion.id] || 0)
    : null;
  const currentSelectedAnswer = currentQuestion && currentSelectedAnswerId
    ? (Array.isArray(currentQuestion.answers)
      ? currentQuestion.answers.find((answer) => Number(answer.id) === Number(currentSelectedAnswerId))
      : null)
    : null;
  const isCurrentAnswerWrong = Boolean(currentSelectedAnswer && currentSelectedAnswer.is_correct === false);
  const isAttemptActive = Boolean(attemptId) && questions.length > 0 && !attemptResult;
  const showTicketGrid = !isAttemptActive && !attemptResult;

  const questionStatuses = useMemo(() => {
    return questions.map((question, index) => {
      const isAnswered = Boolean(selectedAnswers[question.id]);

      return {
        id: question.id,
        index,
        isAnswered,
        isCurrent: index === currentQuestionIndex,
        isSkipped: !isAnswered,
        isWrongLeft: Boolean(wrongLeftMap[question.id])
      };
    });
  }, [questions, selectedAnswers, currentQuestionIndex, wrongLeftMap]);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return null;
    }

    const strUrl = String(imageUrl).trim();

    if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) {
      return strUrl;
    }

    if (!strUrl.startsWith('/')) {
      return `/theme-images/${strUrl}`;
    }

    if (strUrl.startsWith('/theme-images/')) {
      return strUrl;
    }

    if (strUrl.startsWith('/uploads/questions/')) {
      if (typeof window === 'undefined') {
        return strUrl;
      }
      
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      
      const port = process.env.NODE_ENV === 'development' ? '3000' : window.location.port;

      const portPart = port ? `:${port}` : '';
      return `${protocol}//${hostname}${portPart}${strUrl}`;
    }

    return strUrl;
  };

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);

    try {
      const response = await axios.get('/api/catalog/tickets');
      setTickets(response.data.tickets || []);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить список билетов'
      });
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const resetAttemptState = () => {
    setAttemptId(null);
    setTicketData(null);
    setQuestions([]);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setAttemptResult(null);
    setAttemptDetails(null);
  };

  const startAttemptByTicketId = useCallback(async (ticketIdValue) => {
    if (!isAuthenticated) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth();
      }
      return;
    }

    const normalizedTicketId = Number(ticketIdValue);

    if (!normalizedTicketId) {
      setAlert({ type: 'error', message: 'Некорректный билет' });
      return;
    }

    setStartingAttempt(true);
    setAlert(null);

    try {
      resetAttemptState();

      const startResponse = await axios.post('/api/users/attempts/start', {
        ticketId: normalizedTicketId
      });

      const ticketQuestionsResponse = await axios.get(`/api/catalog/tickets/${normalizedTicketId}/questions`);

      setAttemptId(startResponse.data.attempt?.id || null);
      setTicketData(ticketQuestionsResponse.data.ticket || null);
      setQuestions(ticketQuestionsResponse.data.questions || []);
      setSelectedAnswers({});
      setCurrentQuestionIndex(0);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось начать прохождение билета'
      });
    } finally {
      setStartingAttempt(false);
    }
  }, [isAuthenticated, onRequireAuth]);

  useEffect(() => {
    if (!startRequest?.ticketId || !startRequest?.nonce || tickets.length === 0) {
      return;
    }

    if (lastHandledStartNonceRef.current === startRequest.nonce) {
      return;
    }

    const ticketExists = tickets.some((ticket) => Number(ticket.id) === Number(startRequest.ticketId));
    if (!ticketExists) {
      return;
    }

    lastHandledStartNonceRef.current = startRequest.nonce;
    if (typeof onStartRequestConsumed === 'function') {
      onStartRequestConsumed();
    }
    startAttemptByTicketId(startRequest.ticketId);
  }, [startRequest, tickets, startAttemptByTicketId, onStartRequestConsumed]);

  const handleSelectAnswer = (questionId, answerId) => {
    setSelectedAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: Number(answerId)
      };

      try {
        const question = questions.find((q) => Number(q.id) === Number(questionId));
        const answer = question?.answers?.find((a) => Number(a.id) === Number(answerId));
        if (answer && answer.is_correct === true) {
          setWrongLeftMap((prevMap) => {
            if (!prevMap || !prevMap[questionId]) return prevMap;
            const copy = { ...prevMap };
            delete copy[questionId];
            return copy;
          });
        }
      } catch (e) {
        
      }

      return next;
    });
  };

  const navigateToQuestion = (newIndex) => {
    const prevIndex = currentQuestionIndex;
    if (newIndex > prevIndex) {
      const prevQuestion = questions[prevIndex];
      if (prevQuestion) {
        const selectedId = selectedAnswers[prevQuestion.id];
        if (selectedId) {
          const selected = (prevQuestion.answers || []).find((a) => Number(a.id) === Number(selectedId));
          if (selected && selected.is_correct === false) {
            setWrongLeftMap((prev) => ({ ...(prev || {}), [prevQuestion.id]: true }));
          }
        }
      }
    }

    setCurrentQuestionIndex(Math.max(0, Math.min(newIndex, Math.max(0, questions.length - 1))));
  };

  const handleSubmitAttempt = async () => {
    if (!attemptId) {
      return;
    }

    setAttemptSubmitting(true);
    setAlert(null);

    try {
      const answersPayload = Object.entries(selectedAnswers).map(([questionId, answerId]) => ({
        questionId: Number(questionId),
        answerId: Number(answerId)
      }));

      const finishResponse = await axios.post(`/api/users/attempts/${attemptId}/finish`, {
        answers: answersPayload
      });

      const detailsResponse = await axios.get(`/api/users/attempts/${attemptId}`);

      setAttemptResult(finishResponse.data.result || null);
      setAttemptDetails(detailsResponse.data.attempt || null);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось завершить попытку'
      });
    } finally {
      setAttemptSubmitting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Прохождение билетов</Typography>
      </Box>

      {alert && (
        <Alert severity={alert.type === 'error' ? 'error' : 'success'} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {showTicketGrid && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5}>
                <Typography fontWeight={600}>Выберите билет</Typography>
                <Button
                  variant="outlined"
                  startIcon={<ReplayIcon />}
                  onClick={fetchTickets}
                  disabled={ticketsLoading || startingAttempt}
                >
                  Обновить
                </Button>
              </Stack>

              {ticketsLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : tickets.length === 0 ? (
                <Typography color="text.secondary">Пока нет готовых билетов для прохождения.</Typography>
              ) : (
                <div className="number-grid">
                  {tickets.map((ticket) => (
                    <Box key={ticket.id} className="ticket-practice-item">
                      <Tooltip
                        title={`${ticket.title || `Билет ${ticket.id}`} - ${ticket.section_title || 'Без темы'}`}
                      >
                        <button
                          type="button"
                          className="number-tile ticket-tile ticket-practice-tile"
                          onClick={() => startAttemptByTicketId(ticket.id)}
                          disabled={startingAttempt}
                        >
                          <span>{ticket.id}</span>
                        </button>
                      </Tooltip>
                      <Typography variant="caption" className="ticket-practice-caption">
                        {ticket.section_title || 'Без темы'}
                      </Typography>
                    </Box>
                  ))}
                </div>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {isAttemptActive && currentQuestion && (
        <Card sx={{ minHeight: { xs: 'auto', md: '70vh' } }}>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {ticketData?.title || `Билет #${ticketData?.id || ''}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Вопрос {currentQuestionIndex + 1} из {questions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Допустимо ошибок: <strong>{Number(ticketData?.max_mistakes_allowed ?? 2)}</strong>
                  </Typography>
                </Box>
              </Stack>

              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 1,
                    alignItems: 'center'
                  }}
                >
                  {questionStatuses.map((questionStatus) => (
                    <Tooltip
                      key={questionStatus.id}
                      title={
                        questionStatus.isAnswered
                          ? `Вопрос ${questionStatus.index + 1}: отвечен`
                          : `Вопрос ${questionStatus.index + 1}: пропущен`
                      }
                    >
                      <Box
                        component="button"
                        type="button"
                        onClick={() => navigateToQuestion(questionStatus.index)}
                        aria-label={`Перейти к вопросу ${questionStatus.index + 1}`}
                        sx={{
                          width: 42,
                          height: 42,
                          minWidth: 42,
                          borderRadius: '8px',
                          border: '1px solid',
                          padding: 0,
                          margin: 0,
                          appearance: 'none',
                          borderColor: questionStatus.isCurrent
                            ? 'primary.main'
                            : questionStatus.isWrongLeft
                              ? 'error.main'
                              : questionStatus.isAnswered
                                ? 'success.main'
                                : 'grey.300',
                          bgcolor: questionStatus.isCurrent
                            ? 'primary.main'
                            : questionStatus.isWrongLeft
                              ? 'error.light'
                              : questionStatus.isAnswered
                                ? 'success.light'
                                : 'background.paper',
                          color: questionStatus.isCurrent
                            ? 'common.white'
                            : questionStatus.isWrongLeft
                              ? 'common.white'
                              : questionStatus.isAnswered
                                ? 'success.dark'
                                : 'text.primary',
                          fontWeight: 700,
                          lineHeight: 1,
                          boxShadow: questionStatus.isCurrent
                            ? '0 0 0 3px rgba(25, 118, 210, 0.16)'
                            : 'none',
                          cursor: 'pointer',
                          flex: '0 0 auto',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            borderColor: questionStatus.isCurrent
                              ? 'primary.dark'
                              : questionStatus.isWrongLeft
                                ? 'error.dark'
                                : questionStatus.isAnswered
                                  ? 'success.dark'
                                  : 'text.primary'
                          }
                        }}
                      >
                        {questionStatus.index + 1}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              <LinearProgress
                variant="determinate"
                value={questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0}
                sx={{ height: 9, borderRadius: 99 }}
              />

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>{currentQuestion.text}</Typography>

                {currentQuestion.image_url && (
                  <Box
                    component="img"
                    src={getImageUrl(currentQuestion.image_url)}
                    alt="Иллюстрация к вопросу"
                    sx={{
                      mb: 2,
                      maxWidth: '100%',
                      maxHeight: 360,
                      width: 'auto',
                      display: 'block',
                      borderRadius: 2,
                      border: '1px solid #dbe5f8'
                    }}
                  />
                )}

                <FormControl sx={{ ml: { xs: 0, md: 2 } }}>
                  <RadioGroup
                    value={selectedAnswers[currentQuestion.id] || ''}
                    onChange={(event) => handleSelectAnswer(currentQuestion.id, event.target.value)}
                  >
                    {(currentQuestion.answers || []).map((answer) => (
                      <FormControlLabel
                        key={answer.id}
                        value={answer.id}
                        control={<Radio />}
                        label={answer.text}
                        sx={{
                          m: 0,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: Number(selectedAnswers[currentQuestion.id]) === Number(answer.id)
                            ? (answer.is_correct === true ? 'success.main' : (answer.is_correct === false ? 'error.main' : 'transparent'))
                            : 'transparent',
                          bgcolor: Number(selectedAnswers[currentQuestion.id]) === Number(answer.id)
                            ? (answer.is_correct === true
                              ? 'rgba(46, 125, 50, 0.08)'
                              : (answer.is_correct === false ? 'rgba(211, 47, 47, 0.08)' : 'transparent'))
                            : 'transparent'
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                {isCurrentAnswerWrong && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    Ответ неверный. {`Пункт ПДД: ${currentQuestion.rule_reference || 'не указан'}`}
                  </Alert>
                )}
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                <Button
                  variant="outlined"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => navigateToQuestion(Math.max(currentQuestionIndex - 1, 0))}
                >
                  Назад
                </Button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => navigateToQuestion(Math.min(currentQuestionIndex + 1, questions.length - 1))}
                  >
                    Далее
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<DoneAllIcon />}
                    disabled={attemptSubmitting}
                    onClick={handleSubmitAttempt}
                  >
                    {attemptSubmitting ? 'Завершение...' : 'Завершить билет'}
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {attemptResult && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Результат попытки</Typography>

              <Typography>
                Билет: <strong>{attemptDetails?.ticket_title || ticketData?.title || `#${attemptResult.ticket_id}`}</strong>
              </Typography>
              <Typography>
                Балл: <strong>{attemptResult.score}</strong> / <strong>{attemptResult.questions_total}</strong>
              </Typography>
              <Typography>
                Статус: <strong>{attemptResult.is_passed ? 'Сдан' : 'Не сдан'}</strong>
              </Typography>
              <Typography>
                Допустимо ошибок: <strong>{Number(attemptResult.max_mistakes_allowed ?? ticketData?.max_mistakes_allowed ?? 2)}</strong>
              </Typography>
              <Typography>
                Допущено ошибок: <strong>{Number(attemptResult.mistakes_count ?? 0)}</strong>
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<ReplayIcon />}
                  onClick={() => startAttemptByTicketId(attemptResult.ticket_id)}
                >
                  Пройти еще раз
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    resetAttemptState();
                    fetchTickets();
                  }}
                >
                  К списку билетов
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export default TicketPractice;
