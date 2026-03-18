import { useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "../hooks/useAuthFetch";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import Navbar from "../components/Navbar";

type Team = { _id: string; name: string };
type Player = { _id: string; name: string; number: number; teamId: string; position?: string };

type RoleRow = { teamId: string; playerId: string; statKey: StatKey };

type StatKey =
  | "goals"
  | "assists"
  | "shots"
  | "hits"
  | "pim"
  | "plusMinus"
  | "saves"
  | "goalsAgainst";

const API = {
  teams: "/api/teams",
  players: "/api/players",
  roles: "/api/stat-roles",
};

const CREAM = "#fff2d1";
const GREEN = "#005F02";

const STAT_OPTIONS: { key: StatKey; label: string }[] = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "shots", label: "Shots" },
  { key: "hits", label: "Hits" },
  { key: "pim", label: "PIM" },
  { key: "plusMinus", label: "Plus/Minus" },
  { key: "saves", label: "Saves" },
  { key: "goalsAgainst", label: "Goals Against" },
];

export default function StatRoleAssignPage() {
  const authFetch = useAuthFetch();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [teamId, setTeamId] = useState("");
  const [rolesByPlayerId, setRolesByPlayerId] = useState<Record<string, StatKey>>({});

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTeamData, setLoadingTeamData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // load teams
  useEffect(() => {
    (async () => {
      setLoadingTeams(true);
      setMsg(null);
      try {
        const res = await fetch(API.teams);
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load teams." });
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, []);

  // load players + existing role assignments when team changes
  useEffect(() => {
    if (!teamId) {
      setPlayers([]);
      setRolesByPlayerId({});
      return;
    }

    (async () => {
      setLoadingTeamData(true);
      setMsg(null);
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${API.players}?teamId=${encodeURIComponent(teamId)}`),
          authFetch(`${API.roles}?teamId=${encodeURIComponent(teamId)}`),
        ]);

        const pData = await pRes.json();
        const rData: RoleRow[] = await rRes.json();

        const pList = Array.isArray(pData) ? pData : [];
        setPlayers(pList);

        const map: Record<string, StatKey> = {};
        if (Array.isArray(rData)) {
          for (const row of rData) map[row.playerId] = row.statKey;
        }

        // default role if none assigned yet (optional)
        for (const p of pList) {
          if (!map[p._id]) map[p._id] = "goals";
        }

        setRolesByPlayerId(map);
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load players/roles." });
      } finally {
        setLoadingTeamData(false);
      }
    })();
  }, [teamId]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.number - b.number),
    [players]
  );

  const onTeamChange = (e: SelectChangeEvent) => setTeamId(e.target.value);

  const setRole = (playerId: string, statKey: StatKey) => {
    setRolesByPlayerId((prev) => ({ ...prev, [playerId]: statKey }));
  };

  const saveRoles = async () => {
    if (!teamId) {
      setMsg({ type: "error", text: "Pick a team first." });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const assignments = Object.entries(rolesByPlayerId).map(([playerId, statKey]) => ({
        playerId,
        statKey,
      }));

      const res = await authFetch(`${API.roles}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, assignments }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setMsg({ type: "error", text: data?.error || `Failed to save roles (${res.status})` });
        return;
      }

      setMsg({ type: "success", text: "Roles saved!" });
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to save roles." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, pt: 12, pb: 5 }}>
      <Navbar />
      <Container maxWidth="md">
        <Stack spacing={2.5}>
          <Typography sx={{ textAlign: "center", fontWeight: 1000, color: GREEN, fontSize: { xs: 30, md: 44 } }}>
            Assign Stat Roles
          </Typography>

          <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <FormControl fullWidth disabled={loadingTeams}>
                <InputLabel sx={{ color: GREEN, fontWeight: 800 }}>Team</InputLabel>
                <Select
                  label="Team"
                  value={teamId}
                  onChange={onTeamChange}
                  sx={{
                    "& .MuiSelect-select": { color: GREEN, fontWeight: 900 },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: GREEN },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GREEN },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: GREEN },
                    "& .MuiSelect-icon": { color: GREEN },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": { color: GREEN, fontWeight: 800 },
                        "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(0,95,2,0.10)" },
                        "& .MuiMenuItem-root:hover": { backgroundColor: "rgba(0,95,2,0.14)" },
                      },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ color: GREEN, fontWeight: 800 }}>
                    Select team
                  </MenuItem>
                  {teams.map((t) => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={saveRoles}
                disabled={!teamId || saving}
                sx={{ bgcolor: GREEN, fontWeight: 1000, px: 3, height: 46, borderRadius: 2 }}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {loadingTeamData ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography sx={{ color: GREEN, fontWeight: 800 }}>Loading…</Typography>
              </Stack>
            ) : !teamId ? (
              <Typography sx={{ color: GREEN, fontWeight: 800 }}>
                Pick a team to assign stat roles.
              </Typography>
            ) : (
              <Stack spacing={1.2}>
                {sortedPlayers.map((p) => (
                  <Paper
                    key={p._id}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: "1px solid rgba(0,0,0,.10)",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ width: 68 }}>
                      <Typography sx={{ color: GREEN, fontWeight: 1000 }}>#{p.number}</Typography>
                      <Typography sx={{ color: GREEN, opacity: 0.85, fontWeight: 800, fontSize: 12 }}>
                        {p.position || "—"}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: GREEN, fontWeight: 1000 }}>{p.name}</Typography>
                    </Box>

                    <FormControl sx={{ width: 210 }}>
                      <InputLabel sx={{ color: GREEN, fontWeight: 800 }}>Role</InputLabel>
                      <Select
                        label="Role"
                        value={rolesByPlayerId[p._id] || "goals"}
                        onChange={(e) => setRole(p._id, e.target.value as StatKey)}
                        sx={{
                          "& .MuiSelect-select": { color: GREEN, fontWeight: 900 },
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: GREEN },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GREEN },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: GREEN },
                          "& .MuiSelect-icon": { color: GREEN },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              zIndex: 3000,
                              "& .MuiMenuItem-root": { color: GREEN, fontWeight: 800 },
                              "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(0,95,2,0.10)" },
                              "& .MuiMenuItem-root:hover": { backgroundColor: "rgba(0,95,2,0.14)" },
                            },
                          },
                        }}
                      >
                        {STAT_OPTIONS.map((s) => (
                          <MenuItem key={s.key} value={s.key}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Paper>
                ))}
              </Stack>
            )}

            {msg && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={msg.type}>{msg.text}</Alert>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}