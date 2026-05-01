import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import axios from '../api/axios';

function ExamPractice({ isAuthenticated = false, onRequireAuth }) {
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [startingExam, setStartingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);

  const [examInfo, setExamInfo] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [attemptMeta, setAttemptMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [alert, setAlert] = useState(null);

  const timerIntervalRef = useRef(null);
  const timedOutSubmitGuardRef = useRef(false);
  const mistakeLimitSubmitGuardRef = useRef(false);

  const isAttemptActive = Boolean(attemptId) && questions.length > 0 && !result;
  const currentQuestion = questions[currentQuestionIndex] || null;

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

  const resetExamState = () => {
    setAttemptId(null);
    setAttemptMeta(null);
    setQuestions([]);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
    setTimeLeftSeconds(null);
    timedOutSubmitGuardRef.current = false;
    mistakeLimitSubmitGuardRef.current = false;
  };

  const loadExamInfo = async () => {
    setLoadingInfo(true);
    setAlert(null);

    try {
      const response = await axios.get('/api/exam/info');
      setExamInfo(response.data?.exam || null);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить настройки экзамена'
      });
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    loadExamInfo();
  }, []);

  const updateTimeLeft = (deadlineAtValue) => {
    if (!deadlineAtValue) {
      setTimeLeftSeconds(null);
      return;
    }

    const deadline = new Date(deadlineAtValue).getTime();
    const diffSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    setTimeLeftSeconds(diffSeconds);
  };

  const startExam = async () => {
    if (!isAuthenticated) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth();
      }
      return;
    }

    setStartingExam(true);
    setAlert(null);

    try {
      resetExamState();

      const response = await axios.post('/api/exam/start');
      const attempt = response.data?.attempt || null;
      const loadedQuestions = Array.isArray(attempt?.questions) ? attempt.questions : [];

      setAttemptId(attempt?.id || null);
      setAttemptMeta({
        started_at: attempt?.started_at,
        deadline_at: attempt?.deadline_at,
        max_mistakes_allowed: Number(attempt?.max_mistakes_allowed ?? 0),
        time_limit_seconds: Number(attempt?.time_limit_seconds ?? 0),
        variant: attempt?.variant || null,
        questions_total: Number(attempt?.questions_total ?? loadedQuestions.length)
      });
      setQuestions(loadedQuestions);
      setSelectedAnswers({});
      setCurrentQuestionIndex(0);
      updateTimeLeft(attempt?.deadline_at);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось начать экзамен'
      });
    } finally {
      setStartingExam(false);
    }
  };

  const submitExam = useCallback(async () => {
    if (!attemptId || submittingExam) {
      return;
    }

    setSubmittingExam(true);
    setAlert(null);

    try {
      const answersPayload = Object.entries(selectedAnswers).map(([questionId, answerId]) => ({
        questionId: Number(questionId),
        answerId: Number(answerId)
      }));

      const response = await axios.post(`/api/exam/${attemptId}/finish`, {
        answers: answersPayload
      });

      setResult(response.data?.result || null);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось завершить экзамен'
      });
    } finally {
      setSubmittingExam(false);
    }
  }, [attemptId, selectedAnswers, submittingExam]);

  useEffect(() => {
    if (!isAttemptActive || !attemptMeta?.deadline_at) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return undefined;
    }

    updateTimeLeft(attemptMeta.deadline_at);

    timerIntervalRef.current = setInterval(() => {
      updateTimeLeft(attemptMeta.deadline_at);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isAttemptActive, attemptMeta?.deadline_at]);

  useEffect(() => {
    if (!isAttemptActive || submittingExam) {
      return;
    }

    if (Number(timeLeftSeconds) === 0 && !timedOutSubmitGuardRef.current) {
      timedOutSubmitGuardRef.current = true;
      submitExam();
    }
  }, [timeLeftSeconds, isAttemptActive, submittingExam, submitExam]);

  useEffect(() => {
    if (!isAttemptActive || submittingExam) {
      return;
    }

    const selectedAnswerCount = Object.keys(selectedAnswers).length;
    if (selectedAnswerCount === 0) {
      return;
    }

    const wrongAnsweredCount = questions.reduce((count, question) => {
      const selectedAnswerId = selectedAnswers[question.id];
      if (!selectedAnswerId) {
        return count;
      }

      const selectedAnswer = Array.isArray(question.answers)
        ? question.answers.find((answer) => Number(answer.id) === Number(selectedAnswerId))
        : null;

      return count + (selectedAnswer && !selectedAnswer.is_correct ? 1 : 0);
    }, 0);

    if (
      Number(attemptMeta?.max_mistakes_allowed ?? 0) > 0
      && wrongAnsweredCount > 0
      && wrongAnsweredCount >= Number(attemptMeta?.max_mistakes_allowed ?? 0)
      && !mistakeLimitSubmitGuardRef.current
    ) {
      mistakeLimitSubmitGuardRef.current = true;
      submitExam();
    }
  }, [selectedAnswers, questions, attemptMeta?.max_mistakes_allowed, isAttemptActive, submittingExam, submitExam]);

  const progressValue = questions.length > 0
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  const formatTime = (valueSeconds) => {
    if (valueSeconds === null || valueSeconds === undefined) {
      return '--:--';
    }

    const safeValue = Math.max(0, Number(valueSeconds));
    const minutes = Math.floor(safeValue / 60);
    const seconds = safeValue % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Экзамен</Typography>
      </Box>

      {alert && (
        <Alert severity={alert.type === 'error' ? 'error' : 'success'} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {!isAttemptActive && !result && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Режим экзамена</Typography>
              <Typography color="text.secondary">
                После старта будет выбран случайный готовый вариант экзамена.
              </Typography>
              <Typography color="text.secondary">
                Вариант включает {Number(examInfo?.questions_per_variant ?? 30)} вопросов.
              </Typography>
              <Typography color="text.secondary">
                Допустимо ошибок: <strong>{Number(examInfo?.max_mistakes_allowed ?? 0)}</strong>
              </Typography>
              <Typography color="text.secondary">
                Время: <strong>{Number(examInfo?.time_limit_minutes ?? 0)} минут</strong>
              </Typography>
              <Typography color="text.secondary">
                Доступных вариантов: <strong>{Number(examInfo?.variants_count ?? 0)}</strong>
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={startExam}
                  disabled={loadingInfo || startingExam || Number(examInfo?.variants_count ?? 0) <= 0}
                >
                  {startingExam ? 'Запуск...' : 'Начать экзамен'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ReplayIcon />}
                  onClick={loadExamInfo}
                  disabled={loadingInfo || startingExam}
                >
                  Обновить данные
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {isAttemptActive && currentQuestion && (
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography color="text.secondary">
                    Вопрос {currentQuestionIndex + 1} из {questions.length}
                  </Typography>
                  <Typography color="text.secondary">
                    Допустимо ошибок: <strong>{Number(attemptMeta?.max_mistakes_allowed ?? 0)}</strong>
                  </Typography>
                </Box>
                <Box>
                  <Typography color={Number(timeLeftSeconds) <= 60 ? 'error.main' : 'text.primary'} fontWeight={700}>
                    Осталось времени: {formatTime(timeLeftSeconds)}
                  </Typography>
                </Box>
              </Stack>

              <LinearProgress variant="determinate" value={progressValue} sx={{ height: 9, borderRadius: 99 }} />

              <Box>
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

                <FormControl>
                  <RadioGroup
                    value={selectedAnswers[currentQuestion.id] || ''}
                    onChange={(event) => {
                      const answerId = Number(event.target.value);
                      setSelectedAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: answerId
                      }));
                    }}
                  >
                    {(currentQuestion.answers || []).map((answer) => (
                      <FormControlLabel
                        key={answer.id}
                        value={answer.id}
                        control={<Radio />}
                        label={answer.text}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                  >
                    Далее
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<DoneAllIcon />}
                    onClick={submitExam}
                    disabled={submittingExam}
                  >
                    {submittingExam ? 'Завершение...' : 'Завершить экзамен'}
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Результат экзамена</Typography>
              <Typography>
                Вариант: <strong>{result.exam_variant_title || `#${result.exam_variant_id}`}</strong>
              </Typography>
              <Typography>
                Балл: <strong>{Number(result.score)}</strong> / <strong>{Number(result.questions_total)}</strong>
              </Typography>
              <Typography>
                Ошибок: <strong>{Number(result.mistakes_count)}</strong> (допустимо {Number(result.max_mistakes_allowed)})
              </Typography>
              <Typography>
                Статус: <strong>{result.timed_out ? 'Время вышло' : (result.is_passed ? 'Сдан' : 'Не сдан')}</strong>
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" startIcon={<ReplayIcon />} onClick={startExam}>
                  Пройти снова
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    resetExamState();
                    loadExamInfo();
                  }}
                >
                  К экрану экзамена
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export default ExamPractice;
