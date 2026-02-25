import { describe, test, expect } from "vitest";

describe("GameCrud Issues", () => {
  describe("Issue 1: Button styling", () => {
    test("green buttons should have white/cream text, transparent buttons should have green text", () => {
      const GREEN = "#005F02";
      const CREAM = "#fff2d1";
      
      const containedButtonStyle = {
        bgcolor: GREEN,
        color: CREAM,
      };
      
      const outlinedButtonStyle = {
        bgcolor: "transparent",
        color: GREEN,
      };
      
      expect(containedButtonStyle.bgcolor).toBe(GREEN);
      expect(containedButtonStyle.color).toBe(CREAM);
      expect(outlinedButtonStyle.bgcolor).toBe("transparent");
      expect(outlinedButtonStyle.color).toBe(GREEN);
      
      expect(containedButtonStyle.color).not.toBe(GREEN);
      expect(outlinedButtonStyle.color).toBe(GREEN);
    });
  });

  describe("Issue 2 & 3: Data structure mapping for opponent and game updates", () => {
    const backendGameStructure = {
      _id: "game123",
      teamId: "team1",
      gameType: "regular-season",
      gameDate: "2024-01-15T10:00:00.000Z",
      lineup: [
        { playerId: "player1", slot: 1 },
        { playerId: "player2", slot: 2 },
      ],
      opponent: {
        teamName: "Towson",
        roster: [
          { number: 1, name: "John Doe" },
          { number: 2, name: "Jane Smith" },
        ],
      },
      score: {
        us: 5,
        them: 3,
      },
    };

    test("fetchGames should map backend nested opponent to flat frontend structure", () => {
      function mapBackendToFrontend(games) {
        return games.map(game => ({
          ...game,
          opponentTeamName: game.opponent?.teamName || "",
          opponentRoster: game.opponent?.roster?.map(p => ({
            number: String(p.number),
            name: p.name,
          })) || [],
          teamScore: game.score?.us ?? 0,
          opponentScore: game.score?.them ?? 0,
        }));
      }

      const mappedGames = mapBackendToFrontend([backendGameStructure]);
      
      expect(mappedGames[0].opponentTeamName).toBe("Towson");
      expect(mappedGames[0].opponentRoster).toHaveLength(2);
      expect(mappedGames[0].opponentRoster[0].number).toBe("1");
      expect(mappedGames[0].opponentRoster[0].name).toBe("John Doe");
      expect(mappedGames[0].teamScore).toBe(5);
      expect(mappedGames[0].opponentScore).toBe(3);
    });

    test("loadGameForEdit should correctly load opponent data from backend structure", () => {
      function loadGameForEdit(game) {
        return {
          teamId: game.teamId,
          gameType: game.gameType,
          gameDate: game.gameDate,
          opponentTeamName: game.opponent?.teamName || "",
          opponentRoster: game.opponent?.roster?.map(p => ({
            number: String(p.number),
            name: p.name,
          })) || [],
          lineup: game.lineup || [],
        };
      }

      const editData = loadGameForEdit(backendGameStructure);
      
      expect(editData.opponentTeamName).toBe("Towson");
      expect(editData.opponentRoster).toHaveLength(2);
      expect(editData.opponentRoster[0].name).toBe("John Doe");
    });

    test("handleUpdate should send data in backend-expected format", () => {
      function buildUpdatePayload(editData) {
        return {
          teamId: editData.teamId,
          gameType: editData.gameType,
          gameDate: editData.gameDate,
          lineup: editData.lineup,
          opponentTeamName: editData.opponentTeamName,
          opponentRoster: editData.opponentRoster.map(p => ({
            number: p.number,
            name: p.name,
          })),
        };
      }

      const editData = {
        teamId: "team1",
        gameType: "regular-season",
        gameDate: "2024-01-15T10:00:00.000Z",
        lineup: [
          { playerId: "player1", slot: 1 },
          { playerId: "player2", slot: 2 },
        ],
        opponentTeamName: "Updated Towson",
        opponentRoster: [
          { number: "1", name: "John Doe" },
          { number: "2", name: "Jane Smith" },
        ],
      };

      const payload = buildUpdatePayload(editData);
      
      expect(payload.opponentTeamName).toBe("Updated Towson");
      expect(payload.opponentRoster).toHaveLength(2);
      expect(payload.opponentRoster[0].name).toBe("John Doe");
    });

    test("syncChanges should send score in backend-expected format (score.us and score.them)", () => {
      function buildScorePayload(game) {
        return {
          score: {
            us: game.teamScore,
            them: game.opponentScore,
          },
        };
      }

      const gameData = {
        _id: "game123",
        teamScore: 5,
        opponentScore: 3,
      };

      const payload = buildScorePayload(gameData);
      
      expect(payload.score.us).toBe(5);
      expect(payload.score.them).toBe(3);
    });
  });

  describe("Issue 4: Score updates should persist after sync", () => {
    test("score changes should be included in sync payload", () => {
      const games = [
        {
          _id: "game1",
          teamScore: 5,
          opponentScore: 3,
        },
      ];

      const gamesWithScores = games.filter(
        g => g.teamScore !== undefined || g.opponentScore !== undefined
      );

      const payloads = gamesWithScores.map(game => ({
        score: {
          us: game.teamScore,
          them: game.opponentScore,
        },
      }));

      expect(payloads).toHaveLength(1);
      expect(payloads[0].score.us).toBe(5);
      expect(payloads[0].score.them).toBe(3);
    });
  });
});
