import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

/**
 * About Us Page
 * Information about Sauce, the team, and how to get in touch
 */
function AboutPage() {
  const teamMembers = [
    { name: 'Fabrizio Guzzo', role: 'Fullstack Developer' },
    { name: 'Stuart Belvin', role: 'Fullstack Developer' },
    { name: 'Matthew Barrow', role: 'Creative Director' },
  ];

  const features = [
    {
      title: 'Authenticated Audience Data Entry',
      description:
        'Trusted attendees — including reserve players or designated team members — can contribute live game data.',
    },
    {
      title: 'Real-Time Stat Tracking',
      description: 'Data is instantly available as the game unfolds.',
    },
    {
      title: 'Clear, Readable Data Views',
      description:
        'Coaches and teams can quickly understand performance trends and overall game statistics without digging through clutter.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Page Header Section */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: 'primary.main',
          }}
        >
          <Typography variant="h1">SAUCE</Typography>
          <Typography variant="h4">
            A Real-Time Hockey Analytics and Coaching Dashboard
          </Typography>
        </Paper>

        {/* Main Content Section */}
        <Stack spacing={4}>
          {/* About Sauce Section */}
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h2" sx={{ color: 'primary.light' }}>
              About Sauce
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'secondary.main' }} />
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8 }}>
              Sauce is a web-based platform built to make a real difference in hockey
              performance — on and off the ice. Our goal is simple: use tracking to help
              teams improve, one game at a time.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8, mt: 2 }}>
              Born out of the college hockey community, Sauce focuses on giving coaches
              and teams meaningful, real-time insights without overcomplicating the game.
            </Typography>
          </Paper>

          {/* Why We Built Sauce Section */}
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h2" sx={{ color: 'primary.light' }}>
              Why We Built Sauce
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'secondary.main' }} />
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8 }}>
              Sauce started by doing what hockey fans do best — showing up.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8, mt: 2 }}>
              By attending games, watching roommates and friends compete, and getting to
              know the coaching staff, we saw a clear gap between what was happening on
              the ice and what was being captured in the stats. When Matthew Barrow
              reached out with an opportunity to get more involved with the Loyola Hockey
              team, it became clear that this wasn't just another side project — it was a
              chance to be part of something bigger.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8, mt: 2 }}>
              We care deeply about helping student-athletes and teams improve, and Sauce
              is our way of giving back to the community that inspired us.
            </Typography>
          </Paper>

          {/* What Sauce Does Section */}
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h2" sx={{ color: 'primary.light' }}>
              What Sauce Does
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'secondary.main' }} />
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8, mb: 3 }}>
              Sauce is designed specifically for hockey athletes of all ages and levels,
              with tools that are simple, fast, and impactful.
            </Typography>
            <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
              Key features include:
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              {features.map((feature) => (
                <Paper
                  key={feature.title}
                  elevation={1}
                  sx={{
                    p: 3,
                    flex: 1,
                    borderTop: 4,
                    borderColor: 'primary.light',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ color: 'primary.main', fontWeight: 600, mb: 1 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {feature.description}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Paper>

          {/* Who We Are Section */}
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h2" sx={{ color: 'primary.light' }}>
              Who We Are
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'secondary.main' }} />
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8, mb: 3 }}>
              We're a small, dedicated team combining technical skill with creative
              vision:
            </Typography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              justifyContent="center"
            >
              {teamMembers.map((member) => (
                <Box
                  key={member.name}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 3,
                    borderRadius: 2,
                    backgroundColor: 'secondary.main',
                    minWidth: 200,
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'background.default' }}>
                      {member.name.charAt(0)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ color: 'primary.main', fontWeight: 600 }}
                  >
                    {member.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {member.role}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Typography
              variant="body1"
              sx={{ color: 'text.primary', lineHeight: 1.8, mt: 3, textAlign: 'center' }}
            >
              Together, we're building Sauce as a prototype web app, with the goal of
              expanding its impact across teams and leagues.
            </Typography>
          </Paper>

          {/* Our Mission Section */}
          <Paper
            elevation={3}
            sx={{
              p: 4,
              backgroundColor: 'primary.main',
              textAlign: 'center',
            }}
          >
            <Typography variant="h2" sx={{ color: 'primary.contrastText' }}>
              Our Mission
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'secondary.main' }} />
            <Typography
              variant="h6"
              sx={{ color: 'primary.contrastText', lineHeight: 1.8, fontStyle: 'italic' }}
            >
              To empower athletes and coaches with accessible, real-time data that helps
              teams grow, compete smarter, and elevate their game.
            </Typography>
          </Paper>

          {/* Get in Touch Section */}
          <Paper
            elevation={2}
            sx={{
              p: 4,
              backgroundColor: 'secondary.main',
            }}
          >
            <Typography variant="h2" sx={{ color: 'primary.main' }}>
              Get in Touch
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'primary.light' }} />
            <Typography variant="body1" sx={{ color: 'primary.main', lineHeight: 1.8, mb: 2 }}>
              We'd love to hear from you — whether you're a coach, player, or fan.
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body1" sx={{ color: 'primary.main' }}>
                <strong>Fabrizio Guzzo</strong> –{' '}
                <Link href="mailto:fgguzzo@loyola.edu" sx={{ color: 'primary.light' }}>
                  fgguzzo@loyola.edu
                </Link>
              </Typography>
              <Typography variant="body1" sx={{ color: 'primary.main' }}>
                <strong>Stuart Belvin</strong> –{' '}
                <Link href="mailto:slbelvin@loyola.edu" sx={{ color: 'primary.light' }}>
                  slbelvin@loyola.edu
                </Link>
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

export default AboutPage;
