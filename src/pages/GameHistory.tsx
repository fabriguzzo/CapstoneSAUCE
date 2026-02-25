import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Visibility as ViewIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

interface ApiTeam {
  _id: string;
  name: string;
}

interface ApiGame {
  _id: string;
  teamId: string;
  gameType: string;
  gameDate: string;
  opponent?: { teamName?: string };
  score?: { us?: number; them?: number };
}

interface Game {
  _id: string;
  teamId: string;
  teamName: string;
  gameType: string;
  gameDate: string;
  opponentTeamName: string;
  teamScore?: number;
  opponentScore?: number;
}

const CREAM = "#fff2d1";
const GREEN = "#005F02";

export default function GameHistory() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      const [teamsRes, gamesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/teams`),
        fetch(`${API_BASE_URL}/api/games`),
      ]);

      const teamsData: ApiTeam[] = await teamsRes.json();
      const gamesData: ApiGame[] = await gamesRes.json();

      const teamsMap: Record<string, string> = {};
      teamsData.forEach((t) => {
        teamsMap[t._id] = t.name;
      });

      const mappedGames: Game[] = gamesData.map((game) => ({
        _id: game._id,
        teamId: game.teamId,
        teamName: teamsMap[game.teamId] || "Unknown Team",
        gameType: game.gameType,
        gameDate: game.gameDate,
        opponentTeamName: game.opponent?.teamName || "Unknown Opponent",
        teamScore: game.score?.us ?? 0,
        opponentScore: game.score?.them ?? 0,
      }));

      setGames(mappedGames.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewClick = (gameId: string) => {
    navigate(`/gamestats/${gameId}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: GREEN }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: { xs: 6, md: 8 } }}>
      <Container maxWidth="lg">
        <Typography
          sx={{
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            fontSize: { xs: 34, sm: 44, md: 60 },
            mb: 3,
            color: GREEN,
            fontFamily: "Oswald, sans-serif",
          }}
        >
          Game History
        </Typography>

        <Paper
          elevation={6}
          sx={{
            borderRadius: 4,
            p: { xs: 2.5, md: 3 },
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
          }}
        >
          {games.length === 0 ? (
            <Typography sx={{ textAlign: "center", py: 4, color: GREEN, opacity: 0.7 }}>
              No games have been played yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Team</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Opponent</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Score</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game._id}>
                      <TableCell sx={{ color: GREEN }}>
                        {new Date(game.gameDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ color: GREEN }}>{game.teamName}</TableCell>
                      <TableCell sx={{ color: GREEN }}>{game.opponentTeamName}</TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        <Chip
                          label={game.gameType}
                          size="small"
                          sx={{
                            bgcolor: "rgba(0,95,2,.1)",
                            color: GREEN,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: GREEN, fontWeight: 700 }}>
                          {game.teamScore ?? 0} - {game.opponentScore ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            color: GREEN,
                            "&:hover": { opacity: 0.7 },
                          }}
                          onClick={() => handleViewClick(game._id)}
                        >
                          <ViewIcon fontSize="small" sx={{ mr: 0.5, color: GREEN }} />
                          <Typography sx={{ fontWeight: 600, fontSize: 14, color: GREEN }}>View</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
