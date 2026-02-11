import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Container, Typography, Box, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff2d1', pt: 10 }}>
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Typography 
            variant="h1" 
            sx={{ 
              fontSize: { xs: '4rem', md: '7rem' },
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 8,
              color: '#005F02',
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.05em'
            }}
          >
            Our Product
          </Typography>
        </motion.div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <Paper 
            elevation={6}
            sx={{ 
              p: 6,
              bgcolor: '#005F02',
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0, 95, 2, 0.3)'
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                textAlign: 'center',
                color: '#ffffff',
                lineHeight: 1.8,
                mb: 4,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: { xs: '1.1rem', md: '1.3rem' }
              }}
            >
              SAUCE is a real-time hockey analytics platform that transforms how coaches track and analyze game performance. 
              Say goodbye to handwritten notes and disconnected spreadsheets.
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                textAlign: 'center',
                color: '#ffffff',
                lineHeight: 1.8,
                mb: 4,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: { xs: '1.1rem', md: '1.3rem' }
              }}
            >
              Built for club, junior, and university hockey programs, SAUCE enables multiple users to log statistics 
              collaboratively during games, providing instant insights through clean visualizations and trend analysis.
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                textAlign: 'center',
                color: '#ffffff',
                lineHeight: 1.8,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: { xs: '1.1rem', md: '1.3rem' }
              }}
            >
              Where existing solutions fall short with complexity and poor design, SAUCE delivers simplicity, 
              clarity, and the core metrics coaches actually need to make winning decisions.
            </Typography>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const aboutSectionRef = useRef<HTMLDivElement>(null);

  const handleAboutClick = () => {
    navigate('/about');
  };

  const handleContactClick = () => {
    navigate('/contact');
  };

  const handleSignUpClick = () => {
    // Do nothing
  };

  const handleGameCrudClick = () => {
    navigate('/gamecrud');
  };

  return (
    <Box>
      {/* Navigation Header */}
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        bgcolor: 'background.default',
        boxShadow: 1
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              SAUCE
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="text"
                onClick={handleGameCrudClick}
                sx={{ color: 'text.primary' }}
              >
                GameCRUD
              </Button>
              <Button 
                variant="text" 
                onClick={handleAboutClick}
                sx={{ color: 'text.primary' }}
              >
                About
              </Button>
              <Button 
                variant="text" 
                onClick={handleContactClick}
                sx={{ color: 'text.primary' }}
              >
                Contact Us
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSignUpClick}
                sx={{ bgcolor: 'primary.main' }}
              >
                Sign Up
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Box sx={{ pt: 8 }}>
        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ py: 10 }}>
          <Typography 
            variant="h1" 
            sx={{ 
              fontSize: { xs: '3rem', md: '5rem' },
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 4,
              color: 'primary.main'
            }}
          >
            Welcome to SAUCE
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              textAlign: 'center',
              mb: 6,
              color: 'text.secondary'
            }}
          >
            Real-time hockey analytics for coaches and teams
          </Typography>
        </Container>

        {/* About Section */}
        <div ref={aboutSectionRef}>
          <AboutSection />
        </div>
      </Box>
    </Box>
  );
}
