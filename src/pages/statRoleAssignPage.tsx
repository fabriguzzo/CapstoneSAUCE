import { useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "../hooks/useAuthFetch";
import { useAuth } from "../context/AuthContext";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import Navbar from "../components/Navbar";

type Team = { _id: string; name: string };
type TeamMember = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "coach" | "member";
  teamId: string;
  playerId?: string;
};

type RoleRow = { teamId: string; assigneeUserId: string; statKey: StatKey };

type StatKey =
  | "goals"
  | "assists"
  | "shots"
  | "hits"
  | "pim"
  | "plusMinus"
  | "saves"
  | "goalsAgainst"
  | "faceoff_tracker"
  | "hit_penalty_tracker"
  | "shots_goals_tracker"
  | "time_of_possession"
  | "pass_tracker";

const API = {
  team: "/api/teams",
  members: "/api/users/team/members",
  roles: "/api/stat-roles",
};

const CREAM = "#fff2d1";
const GREEN = "#005F02";

const STAT_OPTIONS: { key: StatKey; label: string }[] = [
  { key: "faceoff_tracker", label: "Faceoff Tracker (includes Live Game Controls)" },
  { key: "hit_penalty_tracker", label: "Hit & Penalty Tracker" },
  { key: "shots_goals_tracker", label: "Shots & Goals Tracker" },
  { key: "time_of_possession", label: "Time of Possession" },
  { key: "pass_tracker", label: "Pass Tracker" },
];

export default function StatRoleAssignPage() {
  const authFetch = useAuthFetch();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [teamId, setTeamId] = useState("");
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, StatKey[]>>({});

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTeamData, setLoadingTeamData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // load teams
  useEffect(() => {
    if (!user?.teamId) return;

    (async () => {
      setLoadingTeams(true);
      setMsg(null);
      try {
        const res = await fetch(`${API.team}/${user.teamId}`);
        const data = await res.json();
        const team = data?._id ? [{ _id: data._id, name: data.name }] : [];
        setTeams(team);
        setTeamId(data?._id || "");
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load teams." });
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, [user?.teamId]);

  // load team member accounts + existing role assignments when team changes
  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setRolesByUserId({});
      return;
    }

    (async () => {
      setLoadingTeamData(true);
      setMsg(null);
      try {
        const [mRes, rRes] = await Promise.all([
          authFetch(API.members),
          authFetch(`${API.roles}?teamId=${encodeURIComponent(teamId)}`),
        ]);

        const mData = await mRes.json();
        const rData: RoleRow[] = await rRes.json();

        const accountList = (Array.isArray(mData) ? mData : [])
          .filter((member: TeamMember) => member.role === "member" && member.teamId === teamId);
        setMembers(accountList);

        const map: Record<string, StatKey[]> = {};
        if (Array.isArray(rData)) {
          for (const row of rData) {
            if (!map[row.assigneeUserId]) map[row.assigneeUserId] = [];
            map[row.assigneeUserId].push(row.statKey);
          }
        }

        for (const member of accountList) {
          const memberId = member.id || member._id;
          if (memberId && !map[memberId]) map[memberId] = [];
        }

        setRolesByUserId(map);
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load team members/roles." });
      } finally {
        setLoadingTeamData(false);
      }
    })();
  }, [authFetch, teamId]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members]
  );

  const setRoles = (assigneeUserId: string, statKeys: StatKey[]) => {
    setRolesByUserId((prev) => ({ ...prev, [assigneeUserId]: statKeys }));
  };

  const saveRoles = async () => {
    if (!teamId) {
      setMsg({ type: "error", text: "Pick a team first." });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const assignments = Object.entries(rolesByUserId).flatMap(([assigneeUserId, statKeys]) =>
        statKeys.map((statKey) => ({
          assigneeUserId,
          statKey,
        }))
      );

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
                  onChange={(e: SelectChangeEvent) => setTeamId(e.target.value)}
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
                {sortedMembers.length === 0 ? (
                  <Typography sx={{ color: GREEN, fontWeight: 800 }}>
                    No approved member accounts on your team are available for role assignment.
                  </Typography>
                ) : (
                  sortedMembers.map((member) => (
                    <Paper
                      key={member.id || member._id}
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
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: GREEN, fontWeight: 1000 }}>{member.name}</Typography>
                        <Typography sx={{ color: GREEN, opacity: 0.8, fontWeight: 700, fontSize: 13 }}>
                          {member.email}
                        </Typography>
                      </Box>

                      <FormControl sx={{ width: 280 }}>
                        <InputLabel sx={{ color: GREEN, fontWeight: 800 }}>Role</InputLabel>
                        <Select
                          multiple
                          label="Role"
                          input={<OutlinedInput label="Role" />}
                          value={rolesByUserId[member.id || member._id || ""] || []}
                          onChange={(e) => {
                            const memberId = member.id || member._id;
                            const value = e.target.value;
                            if (memberId) {
                              setRoles(
                                memberId,
                                (typeof value === "string" ? value.split(",") : value) as StatKey[]
                              );
                            }
                          }}
                          renderValue={(selected) => {
                            const values = selected as StatKey[];
                            if (values.length === 0) return "No stats assigned";
                            return STAT_OPTIONS
                              .filter((option) => values.includes(option.key))
                              .map((option) => option.label)
                              .join(", ");
                          }}
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
                              <Checkbox
                                checked={(rolesByUserId[member.id || member._id || ""] || []).includes(s.key)}
                                sx={{ color: GREEN, "&.Mui-checked": { color: GREEN } }}
                              />
                              <ListItemText primary={s.label} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Paper>
                  ))
                )}
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
