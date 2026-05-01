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
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Tabs,
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
import AddIcon from '@mui/icons-material/Add';
import CasinoIcon from '@mui/icons-material/Casino';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from '../api/axios';

const INITIAL_QUESTION_EDIT = {
  id: null,
  text: '',
  sectionId: '',
  ticketId: '',
  ruleReference: '',
  explanation: '',
  answers: ['', ''],
  correctAnswer: 1,
  imageUrl: '',
  imageFile: null,
  removeImage: false
};

function AdminCatalogManager() {
  const [loading, setLoading] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [updatingSection, setUpdatingSection] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [updatingQuestion, setUpdatingQuestion] = useState(false);
  const [deletingQuestionRecordId, setDeletingQuestionRecordId] = useState(null);
  const [deletingSectionId, setDeletingSectionId] = useState(null);
  const [deletingTicketId, setDeletingTicketId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  const [sections, setSections] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [questionsPerTicket, setQuestionsPerTicket] = useState(10);
  const [alert, setAlert] = useState(null);

  const [tabKey, setTabKey] = useState('create');

  const [createSectionTitle, setCreateSectionTitle] = useState('');
  const [createTicketTitle, setCreateTicketTitle] = useState('');
  const [createTicketMaxMistakes, setCreateTicketMaxMistakes] = useState(2);
  const [createTicketSectionId, setCreateTicketSectionId] = useState('');

  const [isSectionModalOpen, setSectionModalOpen] = useState(false);
  const [isTicketModalOpen, setTicketModalOpen] = useState(false);
  const [isQuestionModalOpen, setQuestionModalOpen] = useState(false);

  const [editSectionData, setEditSectionData] = useState({ id: null, title: '' });
  const [editTicketData, setEditTicketData] = useState({
    id: null,
    title: '',
    sectionId: '',
    maxMistakesAllowed: 2
  });
  const [questionEditData, setQuestionEditData] = useState(INITIAL_QUESTION_EDIT);

  const [ticketEditorSectionId, setTicketEditorSectionId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [selectedTicketInfo, setSelectedTicketInfo] = useState(null);
  const [ticketQuestions, setTicketQuestions] = useState([]);
  const [ticketQuestionsLoading, setTicketQuestionsLoading] = useState(false);
  const [sectionQuestions, setSectionQuestions] = useState([]);
  const [sectionQuestionsLoading, setSectionQuestionsLoading] = useState(false);
  const [unassignedQuestions, setUnassignedQuestions] = useState([]);
  const [unassignedQuestionsLoading, setUnassignedQuestionsLoading] = useState(false);
  const [attachingQuestionId, setAttachingQuestionId] = useState(null);
  const [fillingTicketRandomly, setFillingTicketRandomly] = useState(false);

  const [sectionsPage, setSectionsPage] = useState(0);
  const [sectionsRowsPerPage, setSectionsRowsPerPage] = useState(10);
  const [ticketsPage, setTicketsPage] = useState(0);
  const [ticketsRowsPerPage, setTicketsRowsPerPage] = useState(10);
  const [ticketQuestionsPage, setTicketQuestionsPage] = useState(0);
  const [ticketQuestionsRowsPerPage, setTicketQuestionsRowsPerPage] = useState(10);
  const [sectionQuestionsPage, setSectionQuestionsPage] = useState(0);
  const [sectionQuestionsRowsPerPage, setSectionQuestionsRowsPerPage] = useState(10);
  const [unassignedQuestionsPage, setUnassignedQuestionsPage] = useState(0);
  const [unassignedQuestionsRowsPerPage, setUnassignedQuestionsRowsPerPage] = useState(10);

  const fetchMeta = async () => {
    setLoading(true);

    try {
      const response = await axios.get('/api/admin/questions/meta');
      setSections(response.data.sections || []);
      setTickets(response.data.tickets || []);
      setQuestionsPerTicket(response.data.questions_per_ticket || 10);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить темы и билеты'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketQuestions = async (ticketId) => {
    if (!ticketId) {
      setTicketQuestions([]);
      setSelectedTicketInfo(null);
      return;
    }

    setTicketQuestionsLoading(true);

    try {
      const response = await axios.get(`/api/admin/questions/tickets/${ticketId}/questions`);
      setTicketQuestions(response.data.questions || []);
      setSelectedTicketInfo(response.data.ticket || null);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить вопросы билета'
      });
      setTicketQuestions([]);
      setSelectedTicketInfo(null);
    } finally {
      setTicketQuestionsLoading(false);
    }
  };

  const fetchSectionQuestions = async (sectionId) => {
    if (!sectionId) {
      setSectionQuestions([]);
      return;
    }

    setSectionQuestionsLoading(true);

    try {
      const response = await axios.get(`/api/catalog/sections/${sectionId}/questions`);
      setSectionQuestions(response.data.questions || []);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить вопросы выбранной темы'
      });
      setSectionQuestions([]);
    } finally {
      setSectionQuestionsLoading(false);
    }
  };

  const fetchUnassignedQuestions = async (ticketId) => {
    if (!ticketId) {
      setUnassignedQuestions([]);
      return;
    }

    const targetTicket = tickets.find((ticket) => Number(ticket.id) === Number(ticketId));
    if (!targetTicket) {
      setUnassignedQuestions([]);
      return;
    }

    setUnassignedQuestionsLoading(true);

    try {
      const params = targetTicket.section_id ? `?sectionId=${targetTicket.section_id}` : '';
      const response = await axios.get(`/api/admin/questions/unassigned${params}`);
      setUnassignedQuestions(response.data.questions || []);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось загрузить неприкрепленные вопросы'
      });
      setUnassignedQuestions([]);
    } finally {
      setUnassignedQuestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const ticketsForEditor = useMemo(() => {
    if (!ticketEditorSectionId) {
      return tickets;
    }

    return tickets.filter((ticket) => Number(ticket.section_id) === Number(ticketEditorSectionId));
  }, [ticketEditorSectionId, tickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }

    const stillExists = ticketsForEditor.some((ticket) => Number(ticket.id) === Number(selectedTicketId));
    if (!stillExists) {
      setSelectedTicketId('');
      setTicketQuestions([]);
      setSelectedTicketInfo(null);
      setUnassignedQuestions([]);
    }
  }, [selectedTicketId, ticketsForEditor]);

  useEffect(() => {
    fetchSectionQuestions(ticketEditorSectionId);
  }, [ticketEditorSectionId]);

  useEffect(() => {
    setSectionsPage(0);
  }, [sections.length]);

  useEffect(() => {
    setTicketsPage(0);
  }, [tickets.length]);

  useEffect(() => {
    setTicketQuestionsPage(0);
  }, [ticketQuestions.length, selectedTicketId]);

  useEffect(() => {
    setSectionQuestionsPage(0);
  }, [sectionQuestions.length, ticketEditorSectionId]);

  useEffect(() => {
    setUnassignedQuestionsPage(0);
  }, [unassignedQuestions.length, selectedTicketId]);

  const editableQuestionTickets = useMemo(() => {
    if (!questionEditData.sectionId) {
      return tickets;
    }

    return tickets.filter((ticket) => Number(ticket.section_id) === Number(questionEditData.sectionId));
  }, [tickets, questionEditData.sectionId]);

  useEffect(() => {
    if (!questionEditData.ticketId) {
      return;
    }

    const stillAvailable = editableQuestionTickets.some(
      (ticket) => Number(ticket.id) === Number(questionEditData.ticketId)
    );

    if (!stillAvailable) {
      setQuestionEditData((prev) => ({ ...prev, ticketId: '' }));
    }
  }, [editableQuestionTickets, questionEditData.ticketId]);

  const correctAnswerOptions = useMemo(() => {
    return (questionEditData.answers || []).map((value, index) => ({
      value: index + 1,
      label: value && String(value).trim() ? `${index + 1}. ${value}` : `Ответ ${index + 1}`
    }));
  }, [questionEditData.answers]);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return null;
    }

    const strUrl = String(imageUrl).trim();
    if (!strUrl) {
      return null;
    }

    if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) {
      return strUrl;
    }

    if (strUrl.startsWith('/theme-images/')) {
      return strUrl;
    }

    if (strUrl.startsWith('/uploads/questions/')) {
      return strUrl;
    }

    return `/theme-images/${strUrl.replace(/^\/+/, '')}`;
  };

  const handleCreateSection = async (event) => {
    event.preventDefault();

    const title = String(createSectionTitle || '').trim();
    if (!title) {
      setAlert({ type: 'error', message: 'Введите название темы' });
      return;
    }

    setCreatingSection(true);
    setAlert(null);

    try {
      const response = await axios.post('/api/admin/questions/sections', { title });
      setAlert({ type: 'success', message: response.data.message || 'Тема создана' });
      setCreateSectionTitle('');
      await fetchMeta();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось создать тему'
      });
    } finally {
      setCreatingSection(false);
    }
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    const title = String(createTicketTitle || '').trim();
    const maxMistakesAllowed = Number(createTicketMaxMistakes);
    if (!createTicketSectionId) {
      setAlert({ type: 'error', message: 'Выберите тему' });
      return;
    }

    if (Number.isNaN(maxMistakesAllowed) || maxMistakesAllowed < 0 || maxMistakesAllowed > questionsPerTicket) {
      setAlert({
        type: 'error',
        message: `Максимум ошибок должен быть числом от 0 до ${questionsPerTicket}`
      });
      return;
    }

    setCreatingTicket(true);
    setAlert(null);

    try {
      const response = await axios.post('/api/admin/questions/tickets', {
        title,
        sectionId: createTicketSectionId,
        maxMistakesAllowed
      });

      setAlert({ type: 'success', message: response.data.message || 'Билет создан' });
      setCreateTicketTitle('');
      setCreateTicketSectionId('');
      setCreateTicketMaxMistakes(2);
      await fetchMeta();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось создать билет'
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  const openSectionEditor = (section) => {
    setEditSectionData({ id: section.id, title: section.title || '' });
    setSectionModalOpen(true);
  };

  const handleUpdateSection = async () => {
    const title = String(editSectionData.title || '').trim();
    if (!editSectionData.id || !title) {
      setAlert({ type: 'error', message: 'Введите корректное название темы' });
      return;
    }

    setUpdatingSection(true);
    setAlert(null);

    try {
      const response = await axios.put(`/api/admin/questions/sections/${editSectionData.id}`, { title });

      setAlert({ type: 'success', message: response.data.message || 'Тема обновлена' });
      setSectionModalOpen(false);
      setEditSectionData({ id: null, title: '' });
      await fetchMeta();
      if (selectedTicketId) {
        await fetchTicketQuestions(selectedTicketId);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось обновить тему'
      });
    } finally {
      setUpdatingSection(false);
    }
  };

  const openTicketEditor = (ticket) => {
    setEditTicketData({
      id: ticket.id,
      title: ticket.title || '',
      sectionId: ticket.section_id || '',
      maxMistakesAllowed: Number(ticket.max_mistakes_allowed ?? 2)
    });
    setTicketModalOpen(true);
  };

  const handleUpdateTicket = async () => {
    const title = String(editTicketData.title || '').trim();
    const maxMistakesAllowed = Number(editTicketData.maxMistakesAllowed);
    if (!editTicketData.id || !editTicketData.sectionId) {
      setAlert({ type: 'error', message: 'Заполните тему билета' });
      return;
    }

    if (Number.isNaN(maxMistakesAllowed) || maxMistakesAllowed < 0 || maxMistakesAllowed > questionsPerTicket) {
      setAlert({
        type: 'error',
        message: `Максимум ошибок должен быть числом от 0 до ${questionsPerTicket}`
      });
      return;
    }

    setUpdatingTicket(true);
    setAlert(null);

    try {
      const response = await axios.put(`/api/admin/questions/tickets/${editTicketData.id}`, {
        title,
        sectionId: editTicketData.sectionId,
        maxMistakesAllowed
      });

      setAlert({ type: 'success', message: response.data.message || 'Билет обновлен' });
      setTicketModalOpen(false);
      setEditTicketData({ id: null, title: '', sectionId: '', maxMistakesAllowed: 2 });
      await fetchMeta();
      if (selectedTicketId) {
        await fetchTicketQuestions(selectedTicketId);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось обновить билет'
      });
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleFillTicketWithRandomQuestions = async () => {
    if (!selectedTicketId || !selectedTicketInfo) {
      setAlert({ type: 'error', message: 'Сначала выберите билет' });
      return;
    }

    const requiredQuestions = Number(selectedTicketInfo.questions_required || questionsPerTicket);
    const currentQuestionsCount = Number(selectedTicketInfo.questions_count || 0);
    const remainingSlots = Math.max(requiredQuestions - currentQuestionsCount, 0);

    if (remainingSlots <= 0) {
      setAlert({ type: 'info', message: 'Билет уже заполнен' });
      return;
    }

    if (!Array.isArray(unassignedQuestions) || unassignedQuestions.length === 0) {
      setAlert({ type: 'error', message: 'Нет доступных вопросов для заполнения билета' });
      return;
    }

    const shuffledQuestions = [...unassignedQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, remainingSlots);

    setFillingTicketRandomly(true);
    setAlert(null);

    try {
      let attachedCount = 0;

      for (const question of shuffledQuestions) {
        await axios.post(`/api/admin/questions/tickets/${selectedTicketId}/questions/${question.id}`);
        attachedCount += 1;
      }

      await fetchMeta();
      await fetchTicketQuestions(selectedTicketId);
      await fetchUnassignedQuestions(selectedTicketId);

      setAlert({
        type: 'success',
        message: attachedCount > 0
          ? `В билет добавлено случайных вопросов: ${attachedCount}`
          : 'Случайные вопросы не были добавлены'
      });
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось заполнить билет случайными вопросами'
      });
    } finally {
      setFillingTicketRandomly(false);
    }
  };

  const handleDeleteSection = async (section) => {
    if (!section?.id) {
      return;
    }

    const approved = window.confirm(
      `Удалить тему "${section.title}"?\n\nЕсли в теме есть билеты, удаление будет отклонено.`
    );

    if (!approved) {
      return;
    }

    setDeletingSectionId(section.id);
    setAlert(null);

    try {
      const response = await axios.delete(`/api/admin/questions/sections/${section.id}`);
      setAlert({ type: 'success', message: response.data.message || 'Тема удалена' });
      await fetchMeta();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось удалить тему'
      });
    } finally {
      setDeletingSectionId(null);
    }
  };

  const handleDeleteTicket = async (ticket) => {
    if (!ticket?.id) {
      return;
    }

    const approved = window.confirm(
      `Удалить билет "${ticket.title || `Билет ${ticket.id}`}"?\n\nВопросы останутся в базе, но будут откреплены от этого билета.`
    );

    if (!approved) {
      return;
    }

    setDeletingTicketId(ticket.id);
    setAlert(null);

    try {
      const response = await axios.delete(`/api/admin/questions/tickets/${ticket.id}`);
      setAlert({ type: 'success', message: response.data.message || 'Билет удален' });

      if (Number(selectedTicketId) === Number(ticket.id)) {
        setSelectedTicketId('');
        setSelectedTicketInfo(null);
        setTicketQuestions([]);
        setUnassignedQuestions([]);
      }

      await fetchMeta();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось удалить билет'
      });
    } finally {
      setDeletingTicketId(null);
    }
  };

  const openQuestionEditor = (question) => {
    const answers = Array.isArray(question.answers) ? question.answers.map((answer) => answer.text) : [];
    const preparedAnswers = answers.length >= 2 ? answers : [...answers, '', ''].slice(0, 2);

    const correctAnswerIndex = Array.isArray(question.answers)
      ? question.answers.findIndex((answer) => answer.is_correct) + 1
      : 1;

    setQuestionEditData({
      id: question.id,
      text: question.text || '',
      sectionId: question.section_id || selectedTicketInfo?.section_id || '',
      ticketId: question.ticket_id || selectedTicketInfo?.id || '',
      ruleReference: question.rule_reference || '',
      explanation: question.explanation || '',
      answers: preparedAnswers,
      correctAnswer: correctAnswerIndex > 0 ? correctAnswerIndex : 1,
      imageUrl: question.image_url || '',
      imageFile: null,
      removeImage: false
    });

    setQuestionModalOpen(true);
  };

  const updateQuestionField = (field, value) => {
    setQuestionEditData((prev) => ({ ...prev, [field]: value }));
  };

  const updateQuestionAnswer = (index, value) => {
    setQuestionEditData((prev) => {
      const nextAnswers = [...prev.answers];
      nextAnswers[index] = value;
      return { ...prev, answers: nextAnswers };
    });
  };

  const addQuestionAnswer = () => {
    setQuestionEditData((prev) => {
      if (prev.answers.length >= 6) {
        return prev;
      }
      return { ...prev, answers: [...prev.answers, ''] };
    });
  };

  const removeQuestionAnswer = (index) => {
    setQuestionEditData((prev) => {
      if (prev.answers.length <= 2) {
        return prev;
      }

      const nextAnswers = prev.answers.filter((_, answerIndex) => answerIndex !== index);
      const nextCorrectAnswer = Math.min(prev.correctAnswer, nextAnswers.length);

      return {
        ...prev,
        answers: nextAnswers,
        correctAnswer: Math.max(nextCorrectAnswer, 1)
      };
    });
  };

  const canSelectTicketInQuestionEditor = (ticket) => {
    if (!ticket) {
      return false;
    }

    if (!ticket.can_add_questions && Number(ticket.id) !== Number(questionEditData.ticketId)) {
      return false;
    }

    return true;
  };

  const handleEditQuestionImageChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    setQuestionEditData((prev) => ({
      ...prev,
      imageFile: file,
      removeImage: file ? false : prev.removeImage
    }));
  };

  const handleRemoveEditQuestionImage = () => {
    setQuestionEditData((prev) => ({
      ...prev,
      imageFile: null,
      removeImage: true,
      imageUrl: ''
    }));
  };

  const handleCancelRemoveEditQuestionImage = () => {
    setQuestionEditData((prev) => ({
      ...prev,
      removeImage: false
    }));
  };

  const handleUpdateQuestion = async () => {
    if (!questionEditData.id) {
      return;
    }

    const preparedAnswers = (questionEditData.answers || [])
      .map((item) => (item || '').trim())
      .filter(Boolean);

    if (!questionEditData.text.trim()) {
      setAlert({ type: 'error', message: 'Введите текст вопроса' });
      return;
    }

    if (!questionEditData.sectionId) {
      setAlert({ type: 'error', message: 'Выберите тему вопроса' });
      return;
    }

    if (preparedAnswers.length < 2 || preparedAnswers.length > 6) {
      setAlert({ type: 'error', message: 'Укажите от 2 до 6 непустых вариантов ответов' });
      return;
    }

    if (!questionEditData.correctAnswer || questionEditData.correctAnswer > preparedAnswers.length) {
      setAlert({ type: 'error', message: 'Выберите корректный номер правильного ответа' });
      return;
    }

    setUpdatingQuestion(true);
    setAlert(null);

    try {
      const formData = new FormData();
      formData.append('text', questionEditData.text.trim());
      formData.append('sectionId', String(questionEditData.sectionId));
      formData.append('answers', JSON.stringify(preparedAnswers));
      formData.append('correctAnswer', String(questionEditData.correctAnswer));

      if (questionEditData.ticketId) {
        formData.append('ticketId', String(questionEditData.ticketId));
      }

      if (questionEditData.ruleReference && questionEditData.ruleReference.trim()) {
        formData.append('ruleReference', questionEditData.ruleReference.trim());
      }

      if (questionEditData.explanation && questionEditData.explanation.trim()) {
        formData.append('explanation', questionEditData.explanation.trim());
      }

      if (questionEditData.imageFile) {
        formData.append('image', questionEditData.imageFile);
      }

      if (questionEditData.removeImage) {
        formData.append('removeImage', 'true');
      }

      const response = await axios.put(`/api/admin/questions/${questionEditData.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAlert({ type: 'success', message: response.data.message || 'Вопрос обновлен' });
      setQuestionModalOpen(false);
      setQuestionEditData(INITIAL_QUESTION_EDIT);
      await fetchMeta();
      if (selectedTicketId) {
        await fetchTicketQuestions(selectedTicketId);
        await fetchUnassignedQuestions(selectedTicketId);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось обновить вопрос'
      });
    } finally {
      setUpdatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionEditData.id) {
      return;
    }

    const approved = window.confirm(
      `Удалить вопрос #${questionEditData.id}?

Вопрос будет удален из базы вместе с ответами и связями с темами/билетами.`
    );

    if (!approved) {
      return;
    }

    setDeletingQuestionRecordId(questionEditData.id);
    setAlert(null);

    try {
      const response = await axios.delete(`/api/admin/questions/${questionEditData.id}`);

      setAlert({ type: 'success', message: response.data.message || 'Вопрос удален' });
      setQuestionModalOpen(false);
      setQuestionEditData(INITIAL_QUESTION_EDIT);
      await fetchMeta();

      if (selectedTicketId) {
        await fetchTicketQuestions(selectedTicketId);
        await fetchUnassignedQuestions(selectedTicketId);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось удалить вопрос'
      });
    } finally {
      setDeletingQuestionRecordId(null);
    }
  };

  const handleRemoveQuestionFromTicket = async (question) => {
    if (!selectedTicketId || !question?.id) {
      return;
    }

    const approved = window.confirm('Удалить вопрос из выбранного билета?');
    if (!approved) {
      return;
    }

    setDeletingQuestionId(question.id);
    setAlert(null);

    try {
      const response = await axios.delete(
        `/api/admin/questions/tickets/${selectedTicketId}/questions/${question.id}`
      );

      setAlert({ type: 'success', message: response.data.message || 'Вопрос удален из билета' });

      if (isQuestionModalOpen && Number(questionEditData.id) === Number(question.id)) {
        setQuestionModalOpen(false);
        setQuestionEditData(INITIAL_QUESTION_EDIT);
      }

      await fetchMeta();
      await fetchTicketQuestions(selectedTicketId);
      await fetchUnassignedQuestions(selectedTicketId);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось удалить вопрос из билета'
      });
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleAttachQuestionToTicket = async (question) => {
    if (!selectedTicketId || !question?.id) {
      return;
    }

    setAttachingQuestionId(question.id);
    setAlert(null);

    try {
      const response = await axios.post(
        `/api/admin/questions/tickets/${selectedTicketId}/questions/${question.id}`
      );

      setAlert({ type: 'success', message: response.data.message || 'Вопрос добавлен в билет' });
      await fetchMeta();
      await fetchTicketQuestions(selectedTicketId);
      await fetchUnassignedQuestions(selectedTicketId);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось добавить вопрос в билет'
      });
    } finally {
      setAttachingQuestionId(null);
    }
  };

  const renderStatusChip = (isComplete, questionsCount, questionsRequired) => {
    if (isComplete) {
      return <Chip color="success" label="Готов" size="small" />;
    }

    return <Chip color="warning" label={`${questionsCount}/${questionsRequired || questionsPerTicket}`} size="small" />;
  };

  const paginatedSections = useMemo(() => {
    const start = sectionsPage * sectionsRowsPerPage;
    return sections.slice(start, start + sectionsRowsPerPage);
  }, [sections, sectionsPage, sectionsRowsPerPage]);

  const paginatedTickets = useMemo(() => {
    const start = ticketsPage * ticketsRowsPerPage;
    return tickets.slice(start, start + ticketsRowsPerPage);
  }, [tickets, ticketsPage, ticketsRowsPerPage]);

  const paginatedTicketQuestions = useMemo(() => {
    const start = ticketQuestionsPage * ticketQuestionsRowsPerPage;
    return ticketQuestions.slice(start, start + ticketQuestionsRowsPerPage);
  }, [ticketQuestions, ticketQuestionsPage, ticketQuestionsRowsPerPage]);

  const paginatedSectionQuestions = useMemo(() => {
    const start = sectionQuestionsPage * sectionQuestionsRowsPerPage;
    return sectionQuestions.slice(start, start + sectionQuestionsRowsPerPage);
  }, [sectionQuestions, sectionQuestionsPage, sectionQuestionsRowsPerPage]);

  const paginatedUnassignedQuestions = useMemo(() => {
    const start = unassignedQuestionsPage * unassignedQuestionsRowsPerPage;
    return unassignedQuestions.slice(start, start + unassignedQuestionsRowsPerPage);
  }, [unassignedQuestions, unassignedQuestionsPage, unassignedQuestionsRowsPerPage]);

  const handleDeleteQuestionDirectly = async (question) => {
    if (!question?.id) {
      return;
    }

    const approved = window.confirm(
      `Удалить вопрос #${question.id} из базы?\n\nВопрос будет удален вместе с ответами и связями с темами/билетами.`
    );

    if (!approved) {
      return;
    }

    setDeletingQuestionRecordId(question.id);
    setAlert(null);

    try {
      const response = await axios.delete(`/api/admin/questions/${question.id}`);
      setAlert({ type: 'success', message: response.data.message || 'Вопрос удален из базы' });

      if (isQuestionModalOpen && Number(questionEditData.id) === Number(question.id)) {
        setQuestionModalOpen(false);
        setQuestionEditData(INITIAL_QUESTION_EDIT);
      }

      await fetchMeta();
      if (ticketEditorSectionId) {
        await fetchSectionQuestions(ticketEditorSectionId);
      }
      if (selectedTicketId) {
        await fetchTicketQuestions(selectedTicketId);
        await fetchUnassignedQuestions(selectedTicketId);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Не удалось удалить вопрос из базы'
      });
    } finally {
      setDeletingQuestionRecordId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Темы, билеты и содержимое</Typography>
        <Typography variant="body2" color="text.secondary">Каждый билет должен содержать ровно {questionsPerTicket} вопросов.</Typography>
      </Box>

      {alert && (
        <Alert severity={alert.type === 'error' ? 'error' : 'success'} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Tabs value={tabKey} onChange={(_, value) => setTabKey(value)} variant="scrollable" scrollButtons="auto">
        <Tab value="create" label="Создание" />
        <Tab value="structure" label="Темы и билеты" />
        <Tab value="content" label="Содержимое билетов" />
      </Tabs>

      {tabKey === 'create' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Создать тему
              </Typography>

              <Box component="form" onSubmit={handleCreateSection}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Название темы"
                    value={createSectionTitle}
                    onChange={(event) => setCreateSectionTitle(event.target.value)}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={creatingSection || loading || (questionEditData?.answers?.length >= 6)}
                  >
                    {creatingSection ? 'Создание...' : 'Создать тему'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Создать билет</Typography>
              <Box component="form" onSubmit={handleCreateTicket}>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="create-ticket-section">Тема</InputLabel>
                    <Select
                      labelId="create-ticket-section"
                      label="Тема"
                      value={createTicketSectionId}
                      onChange={(event) => setCreateTicketSectionId(event.target.value)}
                    >
                      {sections.map((section) => (
                        <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Название билета"
                    value={createTicketTitle}
                    onChange={(event) => setCreateTicketTitle(event.target.value)}
                  />

                  <TextField
                    type="number"
                    label="Максимум неверных ответов"
                    value={createTicketMaxMistakes}
                    onChange={(event) => setCreateTicketMaxMistakes(Number(event.target.value))}
                    inputProps={{ min: 0, max: questionsPerTicket }}
                  />

                  <Button type="submit" variant="contained" disabled={creatingTicket || loading}>
                    {creatingTicket ? 'Создание...' : 'Создать билет'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {tabKey === 'structure' && (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Список тем</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={90}>ID</TableCell>
                      <TableCell>Название темы</TableCell>
                      <TableCell align="right" width={260}>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSections.map((section) => (
                      <TableRow key={section.id} hover>
                        <TableCell>{section.id}</TableCell>
                        <TableCell>{section.title}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => openSectionEditor(section)}>
                              Редактировать
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              disabled={Number(deletingSectionId) === Number(section.id)}
                              onClick={() => handleDeleteSection(section)}
                            >
                              {Number(deletingSectionId) === Number(section.id) ? 'Удаление...' : 'Удалить'}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={sections.length}
                page={sectionsPage}
                onPageChange={(_, nextPage) => setSectionsPage(nextPage)}
                rowsPerPage={sectionsRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setSectionsRowsPerPage(Number(event.target.value));
                  setSectionsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                labelRowsPerPage="На странице"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Список билетов</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={90}>ID</TableCell>
                      <TableCell>Название билета</TableCell>
                      <TableCell>Тема</TableCell>
                      <TableCell width={130}>Макс. ошибок</TableCell>
                      <TableCell width={120}>Вопросов</TableCell>
                      <TableCell width={120}>Статус</TableCell>
                      <TableCell align="right" width={260}>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTickets.map((ticket) => (
                      <TableRow key={ticket.id} hover>
                        <TableCell>{ticket.id}</TableCell>
                        <TableCell>{ticket.title || `Билет ${ticket.id}`}</TableCell>
                        <TableCell>{ticket.section_title || 'Без темы'}</TableCell>
                        <TableCell>{ticket.max_mistakes_allowed ?? 2}</TableCell>
                        <TableCell>{ticket.questions_count}/{ticket.questions_required || questionsPerTicket}</TableCell>
                        <TableCell>{renderStatusChip(ticket.is_complete, ticket.questions_count, ticket.questions_required)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => openTicketEditor(ticket)}>
                              Редактировать
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              disabled={Number(deletingTicketId) === Number(ticket.id)}
                              onClick={() => handleDeleteTicket(ticket)}
                            >
                              {Number(deletingTicketId) === Number(ticket.id) ? 'Удаление...' : 'Удалить'}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={tickets.length}
                page={ticketsPage}
                onPageChange={(_, nextPage) => setTicketsPage(nextPage)}
                rowsPerPage={ticketsRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setTicketsRowsPerPage(Number(event.target.value));
                  setTicketsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                labelRowsPerPage="На странице"
              />
            </CardContent>
          </Card>
        </Stack>
      )}

      {tabKey === 'content' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Редактирование содержимого билета</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 8fr) minmax(0, 16fr)' },
                gap: 2,
                mb: 2
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="ticket-filter-section">Фильтр по теме</InputLabel>
                <Select
                  labelId="ticket-filter-section"
                  label="Фильтр по теме"
                  value={ticketEditorSectionId}
                  onChange={(event) => setTicketEditorSectionId(event.target.value)}
                >
                  <MenuItem value=""><em>Все темы</em></MenuItem>
                  {sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="ticket-content-select">Билет</InputLabel>
                <Select
                  labelId="ticket-content-select"
                  label="Билет"
                  value={selectedTicketId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedTicketId(value);
                    fetchTicketQuestions(value);
                    fetchUnassignedQuestions(value);
                  }}
                >
                  <MenuItem value=""><em>Не выбран</em></MenuItem>
                  {ticketsForEditor.map((ticket) => (
                    <MenuItem key={ticket.id} value={ticket.id}>
                      {(ticket.title || `Билет ${ticket.id}`)
                        + ` (${ticket.questions_count}/${ticket.questions_required})`
                        + ` - ${ticket.section_title || 'Без темы'}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {selectedTicketInfo && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                <Typography fontWeight={700}>{selectedTicketInfo.title || `Билет ${selectedTicketInfo.id}`}</Typography>
                {renderStatusChip(
                  selectedTicketInfo.is_complete,
                  selectedTicketInfo.questions_count,
                  selectedTicketInfo.questions_required
                )}
                <Button
                  variant="outlined"
                  startIcon={<CasinoIcon />}
                  onClick={handleFillTicketWithRandomQuestions}
                  disabled={fillingTicketRandomly || ticketQuestionsLoading || unassignedQuestionsLoading}
                >
                  {fillingTicketRandomly ? 'Заполнение...' : 'Заполнить случайными вопросами'}
                </Button>
              </Stack>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                gap: 2,
                alignItems: 'start'
              }}
            >
              <Box>
                <Typography variant="h6" gutterBottom>Вопросы выбранного билета</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width={80}>ID</TableCell>
                        <TableCell>Вопрос</TableCell>
                        <TableCell width={100}>Ответов</TableCell>
                        <TableCell width={130}>Пункт ПДД</TableCell>
                        <TableCell align="right" width={220}>Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedTicketQuestions.map((question) => (
                        <TableRow key={question.id} hover>
                          <TableCell>{question.id}</TableCell>
                          <TableCell>
                            {String(question.text || '').length > 110
                              ? `${String(question.text || '').slice(0, 110)}...`
                              : (question.text || '')}
                          </TableCell>
                          <TableCell>{Array.isArray(question.answers) ? question.answers.length : 0}</TableCell>
                          <TableCell>{question.rule_reference || '-'}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button size="small" startIcon={<EditIcon />} onClick={() => openQuestionEditor(question)}>
                                Изменить
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                disabled={Number(deletingQuestionId) === Number(question.id)}
                                onClick={() => handleRemoveQuestionFromTicket(question)}
                              >
                                {Number(deletingQuestionId) === Number(question.id) ? 'Удаление...' : 'Удалить'}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}

                      {!ticketQuestionsLoading && ticketQuestions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Typography variant="body2" color="text.secondary">
                              {selectedTicketId
                                ? 'В выбранном билете пока нет вопросов'
                                : 'Выберите билет, чтобы редактировать его содержимое'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={ticketQuestions.length}
                  page={ticketQuestionsPage}
                  onPageChange={(_, nextPage) => setTicketQuestionsPage(nextPage)}
                  rowsPerPage={ticketQuestionsRowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setTicketQuestionsRowsPerPage(Number(event.target.value));
                    setTicketQuestionsPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  labelRowsPerPage="На странице"
                />
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>Неприкрепленные вопросы</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={80}>ID</TableCell>
                      <TableCell>Вопрос</TableCell>
                      <TableCell width={130}>Пункт ПДД</TableCell>
                      <TableCell width={130}>Ответов</TableCell>
                      <TableCell align="right" width={180}>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUnassignedQuestions.map((question) => (
                      <TableRow key={`unassigned-${question.id}`} hover>
                        <TableCell>{question.id}</TableCell>
                        <TableCell>
                          {String(question.text || '').length > 110
                            ? `${String(question.text || '').slice(0, 110)}...`
                            : (question.text || '')}
                        </TableCell>
                        <TableCell>{question.rule_reference || '-'}</TableCell>
                        <TableCell>{question.answers_count || 0}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            disabled={!selectedTicketId || Number(attachingQuestionId) === Number(question.id)}
                            onClick={() => handleAttachQuestionToTicket(question)}
                          >
                            {Number(attachingQuestionId) === Number(question.id) ? 'Добавление...' : 'Добавить в билет'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!unassignedQuestionsLoading && unassignedQuestions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">
                            {selectedTicketId
                              ? 'Нет неприкрепленных вопросов для темы выбранного билета'
                              : 'Сначала выберите билет, чтобы добавить в него неприкрепленные вопросы'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {unassignedQuestionsLoading && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">Загрузка неприкрепленных вопросов...</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={unassignedQuestions.length}
                page={unassignedQuestionsPage}
                onPageChange={(_, nextPage) => setUnassignedQuestionsPage(nextPage)}
                rowsPerPage={unassignedQuestionsRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setUnassignedQuestionsRowsPerPage(Number(event.target.value));
                  setUnassignedQuestionsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                labelRowsPerPage="На странице"
              />
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Все вопросы выбранной темы</Typography>

              {!ticketEditorSectionId ? (
                <Typography variant="body2" color="text.secondary">
                  Выберите тему, чтобы увидеть все вопросы и удалить их из базы.
                </Typography>
              ) : sectionQuestionsLoading ? (
                <Typography variant="body2" color="text.secondary">Загрузка вопросов темы...</Typography>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={80}>ID</TableCell>
                          <TableCell>Вопрос</TableCell>
                          <TableCell width={100}>Ответов</TableCell>
                          <TableCell width={130}>Пункт ПДД</TableCell>
                          <TableCell align="right" width={200}>Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedSectionQuestions.map((question) => (
                          <TableRow key={`section-question-${question.id}`} hover>
                            <TableCell>{question.id}</TableCell>
                            <TableCell>
                              {String(question.text || '').length > 110
                                ? `${String(question.text || '').slice(0, 110)}...`
                                : (question.text || '')}
                            </TableCell>
                            <TableCell>{Array.isArray(question.answers) ? question.answers.length : 0}</TableCell>
                            <TableCell>{question.rule_reference || '-'}</TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="text"
                                color="inherit"
                                startIcon={<DeleteIcon fontSize="small" />}
                                disabled={Number(deletingQuestionRecordId) === Number(question.id)}
                                onClick={() => handleDeleteQuestionDirectly(question)}
                                sx={{ color: 'text.secondary' }}
                              >
                                {Number(deletingQuestionRecordId) === Number(question.id) ? 'Удаление...' : 'Удалить'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!sectionQuestionsLoading && sectionQuestions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography variant="body2" color="text.secondary">
                                В выбранной теме пока нет вопросов.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={sectionQuestions.length}
                    page={sectionQuestionsPage}
                    onPageChange={(_, nextPage) => setSectionQuestionsPage(nextPage)}
                    rowsPerPage={sectionQuestionsRowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setSectionQuestionsRowsPerPage(Number(event.target.value));
                      setSectionQuestionsPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 20, 50]}
                    labelRowsPerPage="На странице"
                  />
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      <Dialog open={isSectionModalOpen} onClose={() => setSectionModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редактировать тему</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Название темы"
            value={editSectionData.title}
            onChange={(event) => setEditSectionData((prev) => ({ ...prev, title: event.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionModalOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleUpdateSection} disabled={updatingSection}>
            {updatingSection ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isTicketModalOpen} onClose={() => setTicketModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редактировать билет</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="edit-ticket-section">Тема</InputLabel>
              <Select
                labelId="edit-ticket-section"
                label="Тема"
                value={editTicketData.sectionId}
                onChange={(event) => setEditTicketData((prev) => ({ ...prev, sectionId: event.target.value }))}
              >
                {sections.map((section) => (
                  <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Название билета"
              value={editTicketData.title}
              onChange={(event) => setEditTicketData((prev) => ({ ...prev, title: event.target.value }))}
            />

            <TextField
              fullWidth
              type="number"
              label="Максимум неверных ответов"
              value={editTicketData.maxMistakesAllowed}
              onChange={(event) => setEditTicketData((prev) => ({ ...prev, maxMistakesAllowed: Number(event.target.value) }))}
              inputProps={{ min: 0, max: questionsPerTicket }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTicketModalOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleUpdateTicket} disabled={updatingTicket}>
            {updatingTicket ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isQuestionModalOpen} onClose={() => setQuestionModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Редактировать вопрос</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="edit-question-section">Тема</InputLabel>
              <Select
                labelId="edit-question-section"
                label="Тема"
                value={questionEditData.sectionId}
                onChange={(event) => updateQuestionField('sectionId', event.target.value)}
              >
                {sections.map((section) => (
                  <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="edit-question-ticket">Билет</InputLabel>
              <Select
                labelId="edit-question-ticket"
                label="Билет"
                value={questionEditData.ticketId}
                onChange={(event) => updateQuestionField('ticketId', event.target.value)}
              >
                <MenuItem value=""><em>Убрать из билета</em></MenuItem>
                {editableQuestionTickets.map((ticket) => (
                  <MenuItem
                    key={ticket.id}
                    value={ticket.id}
                    disabled={!canSelectTicketInQuestionEditor(ticket)}
                  >
                    {(ticket.title || `Билет ${ticket.id}`)
                      + ` (${ticket.questions_count}/${ticket.questions_required})`
                      + ` - ${ticket.section_title || 'Без темы'}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Текст вопроса"
              multiline
              rows={4}
              value={questionEditData.text}
              onChange={(event) => updateQuestionField('text', event.target.value)}
            />

            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                  Заменить изображение
                  <input
                    hidden
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleEditQuestionImageChange}
                  />
                </Button>

                {questionEditData.removeImage ? (
                  <Button
                    color="inherit"
                    variant="outlined"
                    onClick={handleCancelRemoveEditQuestionImage}
                  >
                    Отменить удаление изображения
                  </Button>
                ) : (
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveEditQuestionImage}
                    disabled={!questionEditData.imageFile && !questionEditData.imageUrl}
                  >
                    Удалить изображение
                  </Button>
                )}
              </Stack>

              {questionEditData.imageFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Выбран файл: {questionEditData.imageFile.name}
                </Typography>
              )}

              {questionEditData.removeImage && !questionEditData.imageFile && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Изображение будет удалено после сохранения.
                </Typography>
              )}

              {!questionEditData.removeImage && !questionEditData.imageFile && questionEditData.imageUrl && (
                <Box
                  component="img"
                  src={getImageUrl(questionEditData.imageUrl)}
                  alt="Текущее изображение вопроса"
                  sx={{ mt: 1, maxWidth: '100%', maxHeight: 260, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                />
              )}
            </Box>

            <Box>
              <Typography fontWeight={600} sx={{ mb: 1 }}>Варианты ответов</Typography>
              <Stack spacing={1.5}>
                {questionEditData.answers.map((answer, index) => (
                  <Stack key={`edit-answer-${index + 1}`} direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      label={`Вариант ответа ${index + 1}`}
                      value={answer}
                      onChange={(event) => updateQuestionAnswer(index, event.target.value)}
                    />

                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={() => removeQuestionAnswer(index)}
                      disabled={questionEditData.answers.length <= 2}
                    >
                      Удалить
                    </Button>
                  </Stack>
                ))}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addQuestionAnswer}
                  disabled={questionEditData.answers.length >= 6}
                >
                  Добавить вариант
                </Button>
              </Stack>
            </Box>

            <FormControl>
              <Typography fontWeight={600} sx={{ mb: 1 }}>Правильный ответ</Typography>
              <RadioGroup
                value={questionEditData.correctAnswer}
                onChange={(event) => updateQuestionField('correctAnswer', Number(event.target.value))}
              >
                {correctAnswerOptions.map((option) => (
                  <Box key={option.value} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Radio value={option.value} />
                    <Typography variant="body2">{option.label}</Typography>
                  </Box>
                ))}
              </RadioGroup>
            </FormControl>

            <TextField
              label="Пункт ПДД"
              inputProps={{ maxLength: 50 }}
              value={questionEditData.ruleReference}
              onChange={(event) => updateQuestionField('ruleReference', event.target.value)}
            />

            <TextField
              label="Пояснение"
              multiline
              rows={3}
              value={questionEditData.explanation}
              onChange={(event) => updateQuestionField('explanation', event.target.value)}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setQuestionModalOpen(false)}>Отмена</Button>
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteQuestion}
            disabled={updatingQuestion || Number(deletingQuestionRecordId) === Number(questionEditData.id)}
          >
            {Number(deletingQuestionRecordId) === Number(questionEditData.id) ? 'Удаление...' : 'Удалить'}
          </Button>
          <Button variant="contained" onClick={handleUpdateQuestion} disabled={updatingQuestion}>
            {updatingQuestion ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default AdminCatalogManager;

