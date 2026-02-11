import { useState } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch('http://localhost:5001/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#005F02' }}>
      {/* Navigation Header */}
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        bgcolor: '#fff2d1',
        boxShadow: 1
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#005F02', cursor: 'pointer' }} onClick={handleBackClick}>
              SAUCE
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="text" 
                onClick={() => navigate('/about')}
                sx={{ color: '#005F02' }}
              >
                About
              </Button>
              <Button 
                variant="text" 
                onClick={() => navigate('/contact')}
                sx={{ color: '#005F02' }}
              >
                Contact Us
              </Button>
              <Button 
                variant="contained" 
                sx={{ bgcolor: '#005F02', color: '#fff2d1' }}
              >
                Sign Up
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ pt: 12, pb: 8 }}>
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
            Contact Us
          </Typography>

          <Typography 
            variant="body1" 
            sx={{ 
              textAlign: 'center',
              mb: 4,
              color: '#005F02'
            }}
          >
            Have feedback or questions? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.
          </Typography>

          {status === 'success' && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Thank you for your feedback! We'll review it shortly.
            </Alert>
          )}

          {status === 'error' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Something went wrong. Please try again later.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#005F02',
                  },
                  '&:hover fieldset': {
                    borderColor: '#427A43',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#005F02',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#005F02',
                },
              }}
            />

            <TextField
              fullWidth
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#005F02',
                  },
                  '&:hover fieldset': {
                    borderColor: '#427A43',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#005F02',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#005F02',
                },
              }}
            />

            <TextField
              fullWidth
              label="Your Message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              multiline
              rows={6}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#005F02',
                  },
                  '&:hover fieldset': {
                    borderColor: '#427A43',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#005F02',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#005F02',
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                bgcolor: '#005F02',
                color: '#fff2d1',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#427A43',
                },
                '&:disabled': {
                  bgcolor: '#427A43',
                  opacity: 0.7,
                },
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
