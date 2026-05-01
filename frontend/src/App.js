import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';
import Auth from './components/Auth';
import UserList from './components/UserList';
import UserStats from './components/UserStats';
import AdminQuestionForm from './components/AdminQuestionForm';
import AdminCatalogManager from './components/AdminCatalogManager';
import AdminExamManager from './components/AdminExamManager';
import CatalogExplorer from './components/CatalogExplorer';
import TicketPractice from './components/TicketPractice';
import ExamPractice from './components/ExamPractice';
import axios from './api/axios';

const pddTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d6a71',
      dark: '#08464b',
      light: '#39a0a6'
    },
    secondary: {
      main: '#ef7f2d',
      dark: '#b95d1d',
      light: '#f7ae61'
    },
    error: {
      main: '#c8393f'
    },
    background: {
      default: '#f4f1ea',
      paper: '#fffcf8'
    },
    text: {
      primary: '#1d2a2e',
      secondary: '#4a585e'
    }
  },
  shape: {
    borderRadius: 16
  },
  typography: {
    htmlFontSize: 15,
    fontFamily: 'Manrope, Rubik, PT Sans, Segoe UI, sans-serif',
    h1: {
      fontSize: '2.08rem',
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    h2: {
      fontSize: '1.76rem',
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    h4: {
      fontSize: '1.32rem',
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    h5: {
      fontSize: '1.16rem',
      lineHeight: 1.28,
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    h6: {
      fontSize: '1.03rem',
      lineHeight: 1.34,
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.84rem',
      lineHeight: 1.46
    },
    subtitle1: {
      fontSize: '0.95rem'
    },
    subtitle2: {
      fontSize: '0.84rem'
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4
    },
    button: {
      fontSize: '0.84rem',
      fontWeight: 700,
      textTransform: 'none'
    }
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          minHeight: 34,
          paddingInline: 14,
          borderRadius: 999,
          letterSpacing: '0.01em',
          boxShadow: 'none'
        },
        contained: {
          boxShadow: '0 10px 22px rgba(13, 106, 113, 0.22)'
        },
        outlined: {
          borderWidth: 1.5
        }
      }
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          borderRadius: 10
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: '#c7d5d9'
        },
        root: {
          background: '#fffdf9'
        }
      }
    },
    MuiChip: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 10px',
          fontSize: '0.82rem'
        },
        head: {
          fontWeight: 700,
          color: '#244047',
          background: 'rgba(13, 106, 113, 0.06)'
        }
      }
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: {
          minHeight: 44,
          paddingLeft: 8,
          paddingRight: 8
        },
        selectLabel: {
          marginBottom: 0
        },
        displayedRows: {
          marginBottom: 0
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #dde5e8',
          boxShadow: '0 12px 28px rgba(35, 56, 63, 0.08)',
          background: '#fffdf9'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid #d9e3e5'
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '12px 16px'
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 16px'
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '10px 16px'
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 42
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          paddingTop: 8,
          paddingBottom: 8,
          fontSize: '0.82rem',
          fontWeight: 700
        }
      }
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: 4,
          paddingBottom: 4
        }
      }
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.88rem'
        },
        secondary: {
          fontSize: '0.8rem'
        }
      }
    }
  }
});

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog-sections');
  const [manageTab, setManageTab] = useState('catalog');
  const [ticketStartRequest, setTicketStartRequest] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const currentRole = currentUser?.role || currentUser?.Role?.name;
  const isAdmin = currentRole === 'admin';
  const isAuthTab = activeTab === 'auth';

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setActiveTab('catalog-sections');
    setManageTab('catalog');
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveTab('catalog-sections');
    setManageTab('catalog');
  };

  const handleRequireAuth = () => {
    setActiveTab('auth');
  };

  const handleRetakeTicket = (ticketId) => {
    if (!ticketId) {
      return;
    }

    setActiveTab('catalog-tickets');
    setTicketStartRequest({ ticketId: Number(ticketId), nonce: Date.now() });
  };

  const handleStartTicketFromCatalog = (ticketId) => {
    if (!currentUser) {
      handleRequireAuth();
      return;
    }

    if (!ticketId) {
      return;
    }

    setActiveTab('catalog-tickets');
    setTicketStartRequest({ ticketId: Number(ticketId), nonce: Date.now() });
  };

  const handleTicketStartRequestConsumed = () => {
    setTicketStartRequest(null);
  };

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const response = await axios.get('/api/users/profile');
        setCurrentUser(response.data);
        setActiveTab('catalog-sections');
      } catch (error) {
        localStorage.removeItem('token');
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab === 'manage') {
      setActiveTab('catalog-sections');
      return;
    }

    if (!currentUser && activeTab === 'stats') {
      setActiveTab('catalog-sections');
    }
  }, [activeTab, currentUser, isAdmin]);

  useEffect(() => {
    if (activeTab !== 'manage') {
      setManageTab('catalog');
    }
  }, [activeTab]);

  const topButtons = isAdmin
    ? [
      { key: 'catalog-sections', label: 'Темы' },
      { key: 'catalog-tickets', label: 'Билеты' },
      { key: 'exam', label: 'Экзамен' },
      { key: 'stats', label: 'Статистика' },
      { key: 'manage', label: 'Управление' }
    ]
    : currentUser
      ? [
        { key: 'catalog-sections', label: 'Темы' },
        { key: 'catalog-tickets', label: 'Билеты' },
        { key: 'exam', label: 'Экзамен' },
        { key: 'stats', label: 'Статистика' }
      ]
      : [
      { key: 'catalog-sections', label: 'Темы' },
      { key: 'catalog-tickets', label: 'Билеты' },
      { key: 'exam', label: 'Экзамен' },
      
      ];

  if (authChecking) {
    return (
      <ThemeProvider theme={pddTheme}>
        <CssBaseline />
        <Box className="loading-screen">
          <CircularProgress size={48} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={pddTheme}>
      <CssBaseline />
      <Box className="app-shell">
        <AppBar position="sticky" className="app-header" elevation={0}>
          <Toolbar className="app-toolbar">
            <Box className="header-left">
              <Box className="brand-block">
                <Typography variant="h6" className="brand-title">BSTU PDD</Typography>
              </Box>

              <div className="catalog-switcher">
                {topButtons.map((button) => (
                  <Button
                    key={button.key}
                    variant="text"
                    className={`catalog-switch-btn ${activeTab === button.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(button.key)}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            </Box>

            {currentUser ? (
              <Box className="header-right">
                <Typography className="welcome-text">Привет, {currentUser.username}!</Typography>
                <Button color="error" variant="contained" onClick={handleLogout}>
                  Выход
                </Button>
              </Box>
            ) : (
              <Box className="header-right">
                <Button
                  color="secondary"
                  variant="contained"
                  onClick={() => setActiveTab('auth')}
                >
                  Вход
                </Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: { xs: 1.25, md: 2 } }}>
          <Paper className={`content-card ${isAuthTab ? 'content-card-auth' : ''}`} elevation={0}>

            <Box sx={{ mt: isAuthTab ? 0 : 1.25 }}>
              {activeTab === 'catalog-sections' && (
                <CatalogExplorer
                  viewMode="sections"
                  onStartTicket={handleStartTicketFromCatalog}
                  isAuthenticated={Boolean(currentUser)}
                  onRequireAuth={handleRequireAuth}
                />
              )}
              {activeTab === 'catalog-tickets' && (
                <TicketPractice
                  currentUser={currentUser}
                  isAuthenticated={Boolean(currentUser)}
                  onRequireAuth={handleRequireAuth}
                  startRequest={ticketStartRequest}
                  onStartRequestConsumed={handleTicketStartRequestConsumed}
                />
              )}
              {activeTab === 'exam' && (
                <ExamPractice
                  isAuthenticated={Boolean(currentUser)}
                  onRequireAuth={handleRequireAuth}
                />
              )}
              {activeTab === 'stats' && currentUser && (
                <UserStats
                  currentUser={currentUser}
                  onRetakeTicket={handleRetakeTicket}
                />
              )}
              {activeTab === 'manage' && isAdmin && (
                <Stack spacing={1.75}>
                  <Tabs
                    value={manageTab}
                    onChange={(_, value) => setManageTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    className="manage-tabs"
                  >
                    <Tab value="catalog" label="Каталог" />
                    <Tab value="exam" label="Экзамен" />
                    <Tab value="questions" label="Вопросы" />
                    <Tab value="users" label="Пользователи" />
                  </Tabs>

                  {manageTab === 'catalog' && <AdminCatalogManager />}
                  {manageTab === 'exam' && <AdminExamManager />}
                  {manageTab === 'questions' && <AdminQuestionForm />}
                  {manageTab === 'users' && <UserList currentUser={currentUser} />}
                </Stack>
              )}
              {activeTab === 'auth' && (
                <Box className="auth-view-wrapper">
                  <Box className="auth-view-content">
                      <Auth onLogin={handleLogin} />
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
