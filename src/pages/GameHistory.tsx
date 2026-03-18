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
  Button,
  Stack,
} from "@mui/material";
import { Visibility as ViewIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuthFetch } from "../hooks/useAuthFetch";

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
  startTime?: string;
  endTime?: string;
  opponent?: { teamName?: string };
  score?: { us?: number; them?: number };
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
}

interface Game {
  _id: string;
  teamId: string;
  teamName: string;
  gameType: string;
  gameDate: string;
  startTime?: string;
  endTime?: string;
  opponentTeamName: string;
  teamScore?: number;
  opponentScore?: number;
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
}

const CREAM = "#fff2d1";
const GREEN = "#005F02";

function formatClock(seconds = 0) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getStatusLabel(game: Game) {
  if (game.status === "live") {
    return `Live • P${game.currentPeriod ?? "-"} • ${formatClock(game.clockSecondsRemaining ?? 0)}`;
  }
  if (game.status === "intermission") {
    return `Intermission • P${game.currentPeriod ?? "-"}`;
  }
  if (game.status === "final") return "Final";
  return "Scheduled";
}

export default function GameHistory() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);

      const [teamsRes, gamesRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/teams`),
        authFetch(`${API_BASE_URL}/api/games`),
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
        startTime: game.startTime,
        endTime: game.endTime,
        opponentTeamName: game.opponent?.teamName || "Unknown Opponent",
        teamScore: game.score?.us ?? 0,
        opponentScore: game.score?.them ?? 0,
        status: game.status,
        currentPeriod: game.currentPeriod,
        clockSecondsRemaining: game.clockSecondsRemaining,
      }));

      setGames(
        mappedGames.sort(
          (a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
        )
      );
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleHistoryClick = (gameId: string) => {
    navigate(`/gamestats/${gameId}`);
  };

  const handleLiveClick = (gameId: string) => {
    navigate(`/games/${gameId}/live`);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: GREEN }} />
      </Box>
    );
  }

  return (
    <>
      <Navbar />
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: { xs: 6, md: 8 }, pt: { xs: 12, md: 14 } }}>
      <Container maxWidth="lg">
        <Typography
          sx={{
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            fontSize: { xs: 34, sm: 44, md: 60 },
            mb: 2,
            color: GREEN,
            fontFamily: "Oswald, sans-serif",
          }}
        >
          Game History
        </Typography>

        <Stack direction="row" justifyContent="center" sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate("/opponent-overview")}
            sx={{
              bgcolor: GREEN,
              color: CREAM,
              fontWeight: 700,
              px: 3,
              "&:hover": { bgcolor: "#004a01" },
            }}
          >
            Opponent Overview
          </Button>
        </Stack>

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
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Start Time</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>End Time</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Team</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Opponent</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Status</TableCell>
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
                      <TableCell sx={{ color: GREEN }}>
                        {game.startTime
                          ? new Date(game.startTime).toLocaleTimeString()
                          : "—"}
                      </TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        {game.endTime
                          ? new Date(game.endTime).toLocaleTimeString()
                          : "—"}
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
                      <TableCell sx={{ color: GREEN }}>
                        <Chip
                          label={getStatusLabel(game)}
                          size="small"
                          sx={{
                            bgcolor:
                              game.status === "live"
                                ? "rgba(0,95,2,.18)"
                                : game.status === "intermission"
                                ? "rgba(255,193,7,.22)"
                                : "rgba(0,95,2,.1)",
                            color: GREEN,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: GREEN, fontWeight: 700 }}>
                          {game.teamScore ?? 0} - {game.opponentScore ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                            onClick={() => handleHistoryClick(game._id)}
                            sx={{
                              borderColor: GREEN,
                              color: GREEN,
                              fontWeight: 700,
                              textTransform: "none",
                            }}
                          >
                            History
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleLiveClick(game._id)}
                            disabled={game.status !== "live" && game.status !== "intermission"}
                            sx={{
                              bgcolor: GREEN,
                              color: CREAM,
                              fontWeight: 700,
                              textTransform: "none",
                              "&:hover": { bgcolor: "#004a01" },
                              "&.Mui-disabled": {
                                bgcolor: "rgba(0,95,2,.18)",
                                color: "rgba(0,95,2,.45)",
                              },
                            }}
                          >
                            Live
                          </Button>
                        </Stack>
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
    </>
  );
}