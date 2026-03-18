import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Card, CardContent, Button, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface Feedback {
  _id: string;
  email: string;
  subject: string;
  message: string;
  timestamp: string;
}

export default function ViewFeedbackPage() {
  const navigate = useNavigate();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedbackList(data);
      } else {
        setError('Failed to fetch feedback');
      }
    } catch {
      setError('Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleGoToContact = () => {
    navigate('/contact');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#005F02', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#fff2d1' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#005F02' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: 12, pb: 8 }}>
        <Paper 
          elevation={6}
          sx={{ 
            p: 6,
            bgcolor: '#fff2d1',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 4,
              color: '#005F02',
              fontFamily: 'Oswald, sans-serif'
            }}
          >
            Feedback Messages
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {feedbackList.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', color: '#005F02' }}>
              No feedback messages yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {feedbackList.map((feedback) => (
                <Card 
                  key={feedback._id}
                  sx={{ 
                    bgcolor: '#ffffff',
                    border: '2px solid #005F02',
                    borderRadius: 2
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#005F02', fontWeight: 'bold' }}>
                          {feedback.subject}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#427A43' }}>
                          {feedback.email}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#427A43' }}>
                        {new Date(feedback.timestamp).toLocaleDateString()} {new Date(feedback.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#333' }}>
                      {feedback.message}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleGoToContact}
              sx={{
                bgcolor: '#005F02',
                color: '#fff2d1',
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#427A43',
                },
              }}
            >
              Submit New Feedback
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
