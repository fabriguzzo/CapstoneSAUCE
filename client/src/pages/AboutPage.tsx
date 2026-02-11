import React, { useMemo, useRef } from 'react';
// MUI Components
import { Box, Container, Typography, Link, Stack, Paper, Button } from '@mui/material';
// FramerMotion Tools
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import goalImage from "../Images/HockeyGoal2-AboutUs.jpg";
import fabrizioImg from "../Images/HockeyGoal-AboutUs.jpeg";
import stuartImg from "../Images/StuartFillerImageABTUS.jpeg";
import matthewImg from "../Images/MattBarrowFillerABTUS.jpeg";

// Page Comp
function AboutPage() {
  const navigate = useNavigate();
  // Used to Measure Scroll progress
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const panels = useMemo(
    () => [
      {
        title: 'About Us',
        body:
          'Sauce is a prototype web app built for hockey tracking to make a difference for athletes, teams, and coaches.',
      },
      {
        title: 'Our Goal is Simple',
        body: 'Utilize smooth and effective tracking to help teams improve, one game at a time.',
      },
      {
        title: 'Why We Built It',
        body:
          'By attending games, watching roommates and friends compete, and getting to know the coaching staff, we saw a clear gap between what was happening on the ice and what was being captured in the stats. When Matthew Barrow reached out with an opportunity to get more involved with the Loyola Hockey team, it became clear that this wasn’t just another side project — it was a chance to be part of something bigger.',
      },
      {
        title: 'What Sauce Does',
        body:
          'Authenticated audience data entry, provides real-time stat viewing, and coach-friendly dashboards—built to keep insights clear without slowing the game down.',
      },
      {
        title: 'Our Mission',
        body:
          'To help student-athletes and teams improve through better tracking—so programs learn faster, adjust smarter, and develop players more effectively.',
      },
    ],
    []
  );


  //After Imersive Scroll Section
  //Meet the team Data
  const team = [
  {
    name: 'Fabrizio Guzzo',
    role: 'Fullstack Developer',
    email: 'fgguzzo@loyola.edu',
    image: fabrizioImg,
    bio: 'Senior at Loyola University Maryland Majoring in Computer Science and Minor in Data Science. Built the Sauce web app end-to-end, focusing on speed, reliability, and a clean game-day experience.',
  },
  {
    name: 'Stuart Belvin',
    role: 'Fullstack Developer',
    email: 'slbelvin@loyola.edu',
    image: stuartImg,
    bio: 'Senior at Loyola Univeristy Maryland, Majoring in Computer Science and Data Science Worked across front and backend to turn live hockey moments into usable insights for players and coaches.',
  },
  {
    name: 'Matthew Barrow',
    role: 'Creative Director',
    email: 'matthew@loyola.edu', 
    image: matthewImg,
    bio: 'Leads the product vision and design direction—making Sauce feel polished, clear, and coach-friendly.',
  },
];

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  });

  // Image zoom + blur + overlay darkening
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.22]);
  const blur = useTransform(scrollYProgress, [0, 1], [0, 12]); // px
  const blurFilter = useTransform(blur, (b) => `blur(${b}px)`);
  const overlay = useTransform(scrollYProgress, [0, 1], [0.15, 0.6]);

  // Title fades as user starts scrolling
  const titleOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.12], [0, -12]);

  const count = panels.length;
  const segment = 1 / count;

  const panelTransforms = panels.map((_, i) => {
    const start = i * segment;
    const inMid = start + segment * 0.25;
    const outMid = start + segment * 0.75;
    const end = (i + 1) * segment;

    const opacity = useTransform(scrollYProgress, [start, inMid, outMid, end], [0, 1, 1, 0]);
    const y = useTransform(scrollYProgress, [start, inMid, outMid, end], [18, 0, 0, -18]);

    return { opacity, y };
  });

  return (
    <Box sx={{ bgcolor: 'common.black' }}>
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
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#005F02', cursor: 'pointer' }} onClick={() => navigate('/')}>
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

      {/*Imerssive Scroll Wraper*/}
      <Box
        ref={wrapRef}
        sx={{
          // Only Story Length
          height: { xs: '520vh', md: '420vh' }, 
          bgcolor: 'common.black',
        }}
      >
        {/* None moving scene*/}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          {/*Backround Image Layer*/}
          <Box
            component={motion.div}
            style={{
              scale,
              filter: blurFilter,
              transformOrigin: 'center',
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${goalImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/*Darker overlay = Easier Read*/}
          <Box
            component={motion.div}
            style={{ opacity: overlay }}
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'common.black',
            }}
          />

          {/*Fading title while Scroll*/}
          <Box
            component={motion.div}
            style={{ opacity: titleOpacity, y: titleY }}
            sx={{
              position: 'absolute',
              top: { xs: '10vh', md: '10vh' },
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              px: 2,
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                fontSize: { xs: 38, sm: 48, md: 64 },
                textAlign: 'center',
              }}
            >
              About Us
            </Typography>
          </Box>

          {/*Panel fading*/}
          <Container
            maxWidth="md"
            sx={{
              position: 'relative',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              px: { xs: 2, sm: 2 },
            }}
          >
            <Box sx={{ position: 'relative', width: '100%', minHeight: 220 }}>
              {panels.map((p, i) => (
                <Box
                  key={p.title}
                  component={motion.div}
                  style={{ opacity: panelTransforms[i].opacity, y: panelTransforms[i].y }}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      width: '100%',
                      borderRadius: 4,
                      px: { xs: 2.5, sm: 3.5 },
                      py: { xs: 3, sm: 3.5 },
                      bgcolor: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      boxShadow: '0 12px 44px rgba(0,0,0,0.38)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.95)',
                        fontWeight: 700,
                        letterSpacing: '-0.03em',
                        fontSize: { xs: 30, sm: 38, md: 48, lg: 60 },
                        mb: 1,
                      }}
                    >
                      {p.title}
                    </Typography>

                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.78)',
                        lineHeight: 1.75,
                        fontSize: { xs: 18, sm: 20, md: 22, lg: 24 },
                      }}
                    >
                      {p.body}
                    </Typography>

                    {/*Scroll Progress line*/}
                    <Box
                      sx={{
                        mt: 2.5,
                        height: 2,
                        width: '100%',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        component={motion.div}
                        style={{
                          scaleX: useTransform(
                            scrollYProgress,
                            [i * segment, (i + 1) * segment],
                            [0, 1]
                          ),
                          transformOrigin: '0% 50%',
                        }}
                        sx={{
                          height: '100%',
                          width: '100%',
                          bgcolor: 'rgba(255,255,255,0.55)',
                        }}
                      />
                    </Box>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Container>

          {/* Hint to Scroll*/}
          <Box
            component={motion.div}
            style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
            sx={{
              position: 'absolute',
              bottom: '6vh',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Scroll ↓
            </Typography>
          </Box>
        </Box>
      </Box>
      {/*Meet Our Team*/}
        <Box sx={{ bgcolor: 'background.default', py: { xs: 8, md: 10 } }}>
          <Container maxWidth="lg">
            <Typography
              sx={{
                textAlign: 'center',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontSize: { xs: 34, sm: 42, md: 56 },
                mb: { xs: 4, md: 6 },
                color: 'primary.main'
              }}
            >
              Meet the Team
            </Typography>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              justifyContent="center"
              alignItems="stretch"
              sx={{ flexWrap: 'wrap' }}
            >
              {team.map((m) => (
                <Paper
                  key={m.email}
                  elevation={3}
                  sx={{
                    flex: 1,
                    minWidth: { xs: '100%', md: 280 },
                    maxWidth: 360,
                    mx: 'auto',
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    textAlign: 'center',
                  }}
                >
                  {/*Headshot*/}
                  {/* Can Be adjusted was messing around for a bit*/}
                  <Box
                    component="img"
                    src={m.image}
                    alt={m.name}
                    sx={{
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      mx: 'auto',
                      mb: 2.5,
                      boxShadow: 3,
                    }}
                  />

                  {/*Name*/}
                  <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 0.5 , color: 'primary.light'}}>
                    {m.name}
                  </Typography>

                  {/*Role*/}
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 2 }}>
                    {m.role}
                  </Typography>

                  {/*Bio*/}
                  <Typography sx={{ color: 'text.primary', lineHeight: 1.7, mb: 2.5 }}>
                    {m.bio}
                  </Typography>

                  {/*Contact*/}
                  <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography sx={{ fontWeight: 800, mb: 0.5, color: 'primary.light'}}>Contact</Typography>
                    <Link href={`mailto:${m.email}`} sx={{ fontWeight: 600 }}>
                      {m.email}
                    </Link>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Container>
        </Box>

    </Box>
  );

}

export default AboutPage;
