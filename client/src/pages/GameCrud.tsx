import React, { useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Divider,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

type TeamOption = { id: string; name: string };
type RosterPlayer = { id: string; number: number; name: string };
type OppPlayer = { number: string; name: string };

type LineupSlot =
  | "G"
  | "LD"
  | "RD"
  | "LW"
  | "C"
  | "RW"
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "B8"
  | "B9";

export type CreateGamePayload = {
  teamId: string;
  gameType: string;
  gameDate: string; // datetime-local string or ISO (your backend can parse)
  lineup: { playerId: string; slot: number }[]; // total 15
  opponentTeamName: string;
  opponentRoster: { number: string; name: string }[]; // total 15
};

const CREAM = "#fff2d1";
const GREEN = "#005F02";

const GAME_TYPES = [
  { value: "regular-season", label: "Regular Season" },
  { value: "league", label: "League" },
  { value: "out-of-league", label: "Out of League" },
  { value: "playoff", label: "Playoff" },
  { value: "final", label: "Final" },
  { value: "tournament", label: "Tournament" },
];

function playerLabel(p: RosterPlayer) {
  return `#${p.number} • ${p.name}`;
}

export default function GameCrud() {
  const [activePanel, setActivePanel] = useState<"home" | "opp">("home");

  const [teams] = useState<TeamOption[]>([]);
  const [roster] = useState<RosterPlayer[]>([]);
  const [isSubmitting] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [gameType, setGameType] = useState("");
  const [gameDate, setGameDate] = useState("");

  const [lineup, setLineup] = useState<Record<LineupSlot, string>>({
    G: "",
    LD: "",
    RD: "",
    LW: "",
    C: "",
    RW: "",
    B1: "",
    B2: "",
    B3: "",
    B4: "",
    B5: "",
    B6: "",
    B7: "",
    B8: "",
    B9: "",
  });

  const [oppTeamName, setOppTeamName] = useState("");
  const [oppRoster, setOppRoster] = useState<OppPlayer[]>(
    Array.from({ length: 15 }, () => ({ number: "", name: "" }))
  );

  // Prevent duplicate selections in lineup (still allows clearing)
  const selectedIds = useMemo(() => new Set(Object.values(lineup).filter(Boolean)), [lineup]);
  function optionsFor(slot: LineupSlot) {
    const current = lineup[slot];
    return roster.filter((p) => !selectedIds.has(p.id) || p.id === current);
  }

  function setLineupSlot(slot: LineupSlot, playerId: string) {
    setLineup((prev) => ({ ...prev, [slot]: playerId }));
  }

  function buildPayload(): CreateGamePayload {
    const starters = [
      { slot: 1, playerId: lineup.G },
      { slot: 2, playerId: lineup.LD },
      { slot: 3, playerId: lineup.RD },
      { slot: 4, playerId: lineup.LW },
      { slot: 5, playerId: lineup.C },
      { slot: 6, playerId: lineup.RW },
    ];
    const bench = [
      { slot: 7, playerId: lineup.B1 },
      { slot: 8, playerId: lineup.B2 },
      { slot: 9, playerId: lineup.B3 },
      { slot: 10, playerId: lineup.B4 },
      { slot: 11, playerId: lineup.B5 },
      { slot: 12, playerId: lineup.B6 },
      { slot: 13, playerId: lineup.B7 },
      { slot: 14, playerId: lineup.B8 },
      { slot: 15, playerId: lineup.B9 },
    ];

    return {
      teamId,
      gameType,
      gameDate,
      lineup: [...starters, ...bench],
      opponentTeamName: oppTeamName.trim(),
      opponentRoster: oppRoster.map((p) => ({
        number: p.number.trim(),
        name: p.name.trim(),
      })),
    };
  }

  // Basic front-end validation (keeps UX clean; backend should also validate)
  function validate(): string | null {
    if (!teamId) return "Please select your team.";
    if (!gameType) return "Please select a game type.";
    if (!gameDate) return "Please choose a game date/time.";
    if (!oppTeamName.trim()) return "Please enter the opponent team name.";

    const allLineupIds = Object.values(lineup);
    if (allLineupIds.some((id) => !id)) return "Please select all 15 players (starters + bench).";

    const uniq = new Set(allLineupIds);
    if (uniq.size !== allLineupIds.length) return "Lineup has duplicate players. Each player can only be selected once.";

    if (oppRoster.length !== 15) return "Opponent roster must have 15 players.";
    for (let i = 0; i < 15; i++) {
      const n = oppRoster[i].number.trim();
      const name = oppRoster[i].name.trim();
      if (!n || !name) return `Opponent roster is incomplete (player ${i + 1}).`;
    }

    return null;
  }

  async function handleCreate() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const payload = buildPayload();
    console.log("Create payload:", payload);
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
          Create Game
        </Typography>

        <Stack direction="row" justifyContent="center" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap" }}>
          <Button
            variant={activePanel === "home" ? "contained" : "outlined"}
            onClick={() => setActivePanel("home")}
            sx={{
              bgcolor: activePanel === "home" ? GREEN : "transparent",
              borderColor: GREEN,
              color: activePanel === "home" ? "#fff" : GREEN,
              "&:hover": { bgcolor: activePanel === "home" ? GREEN : "rgba(0,95,2,.08)" },
            }}
          >
            Loyola Lineup
          </Button>

          <Button
            variant={activePanel === "opp" ? "contained" : "outlined"}
            onClick={() => setActivePanel("opp")}
            sx={{
              bgcolor: activePanel === "opp" ? GREEN : "transparent",
              borderColor: GREEN,
              color: activePanel === "opp" ? "#fff" : GREEN,
              "&:hover": { bgcolor: activePanel === "opp" ? GREEN : "rgba(0,95,2,.08)" },
            }}
          >
            Opponent
          </Button>
        </Stack>

        <AnimatePresence mode="wait">
          {activePanel === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
            >
              <Paper
                elevation={6}
                sx={{
                  borderRadius: 4,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: GREEN, mb: 1.2 }}>Game Details</Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
                  <TextField select fullWidth label="Your Team" value={teamId} onChange={(e) => setTeamId(e.target.value)}sx={{
                    "& .MuiInputLabel-root": { color: GREEN },
                    "& .MuiOutlinedInput-root fieldset": { borderColor: GREEN },
                    "& .MuiSelect-icon": { color: GREEN },
                    "& input": { color: GREEN }}}>
                    <MenuItem value="">Select…</MenuItem>
                    {teams.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField select fullWidth label="Game Type" value={gameType} onChange={(e) => setGameType(e.target.value)}sx={{
                      "& .MuiInputLabel-root": { color: GREEN },
                      "& .MuiOutlinedInput-root fieldset": { borderColor: GREEN },
                      "& .MuiSelect-icon": { color: GREEN },
                      "& input": { color: GREEN }}}>
                    <MenuItem value="">Select…</MenuItem>
                    {GAME_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    label="Game Date"
                    type="datetime-local"
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                  "& .MuiInputLabel-root": { color: GREEN },
                  "& .MuiOutlinedInput-root fieldset": { borderColor: GREEN },
                  "& .MuiSelect-icon": { color: GREEN },
                  "& input": { color: GREEN }}}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  {/* RINK */}
                  <Box
                    sx={{
                      flex: 1,
                      position: "relative",
                      borderRadius: 3,
                      border: "1px solid rgba(0,0,0,.10)",
                      bgcolor: "#fff",
                      minHeight: 460,
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ position: "absolute", top: "28%", left: 0, right: 0, height: 4, bgcolor: "rgba(255,0,0,.65)" }} />
                    <Box sx={{ position: "absolute", top: "58%", left: 0, right: 0, height: 4, bgcolor: "rgba(0,72,255,.55)" }} />
                    <Box sx={{ position: "absolute", top: "12%", left: "8%", width: 130, height: 130, borderRadius: 999, border: "4px solid rgba(255,0,0,.50)" }} />
                    <Box sx={{ position: "absolute", top: "12%", right: "8%", width: 130, height: 130, borderRadius: 999, border: "4px solid rgba(255,0,0,.50)" }} />

                    <StarterSlot title="Goalie" code="G" top="18%" left="50%" value={lineup.G} onChange={(v) => setLineupSlot("G", v)} options={optionsFor("G")} />
                    <StarterSlot title="Left D" code="LD" top="37%" left="33%" value={lineup.LD} onChange={(v) => setLineupSlot("LD", v)} options={optionsFor("LD")} />
                    <StarterSlot title="Right D" code="RD" top="37%" left="67%" value={lineup.RD} onChange={(v) => setLineupSlot("RD", v)} options={optionsFor("RD")} />
                    <StarterSlot title="Left Wing" code="LW" top="73%" left="30%" value={lineup.LW} onChange={(v) => setLineupSlot("LW", v)} options={optionsFor("LW")} />
                    <StarterSlot title="Center" code="C" top="76%" left="50%" value={lineup.C} onChange={(v) => setLineupSlot("C", v)} options={optionsFor("C")} />
                    <StarterSlot title="Right Wing" code="RW" top="73%" left="70%" value={lineup.RW} onChange={(v) => setLineupSlot("RW", v)} options={optionsFor("RW")} />
                  </Box>

                  {/* BENCH */}
                  <Paper
                    elevation={0}
                    sx={{
                      width: { xs: "100%", md: 280 },
                      borderRadius: 3,
                      border: "1px solid rgba(0,0,0,.10)",
                      bgcolor: "#fff",
                      p: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 1000, color: GREEN, mb: 1 }}>Bench (9)</Typography>

                    <Stack spacing={1.2}>
                      {(["B1","B2","B3","B4","B5","B6","B7","B8","B9"] as LineupSlot[]).map((slot, idx) => (
                        <Stack key={slot} direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 2,
                              bgcolor: "rgba(0,95,2,.10)",
                              border: "1px solid rgba(0,95,2,.20)",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 1000,
                              color: GREEN,
                              fontSize: 12,
                            }}
                          >
                            {idx + 1}
                          </Box>

                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Player"
                            value={lineup[slot]}
                            onChange={(e) => setLineupSlot(slot, e.target.value)}
                          >
                            <MenuItem value="">Select…</MenuItem>
                            {optionsFor(slot).map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {playerLabel(p)}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: "wrap" }}>
                  <Button variant="contained" onClick={handleCreate} disabled={!!isSubmitting} sx={{ bgcolor: GREEN }}>
                    {isSubmitting ? "Creating…" : "Create Game"}
                  </Button>
                  <Button variant="outlined" onClick={() => setActivePanel("opp")} sx={{ borderColor: GREEN, color: GREEN }}>
                    → Opponent
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          ) : (
            <motion.div
              key="opp"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
            >
              <Paper
                elevation={6}
                sx={{
                  borderRadius: 4,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: GREEN, mb: 1.2 }}>Opponent</Typography>

                <TextField
                  fullWidth
                  label="Opponent Team Name"
                  value={oppTeamName}
                  onChange={(e) => setOppTeamName(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 1000, color: GREEN, mb: 1 }}>Opponent Roster (15)</Typography>

                <Stack spacing={1.2}>
                  {oppRoster.map((p, i) => (
                    <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                      <TextField
                        label="#"
                        value={p.number}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOppRoster((prev) => prev.map((x, idx) => (idx === i ? { ...x, number: v } : x)));
                        }}
                        sx={{ width: { xs: "100%", sm: 140 } }}
                        inputProps={{ inputMode: "numeric" }}
                      />
                      <TextField
                        fullWidth
                        label="Name"
                        value={p.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOppRoster((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: v } : x)));
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: "wrap" }}>
                  <Button variant="outlined" onClick={() => setActivePanel("home")} sx={{ borderColor: GREEN, color: GREEN }}>
                    ← Back to Loyola
                  </Button>
                  <Button variant="contained" onClick={handleCreate} disabled={!!isSubmitting} sx={{ bgcolor: GREEN }}>
                    {isSubmitting ? "Creating…" : "Create Game"}
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </Box>
  );
}

function StarterSlot({
  title,
  code,
  top,
  left,
  value,
  onChange,
  options,
}: {
  title: string;
  code: string;
  top: string;
  left: string;
  value: string;
  onChange: (v: string) => void;
  options: RosterPlayer[];
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        top,
        left,
        transform: "translate(-50%, -50%)",
        width: 170,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 76,
          height: 76,
          mx: "auto",
          mb: 1,
          borderRadius: 2.5,
          bgcolor: "rgba(0,95,2,.10)",
          border: "2px solid rgba(0,95,2,.20)",
          display: "grid",
          placeItems: "center",
          fontWeight: 1000,
          color: GREEN,
          letterSpacing: ".3px",
        }}
      >
        {code}
      </Box>

      <Typography sx={{ fontSize: 12, fontWeight: 900, color: GREEN, mb: 0.8 }}>{title}</Typography>

      <TextField select size="small" fullWidth label="Player" value={value} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">Select…</MenuItem>
        {options.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {playerLabel(p)}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
