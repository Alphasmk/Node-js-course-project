import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TablePagination,
  TextField,
  Typography
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import axios from '../api/axios';

const QUESTIONS_PER_VARIANT = 30;
const DEFAULT_VARIANTS_PER_PAGE = 2;

const getQuestionLabel = (question) => {
  if (!question) {
    return 'Вопрос';
  }

  const normalized = String(question.text || '').replace(/\s+/g, ' ').trim();
  const shortened = normalized.length > 120
    ? `${normalized.slice(0, 120)}...`
    : normalized;

  return `#${question.id} ${shortened}`;
};

function QuestionPicker({
  pool,
  selectedIds,
  onChange,
  requiredCount,
  disabled = false
}) {
  const [availableQuery, setAvailableQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState('');

  const questionById = useMemo(() => {
    const map = new Map();
    pool.forEach((question) => {
      map.set(Number(question.id), question);
    });
    return map;
  }, [pool]);

  const selectedSet = useMemo(() => new Set(selectedIds.map((id) => Number(id))), [selectedIds]);

  const availableQuestions = useMemo(() => {
    const query = String(availableQuery || '').trim().toLowerCase();

    return pool.filter((question) => {
      const qId = Number(question.id);
      if (selectedSet.has(qId)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (`${question.id} ${question.text || ''} ${question.section_title || ''}`).toLowerCase().includes(query);
    });
  }, [pool, selectedSet, availableQuery]);

  const AVAILABLE_PAGE_SIZE = 50;
  const [availablePage, setAvailablePage] = useState(0);

  const totalAvailablePages = useMemo(() => {
    if (!availableQuestions) return 0;
    return Math.max(1, Math.ceil(availableQuestions.length / AVAILABLE_PAGE_SIZE));
  }, [availableQuestions]);

  const visibleAvailableQuestions = useMemo(() => {
    if (!availableQuestions) return [];
    const start = availablePage * AVAILABLE_PAGE_SIZE;
    return availableQuestions.slice(start, start + AVAILABLE_PAGE_SIZE);
  }, [availableQuestions, availablePage]);

  useEffect(() => {
    setAvailablePage(0);
  }, [availableQuery, pool, selectedIds]);

  const selectedQuestions = useMemo(() => {
    const query = String(selectedQuery || '').trim().toLowerCase();

    return selectedIds
      .map((id) => questionById.get(Number(id)) || { id: Number(id), text: `Вопрос #${id}`, section_title: 'Без темы' })
      .filter((question) => {
        if (!query) {
          return true;
        }

        return (`${question.id} ${question.text || ''} ${question.section_title || ''}`).toLowerCase().includes(query);
      });
  }, [selectedIds, questionById, selectedQuery]);

  const addQuestion = (questionId) => {
    if (disabled) {
      return;
    }

    const normalizedId = Number(questionId);
    if (selectedSet.has(normalizedId)) {
      return;
    }

    if (selectedIds.length >= requiredCount) {
      return;
    }

    onChange([...selectedIds, normalizedId]);
  };

  const removeQuestion = (questionId) => {
    if (disabled) {
      return;
    }

    const normalizedId = Number(questionId);
    onChange(selectedIds.filter((id) => Number(id) !== normalizedId));
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
      <Box sx={{ border: '1px solid #dbe5f8', borderRadius: 2, p: 1.5 }}>
        <Stack spacing={1}>
          <Typography fontWeight={700}>Доступные вопросы</Typography>
          <TextField
            size="small"
            label="Поиск в доступных"
            value={availableQuery}
            onChange={(event) => setAvailableQuery(event.target.value)}
            disabled={disabled}
          />
          <Typography variant="caption" color="text.secondary">
            Найдено: {availableQuestions.length}
          </Typography>
          <List dense sx={{ maxHeight: 260, overflow: 'auto', border: '1px solid #edf3fb', borderRadius: 1 }}>
            {visibleAvailableQuestions.map((question) => (
              <ListItemButton
                key={`available-${question.id}`}
                disabled={disabled || selectedIds.length >= requiredCount}
                onClick={() => addQuestion(question.id)}
              >
                <ListItemText
                  primary={getQuestionLabel(question)}
                  secondary={question.section_title || 'Без темы'}
                />
              </ListItemButton>
            ))}
            {availableQuestions.length === 0 && (
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="body2" color="text.secondary">Нет доступных вопросов</Typography>
              </Box>
            )}
          </List>
          {totalAvailablePages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Button size="small" disabled={availablePage === 0} onClick={() => setAvailablePage((p) => Math.max(0, p - 1))}>Пред.</Button>
              <Typography variant="caption" color="text.secondary">Страница {availablePage + 1} / {totalAvailablePages}</Typography>
              <Button size="small" disabled={availablePage >= totalAvailablePages - 1} onClick={() => setAvailablePage((p) => Math.min(totalAvailablePages - 1, p + 1))}>След.</Button>
            </Box>
          )}
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid #dbe5f8', borderRadius: 2, p: 1.5 }}>
        <Stack spacing={1}>
          <Typography fontWeight={700}>Выбранные вопросы ({selectedIds.length}/{requiredCount})</Typography>
          <TextField
            size="small"
            label="Поиск в выбранных"
            value={selectedQuery}
            onChange={(event) => setSelectedQuery(event.target.value)}
            disabled={disabled}
          />
          <List dense sx={{ maxHeight: 260, overflow: 'auto', border: '1px solid #edf3fb', borderRadius: 1 }}>
            {selectedQuestions.map((question, index) => (
              <ListItemButton
                key={`selected-${question.id}-${index}`}
                disabled={disabled}
                onClick={() => removeQuestion(question.id)}
              >
                <ListItemText
                  primary={`${index + 1}. ${getQuestionLabel(question)}`}
                  secondary={question.section_title || 'Без темы'}
                />
              </ListItemButton>
            ))}
            {selectedQuestions.length === 0 && (
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="body2" color="text.secondary">Вариант пока не содержит вопросов</Typography>
              </Box>
            )}
          </List>
        </Stack>
      </Box>
    </Box>
  );
}

function AdminExamManager() {
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState(null);
  const [deletingVariantId, setDeletingVariantId] = useState(null);

  const [config, setConfig] = useState({
    max_mistakes_percent: 33,
    max_mistakes_allowed: 10,
    time_limit_minutes: 60,
    questions_per_variant: QUESTIONS_PER_VARIANT
  });

  const [questionPool, setQuestionPool] = useState([]);
  const [variants, setVariants] = useState([]);
  const [variantsPage, setVariantsPage] = useState(0);
  const [variantsRowsPerPage, setVariantsRowsPerPage] = useState(DEFAULT_VARIANTS_PER_PAGE);
  const [newVariantQuestionIds, setNewVariantQuestionIds] = useState([]);

  const [editStateByVariantId, setEditStateByVariantId] = useState({});
  const [alert, setAlert] = useState(null);

  const questionsPerVariant = QUESTIONS_PER_VARIANT;

  const paginatedVariants = useMemo(() => {
    const start = variantsPage * variantsRowsPerPage;
    return variants.slice(start, start + variantsRowsPerPage);
  }, [variants, variantsPage, variantsRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(variants.length / variantsRowsPerPage) - 1);
    if (variantsPage > maxPage) {
      setVariantsPage(maxPage);
    }
  }, [variants.length, variantsPage, variantsRowsPerPage]);

  const applyVariantsToEditState = (variantsPayload) => {
    const nextState = {};
    variantsPayload.forEach((variant) => {
      nextState[variant.id] = {
        questionIds: Array.isArray(variant.questions)
          ? variant.questions.map((question) => Number(question.id))
          : [],
        isActive: Boolean(variant.is_active)
      };
    });
    setEditStateByVariantId(nextState);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert(null);

    try {
      const [configRes, variantsRes, questionPoolRes] = await Promise.all([
        axios.get('/api/admin/exams/config'),
        axios.get('/api/admin/exams/variants'),
        axios.get('/api/admin/exams/question-pool')
      ]);

      const configPayload = configRes.data?.config || {};
      const variantsPayload = variantsRes.data?.variants || [];

      setConfig({
        max_mistakes_percent: Number(configPayload.max_mistakes_percent ?? 33),
        max_mistakes_allowed: Number(configPayload.max_mistakes_allowed ?? 10),
        time_limit_minutes: Number(configPayload.time_limit_minutes ?? 60),
        questions_per_variant: QUESTIONS_PER_VARIANT
      });
      setVariants(variantsPayload);
      applyVariantsToEditState(variantsPayload);
      setQuestionPool(questionPoolRes.data?.questions || []);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить настройки экзамена'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveConfig = async () => {
    const maxMistakesPercent = Number(config.max_mistakes_percent);
    const timeLimitMinutes = Number(config.time_limit_minutes);

    if (Number.isNaN(maxMistakesPercent) || maxMistakesPercent < 0 || maxMistakesPercent > 100) {
      setAlert({ type: 'error', message: 'Процент максимума ошибок должен быть числом от 0 до 100' });
      return;
    }

    if (Number.isNaN(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 300) {
      setAlert({ type: 'error', message: 'Время экзамена должно быть числом от 1 до 300 минут' });
      return;
    }

    setSavingConfig(true);
    setAlert(null);

    try {
      const response = await axios.put('/api/admin/exams/config', {
        maxMistakesPercent,
        timeLimitMinutes
      });

      const payload = response.data?.config || {};
      setConfig((prev) => ({
        ...prev,
        max_mistakes_percent: Number(payload.max_mistakes_percent ?? prev.max_mistakes_percent),
        max_mistakes_allowed: Number(payload.max_mistakes_allowed ?? prev.max_mistakes_allowed),
        time_limit_minutes: Number(payload.time_limit_minutes ?? prev.time_limit_minutes),
        questions_per_variant: QUESTIONS_PER_VARIANT
      }));
      setAlert({ type: 'success', message: response.data?.message || 'Настройки экзамена обновлены' });
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось обновить настройки экзамена'
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const fillRandomQuestions = (setter) => {
    if (questionPool.length < questionsPerVariant) {
      setAlert({
        type: 'error',
        message: `Доступных вопросов меньше, чем нужно для варианта (${questionsPerVariant})`
      });
      return;
    }

    const groupedBySection = new Map();
    questionPool.forEach((question) => {
      const sectionKey = String(question.section_title || 'Без темы');
      if (!groupedBySection.has(sectionKey)) {
        groupedBySection.set(sectionKey, []);
      }
      groupedBySection.get(sectionKey).push(question);
    });

    const sectionBuckets = Array.from(groupedBySection.values())
      .map((items) => [...items].sort(() => Math.random() - 0.5));

    const selected = [];
    let cursor = 0;
    while (selected.length < questionsPerVariant) {
      let pickedOnThisRound = false;

      for (let i = 0; i < sectionBuckets.length && selected.length < questionsPerVariant; i += 1) {
        const bucketIndex = (cursor + i) % sectionBuckets.length;
        const bucket = sectionBuckets[bucketIndex];
        if (bucket.length === 0) {
          continue;
        }

        const question = bucket.pop();
        if (question) {
          selected.push(question);
          pickedOnThisRound = true;
        }
      }

      if (!pickedOnThisRound) {
        break;
      }

      cursor = (cursor + 1) % sectionBuckets.length;
    }

    const selectedIds = selected.slice(0, questionsPerVariant).map((question) => Number(question.id));
    setter(selectedIds);
  };

  const createVariant = async () => {
    if (!Array.isArray(newVariantQuestionIds) || newVariantQuestionIds.length !== questionsPerVariant) {
      setAlert({ type: 'error', message: `Нужно выбрать ровно ${questionsPerVariant} вопросов` });
      return;
    }

    setCreatingVariant(true);
    setAlert(null);

    try {
      const response = await axios.post('/api/admin/exams/variants', {
        questionIds: newVariantQuestionIds.map((id) => Number(id))
      });

      setAlert({ type: 'success', message: response.data?.message || 'Вариант экзамена создан' });
      setNewVariantQuestionIds([]);
      await loadData();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось создать вариант экзамена'
      });
    } finally {
      setCreatingVariant(false);
    }
  };

  const updateVariantField = (variantId, field, value) => {
    setEditStateByVariantId((prev) => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {}),
        [field]: value
      }
    }));
  };

  const saveVariant = async (variantId) => {
    const variantState = editStateByVariantId[variantId];
    if (!variantState) {
      return;
    }

    if (!Array.isArray(variantState.questionIds) || variantState.questionIds.length !== questionsPerVariant) {
      setAlert({ type: 'error', message: `Вариант должен содержать ровно ${questionsPerVariant} вопросов` });
      return;
    }

    setSavingVariantId(variantId);
    setAlert(null);

    try {
      const response = await axios.put(`/api/admin/exams/variants/${variantId}`, {
        questionIds: variantState.questionIds.map((id) => Number(id)),
        isActive: Boolean(variantState.isActive)
      });

      setAlert({ type: 'success', message: response.data?.message || 'Вариант обновлен' });
      await loadData();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось обновить вариант'
      });
    } finally {
      setSavingVariantId(null);
    }
  };

  const deleteVariant = async (variant) => {
    const approved = window.confirm(
      `Удалить вариант #${variant.id}?`
    );

    if (!approved) {
      return;
    }

    setDeletingVariantId(variant.id);
    setAlert(null);

    try {
      const response = await axios.delete(`/api/admin/exams/variants/${variant.id}`);
      setAlert({ type: 'success', message: response.data?.message || 'Вариант удален' });
      await loadData();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось удалить вариант'
      });
    } finally {
      setDeletingVariantId(null);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Экзамен</Typography>
        <Typography variant="body2" color="text.secondary">
          Вариант экзамена содержит ровно {questionsPerVariant} вопросов. Глобальные лимиты применяются ко всему экзамену.
        </Typography>
      </Box>

      {alert && (
        <Alert severity={alert.type === 'error' ? 'error' : 'success'} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Глобальные настройки экзамена</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Максимум ошибок в экзамене (%)"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 100 }}
                value={config.max_mistakes_percent}
                onChange={(event) => setConfig((prev) => ({
                  ...prev,
                  max_mistakes_percent: event.target.value
                }))}
                disabled={loading || savingConfig}
                helperText={`Сейчас это ${config.max_mistakes_allowed} из ${questionsPerVariant} вопросов`}
              />
              <TextField
                label="Время экзамена (минуты)"
                type="number"
                fullWidth
                inputProps={{ min: 1, max: 300 }}
                value={config.time_limit_minutes}
                onChange={(event) => setConfig((prev) => ({
                  ...prev,
                  time_limit_minutes: event.target.value
                }))}
                disabled={loading || savingConfig}
              />
            </Stack>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveConfig}
              disabled={loading || savingConfig}
            >
              {savingConfig ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Создать вариант экзамена</Typography>
            <QuestionPicker
              pool={questionPool}
              selectedIds={newVariantQuestionIds}
              onChange={setNewVariantQuestionIds}
              requiredCount={questionsPerVariant}
              disabled={loading || creatingVariant}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<CasinoIcon />}
                onClick={() => fillRandomQuestions(setNewVariantQuestionIds)}
                disabled={loading || creatingVariant}
              >
                Заполнить случайно
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={createVariant}
                disabled={loading || creatingVariant}
              >
                {creatingVariant ? 'Создание...' : 'Создать вариант'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Существующие варианты</Typography>

            {variants.length === 0 ? (
              <Typography color="text.secondary">Пока нет вариантов экзамена</Typography>
            ) : (
              paginatedVariants.map((variant) => {
                const state = editStateByVariantId[variant.id] || {
                  questionIds: [],
                  isActive: true
                };

                return (
                  <Box
                    key={variant.id}
                    sx={{
                      p: 2,
                      border: '1px solid #dbe5f8',
                      borderRadius: 2
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <Typography fontWeight={700}>Вариант #{variant.id}</Typography>
                        <Chip
                          size="small"
                          color={variant.is_complete ? 'success' : 'warning'}
                          label={variant.is_complete ? 'Готов' : 'Неполный'}
                        />
                        <FormControlLabel
                          control={(
                            <Switch
                              checked={Boolean(state.isActive)}
                              onChange={(event) => updateVariantField(variant.id, 'isActive', event.target.checked)}
                            />
                          )}
                          label="Активен"
                        />
                      </Stack>

                      <QuestionPicker
                        pool={questionPool}
                        selectedIds={state.questionIds}
                        onChange={(questionIds) => updateVariantField(variant.id, 'questionIds', questionIds)}
                        requiredCount={questionsPerVariant}
                        disabled={Number(savingVariantId) === Number(variant.id)}
                      />

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button
                          variant="outlined"
                          startIcon={<CasinoIcon />}
                          onClick={() => fillRandomQuestions((questionIds) => updateVariantField(variant.id, 'questionIds', questionIds))}
                          disabled={Number(savingVariantId) === Number(variant.id)}
                        >
                          Случайные вопросы
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => saveVariant(variant.id)}
                          disabled={Number(savingVariantId) === Number(variant.id)}
                        >
                          {Number(savingVariantId) === Number(variant.id) ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => deleteVariant(variant)}
                          disabled={Number(deletingVariantId) === Number(variant.id)}
                        >
                          {Number(deletingVariantId) === Number(variant.id) ? 'Удаление...' : 'Удалить'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })
            )}

            {variants.length > 0 && (
              <TablePagination
                component="div"
                count={variants.length}
                page={variantsPage}
                onPageChange={(_, nextPage) => setVariantsPage(nextPage)}
                rowsPerPage={variantsRowsPerPage}
                rowsPerPageOptions={[2, 5, 10]}
                onRowsPerPageChange={(event) => {
                  setVariantsRowsPerPage(Number(event.target.value));
                  setVariantsPage(0);
                }}
                labelRowsPerPage="На странице"
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default AdminExamManager;
