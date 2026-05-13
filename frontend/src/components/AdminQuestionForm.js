import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from '../api/axios';

const INITIAL_FORM_VALUES = {
  sectionId: '',
  ticketId: '',
  text: '',
  ruleReference: '',
  explanation: '',
  answers: ['', ''],
  correctAnswer: 1
};

function AdminQuestionForm() {
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [questionsPerTicket, setQuestionsPerTicket] = useState(10);
  const [alert, setAlert] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

  const selectedSectionId = formValues.sectionId;

  const correctAnswerOptions = useMemo(() => {
    const answers = Array.isArray(formValues.answers) ? formValues.answers : [];
    return answers.map((value, index) => ({
      value: index + 1,
      label: value && String(value).trim() ? `${index + 1}. ${value}` : `Ответ ${index + 1}`
    }));
  }, [formValues.answers]);

  const availableTickets = useMemo(() => {
    if (!selectedSectionId) {
      return tickets;
    }

    return tickets.filter((ticket) => Number(ticket.section_id) === Number(selectedSectionId));
  }, [tickets, selectedSectionId]);

  useEffect(() => {
    if (!formValues.ticketId) {
      return;
    }

    const stillAvailable = availableTickets.some((ticket) => Number(ticket.id) === Number(formValues.ticketId));
    if (!stillAvailable) {
      setFormValues((prev) => ({ ...prev, ticketId: '' }));
    }
  }, [availableTickets, formValues.ticketId]);

  const fetchMeta = async ({ withLoader = true } = {}) => {
    if (withLoader) {
      setMetaLoading(true);
    }

    try {
      const response = await axios.get('/api/admin/questions/meta');
      setSections(response.data.sections || []);
      setTickets(response.data.tickets || []);
      setQuestionsPerTicket(response.data.questions_per_ticket || 10);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить темы ПДД'
      });
    } finally {
      if (withLoader) {
        setMetaLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMeta({ withLoader: true });
  }, []);

  const updateField = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const updateAnswer = (index, value) => {
    setFormValues((prev) => {
      const nextAnswers = [...prev.answers];
      nextAnswers[index] = value;
      return { ...prev, answers: nextAnswers };
    });
  };

  const addAnswer = () => {
    setFormValues((prev) => {
      if (prev.answers.length >= 6) {
        return prev;
      }

      return { ...prev, answers: [...prev.answers, ''] };
    });
  };

  const removeAnswer = (index) => {
    setFormValues((prev) => {
      if (prev.answers.length <= 2) {
        return prev;
      }

      const nextAnswers = prev.answers.filter((_, itemIndex) => itemIndex !== index);
      const nextCorrectAnswer = Math.min(prev.correctAnswer, nextAnswers.length);

      return {
        ...prev,
        answers: nextAnswers,
        correctAnswer: Math.max(nextCorrectAnswer, 1)
      };
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    setSelectedFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formValues.sectionId) {
      setAlert({ type: 'error', message: 'Выберите тему ПДД' });
      return;
    }

    if (!formValues.text.trim()) {
      setAlert({ type: 'error', message: 'Введите текст вопроса' });
      return;
    }

    const preparedAnswers = (formValues.answers || [])
      .map((item) => (item || '').trim())
      .filter(Boolean);

    if (preparedAnswers.length < 2 || preparedAnswers.length > 6) {
      setAlert({ type: 'error', message: 'Укажите от 2 до 6 непустых вариантов ответов' });
      return;
    }

    if (!formValues.correctAnswer || formValues.correctAnswer > preparedAnswers.length) {
      setAlert({ type: 'error', message: 'Выберите корректный номер правильного ответа' });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const formData = new FormData();
      formData.append('sectionId', String(formValues.sectionId));
      formData.append('text', formValues.text.trim());
      formData.append('answers', JSON.stringify(preparedAnswers));
      formData.append('correctAnswer', String(formValues.correctAnswer));

      if (formValues.explanation && formValues.explanation.trim()) {
        formData.append('explanation', formValues.explanation.trim());
      }

      if (formValues.ruleReference && formValues.ruleReference.trim()) {
        formData.append('ruleReference', formValues.ruleReference.trim());
      }

      if (formValues.ticketId) {
        formData.append('ticketId', String(formValues.ticketId));
      }

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await axios.post('/api/admin/questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAlert({ type: 'success', message: 'Вопрос успешно добавлен' });
      setFormValues(INITIAL_FORM_VALUES);
      setSelectedFile(null);
      setImagePreview(null);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Ошибка при добавлении вопроса'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Добавление вопроса ПДД</Typography>
            <Typography variant="body2" color="text.secondary">Заполните форму и сохраните новый вопрос с привязкой к теме.</Typography>
            <Typography variant="body2" color="text.secondary">Каждый билет должен содержать ровно {questionsPerTicket} вопросов.</Typography>
          </Box>

          {alert && (
            <Alert severity={alert.type === 'error' ? 'error' : 'success'} onClose={() => setAlert(null)}>
              {alert.message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl fullWidth disabled={metaLoading}>
                <InputLabel id="question-section-label">Тема ПДД</InputLabel>
                <Select
                  labelId="question-section-label"
                  label="Тема ПДД"
                  value={formValues.sectionId}
                  onChange={(event) => updateField('sectionId', event.target.value)}
                >
                  {sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={metaLoading}>
                <InputLabel id="question-ticket-label">Билет (опционально)</InputLabel>
                <Select
                  labelId="question-ticket-label"
                  label="Билет (опционально)"
                  value={formValues.ticketId}
                  onChange={(event) => updateField('ticketId', event.target.value)}
                >
                  <MenuItem value=""><em>Не выбран</em></MenuItem>
                  {availableTickets.map((ticket) => (
                    <MenuItem key={ticket.id} value={ticket.id} disabled={!ticket.can_add_questions}>
                      {(ticket.title || `Билет ${ticket.id}`)
                        + ` (${ticket.questions_count}/${ticket.questions_required})`
                        + (ticket.is_complete ? ' - заполнен' : '')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Текст вопроса"
                multiline
                rows={4}
                value={formValues.text}
                onChange={(event) => updateField('text', event.target.value)}
                disabled={metaLoading}
              />

              <Box>
                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                  Выбрать изображение
                  <input
                    hidden
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                  />
                </Button>
                {selectedFile && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Файл выбран: {selectedFile.name}
                    </Typography>
                    {imagePreview && (
                      <Box
                        component="img"
                        src={imagePreview}
                        alt="Предпросмотр"
                        sx={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '4px'
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>

              <Box>
                <Typography fontWeight={600} sx={{ mb: 1 }}>Варианты ответов</Typography>
                <Stack spacing={1.5}>
                  {formValues.answers.map((answer, index) => (
                    <Stack key={`answer-${index + 1}`} direction="row" spacing={1} alignItems="center">
                      <TextField
                        fullWidth
                        label={`Вариант ответа ${index + 1}`}
                        value={answer}
                        onChange={(event) => updateAnswer(index, event.target.value)}
                      />

                      <Button
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={() => removeAnswer(index)}
                        disabled={formValues.answers.length <= 2}
                      >
                        Удалить
                      </Button>
                    </Stack>
                  ))}

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addAnswer}
                    disabled={formValues.answers.length >= 6}
                  >
                    Добавить вариант
                  </Button>
                </Stack>
              </Box>

              <FormControl>
                <Typography fontWeight={600} sx={{ mb: 1 }}>Правильный ответ</Typography>
                <RadioGroup
                  value={formValues.correctAnswer}
                  onChange={(event) => updateField('correctAnswer', Number(event.target.value))}
                >
                  {correctAnswerOptions.map((option) => (
                    <Box key={option.value} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Radio value={option.value} />
                      <Typography variant="body2">{option.label}</Typography>
                    </Box>
                  ))}
                </RadioGroup>
              </FormControl>

              <TextField
                label="Номер пункта ПДД (опционально)"
                inputProps={{ maxLength: 50 }}
                value={formValues.ruleReference}
                onChange={(event) => updateField('ruleReference', event.target.value)}
              />

              <TextField
                label="Пояснение к ответу (опционально)"
                multiline
                rows={4}
                value={formValues.explanation}
                onChange={(event) => updateField('explanation', event.target.value)}
              />

              <Button type="submit" variant="contained" disabled={submitting || metaLoading}>
                {submitting ? 'Сохранение...' : 'Сохранить вопрос'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AdminQuestionForm;
