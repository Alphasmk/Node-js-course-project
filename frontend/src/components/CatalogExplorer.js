import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';
import axios from '../api/axios';

function CatalogExplorer({
  viewMode = 'sections',
  onStartTicket,
  isAuthenticated = false,
  onRequireAuth
}) {
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [sectionContentTab, setSectionContentTab] = useState('questions');
  const [sectionQuestions, setSectionQuestions] = useState([]);
  const [sectionTickets, setSectionTickets] = useState([]);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const [selectedQuestionAnswerId, setSelectedQuestionAnswerId] = useState('');
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [alert, setAlert] = useState(null);

  const selectedSection = useMemo(
    () => sections.find((item) => item.id === selectedSectionId) || null,
    [sections, selectedSectionId]
  );

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

  const loadCatalog = async () => {
    setLoading(true);
    setAlert(null);

    try {
      const [sectionsRes, ticketsRes] = await Promise.all([
        axios.get('/api/catalog/sections'),
        axios.get('/api/catalog/tickets')
      ]);

      const loadedSections = sectionsRes.data.sections || [];
      setSections(loadedSections);
      setAllTickets(ticketsRes.data.tickets || []);

      if (loadedSections.length > 0) {
        setSelectedSectionId(loadedSections[0].id);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить каталог тем и билетов'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [viewMode]);

  useEffect(() => {
    const loadSectionData = async () => {
      if (!selectedSectionId) {
        setSectionQuestions([]);
        setSectionTickets([]);
        return;
      }

      setSectionLoading(true);
      setAlert(null);

      try {
        const [questionsRes, ticketsRes] = await Promise.all([
          axios.get(`/api/catalog/sections/${selectedSectionId}/questions`),
          axios.get(`/api/catalog/sections/${selectedSectionId}/tickets`)
        ]);

        setSectionQuestions(questionsRes.data.questions || []);
        setSectionTickets(ticketsRes.data.tickets || []);
        setQuestionSearchQuery('');
        setSelectedQuestionIndex(null);
        setSelectedQuestionAnswerId('');
        setIsQuestionDialogOpen(false);
      } catch (error) {
        setAlert({
          type: 'error',
          message: error.response?.data?.error || 'Не удалось загрузить данные выбранной темы'
        });
      } finally {
        setSectionLoading(false);
      }
    };

    loadSectionData();
  }, [selectedSectionId]);

  const filteredSectionQuestions = useMemo(() => {
    const query = String(questionSearchQuery || '').trim().toLowerCase();

    if (!query) {
      return sectionQuestions;
    }

    return sectionQuestions.filter((question) => {
      return String(question.text || '').toLowerCase().includes(query);
    });
  }, [sectionQuestions, questionSearchQuery]);

  const selectedQuestion =
    selectedQuestionIndex !== null && selectedQuestionIndex >= 0 && selectedQuestionIndex < filteredSectionQuestions.length
      ? filteredSectionQuestions[selectedQuestionIndex]
      : null;

  const selectedQuestionAnswer = selectedQuestion && Array.isArray(selectedQuestion.answers)
    ? selectedQuestion.answers.find((answer) => Number(answer.id) === Number(selectedQuestionAnswerId))
    : null;

  const handleOpenQuestionDialog = (index) => {
    if (!isAuthenticated) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth();
      }
      return;
    }

    setSelectedQuestionIndex(index);
    setSelectedQuestionAnswerId('');
    setIsQuestionDialogOpen(true);
  };

  const handleCloseQuestionDialog = () => {
    setIsQuestionDialogOpen(false);
    setSelectedQuestionAnswerId('');
  };

  const renderTicketTiles = (tickets, showSection = false, isClickable = false) => {
    if (tickets.length === 0) {
      return <Typography color="text.secondary">Список билетов пуст</Typography>;
    }

    return (
      <div className="number-grid">
        {tickets.map((ticket) => (
          <Box key={ticket.id} className="ticket-practice-item">
            <Tooltip
              title={showSection ? `${ticket.title || `Билет ${ticket.id}`} - ${ticket.section_title}` : (ticket.title || `Билет ${ticket.id}`)}
            >
              <button
                type="button"
                className={`number-tile ticket-tile ${isClickable ? 'ticket-practice-tile' : ''}`}
                onClick={() => {
                  if (isClickable && typeof onStartTicket === 'function') {
                    onStartTicket(ticket.id);
                  }
                }}
                disabled={isClickable && typeof onStartTicket !== 'function'}
              >
                <span>{ticket.id}</span>
              </button>
            </Tooltip>
            {showSection && (
              <Typography variant="caption" className="ticket-practice-caption">
                {ticket.section_title || 'Без темы'}
              </Typography>
            )}
          </Box>
        ))}
      </div>
    );
  };

  const renderQuestionList = () => {
    if (filteredSectionQuestions.length === 0) {
      return <Typography color="text.secondary">В выбранной теме пока нет вопросов</Typography>;
    }

    return (
      <List className="theme-question-list" disablePadding>
        {filteredSectionQuestions.map((question, index) => (
          <ListItemButton
            key={`question-${question.id}`}
            selected={selectedQuestionIndex === index}
            onClick={() => handleOpenQuestionDialog(index)}
            className="theme-question-item"
          >
            <ListItemText
              primary={`#${index + 1} ${question.text}`}
            />
          </ListItemButton>
        ))}
      </List>
    );
  };

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {viewMode === 'sections' ? (
        <Box>
          <Typography variant="h5" fontWeight={700}>Список тем</Typography>
        </Box>
      ) : (
        <Box>
          <Typography variant="h5" fontWeight={700}>Общий список билетов</Typography>
          <Typography variant="body2" color="text.secondary">Отображаются только заполненные администратором билеты.</Typography>
        </Box>
      )}

      {alert && (
        <Alert severity={alert.type === 'error' ? 'error' : 'success'} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading && (
        <Typography variant="body2" color="text.secondary">Загрузка каталога...</Typography>
      )}

      {viewMode === 'sections' ? (
        <>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Темы</Typography>
              {sections.length === 0 ? (
                <Typography color="text.secondary">Темы пока не добавлены</Typography>
              ) : (
                <Box className="section-chip-list">
                  {sections.map((section) => (
                    <Button
                      key={section.id}
                      size="small"
                      variant={selectedSectionId === section.id ? 'contained' : 'outlined'}
                      className={`section-chip-btn ${selectedSectionId === section.id ? 'active' : ''}`}
                      disabled={loading || sectionLoading}
                      onClick={() => setSelectedSectionId(section.id)}
                    >
                      {section.title}
                    </Button>
                  ))}
                </Box>
              )}

              {selectedSection && (
                <Box sx={{ mt: 2 }}>
                  <Typography fontWeight={700}>{selectedSection.title}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={`Вопросов: ${selectedSection.questions_count}`} />
                    <Chip size="small" label={`Билетов: ${selectedSection.tickets_count}`} />
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">Поиск вопросов</Typography>
                <TextField
                  size="small"
                  fullWidth
                  label="Найти вопрос в выбранной теме"
                  value={questionSearchQuery}
                  onChange={(event) => setQuestionSearchQuery(event.target.value)}
                />
                <Typography variant="body2" color="text.secondary">
                  Найдено: {filteredSectionQuestions.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Tabs
                value={sectionContentTab}
                onChange={(_, value) => setSectionContentTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                className="section-content-tabs"
              >
                <Tab value="questions" label={`Вопросы (${sectionQuestions.length})`} />
                <Tab value="tickets" label={`Билеты (${sectionTickets.length})`} />
              </Tabs>

              {sectionContentTab === 'questions' ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {sectionLoading ? (
                    <Typography color="text.secondary">Загрузка вопросов...</Typography>
                  ) : (
                    renderQuestionList()
                  )}
                </Stack>
              ) : (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {sectionLoading ? (
                    <Typography color="text.secondary">Загрузка билетов...</Typography>
                  ) : (
                    renderTicketTiles(sectionTickets, false, true)
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Готовые билеты</Typography>
            {renderTicketTiles(allTickets, true, false)}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isQuestionDialogOpen && Boolean(selectedQuestion)}
        onClose={handleCloseQuestionDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedQuestion && (
          <>
            <DialogTitle>Вопрос {selectedQuestionIndex + 1}</DialogTitle>
            <DialogContent dividers>
              <Typography sx={{ mb: 1 }}>{selectedQuestion.text}</Typography>

              {selectedQuestion.rule_reference && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Пункт: {selectedQuestion.rule_reference}
                </Typography>
              )}

              {selectedQuestion.image_url && (
                <Box
                  component="img"
                  src={getImageUrl(selectedQuestion.image_url)}
                  alt="Иллюстрация к вопросу"
                  sx={{
                    mt: 1.5,
                    maxWidth: '100%',
                    borderRadius: 2,
                    border: '1px solid #dbe5f8'
                  }}
                />
              )}

              <Box sx={{ mt: 2 }}>
                {Array.isArray(selectedQuestion.answers) && selectedQuestion.answers.length > 0 ? (
                  <FormControl>
                    <RadioGroup
                      value={selectedQuestionAnswerId}
                      onChange={(event) => setSelectedQuestionAnswerId(event.target.value)}
                    >
                      {selectedQuestion.answers.map((answer) => (
                        <FormControlLabel
                          key={answer.id}
                          value={answer.id}
                          control={<Radio />}
                          label={answer.text}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                ) : (
                  <Typography color="text.secondary">Для вопроса пока нет вариантов ответа.</Typography>
                )}

                {selectedQuestionAnswer && (
                  <Alert severity={selectedQuestionAnswer.is_correct ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                    {selectedQuestionAnswer.is_correct ? 'Верно' : 'Неверно'}
                  </Alert>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseQuestionDialog}>Закрыть</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
}

export default CatalogExplorer;
