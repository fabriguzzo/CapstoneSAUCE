import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

//Mock DAO into require.cache before requiring controller.
const dao = {
  GAME_TYPES: [
    "regular-season",
    "league",
    "out-of-league",
    "playoff",
    "final",
    "tournament",
  ],
  create: vi.fn(),
  readAll: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  deleteAll: vi.fn(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMockedDao() {
  const controllerPath = path.resolve(__dirname, "./gameController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === "../model/gameDao.js") return dao;
    throw new Error(`Unexpected require in gameController.test.js: ${request}`);
  };
  fn(module.exports, localRequire, module, controllerPath, path.dirname(controllerPath));
  return module.exports;
}

const controller = loadControllerWithMockedDao();
function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const NAMES = [
  "Fabrizio",
  "Stuart",
  "Matt",
  "Rob",
  "Ian",
  "Quinn",
  "Oliver",
  "Charlie",
  "Pat",
  "Alex",
  "Cooper",
  "Liam",
  "Louie",
  "Sean",
  "Pete",
];

function makeLineup15() {
  return NAMES.map((name, i) => ({
    slot: i + 1,
    playerId: `${name}-${100 + i}`,
  }));
}

function makeOppRoster15() {
  // Same names with "2" at end
  return NAMES.map((name, i) => ({
    number: String(20 + i),
    name: `${name}2`,
  }));
}

function makeValidCreateBody(overrides = {}) {
  return {
    teamId: "LOYOLA-1",
    gameType: "regular-season",
    gameDate: "2026-02-10T19:30",
    lineup: makeLineup15(),
    opponentTeamName: "Towson",
    opponentRoster: makeOppRoster15(),
    ...overrides,
  };
}

describe("gameController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("exports", () => {
    test("should export all required functions", () => {
      expect(typeof controller.create).toBe("function");
      expect(typeof controller.getAll).toBe("function");
      expect(typeof controller.getOne).toBe("function");
      expect(typeof controller.updateScore).toBe("function");
      expect(typeof controller.finishGame).toBe("function");
      expect(typeof controller.updateGameInfo).toBe("function");
      expect(typeof controller.deleteOne).toBe("function");
      expect(typeof controller.deleteAll).toBe("function");
    });
  });

  describe("create", () => {
    test("201: creates game when payload is valid", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      dao.create.mockResolvedValue({ _id: "g1" });
      await controller.create(req, res);

      expect(dao.create).toHaveBeenCalledTimes(1);
      const [gameData] = dao.create.mock.calls[0];

      expect(gameData.teamId).toBe("LOYOLA-1");
      expect(gameData.gameType).toBe("regular-season");
      expect(gameData.status).toBe("scheduled");
      expect(gameData.score).toEqual({ us: 0, them: 0 });

      // Opponent roster converted to numbers + trimmed names
      expect(gameData.opponent.teamName).toBe("Towson");
      expect(gameData.opponent.roster).toHaveLength(15);
      expect(typeof gameData.opponent.roster[0].number).toBe("number");
      expect(gameData.opponent.roster[0].name).toBe("Fabrizio2");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: "g1" });
    });

    test("400: invalid game type", async () => {
      const req = { body: makeValidCreateBody({ gameType: "bad type" }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid game type" });
    });

    test("400: invalid lineup (duplicate playerId)", async () => {
      const lineup = makeLineup15();
      //dup player
      lineup[1].playerId = lineup[0].playerId;
      const req = { body: makeValidCreateBody({ lineup }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Lineup must have exactly 15 players with unique slots 1-15",
      });
    });

    test("400: invalid opponent roster (wrong length)", async () => {
      const req = {
        body: makeValidCreateBody({ opponentRoster: makeOppRoster15().slice(0, 14) }),
      };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Opponent roster must have exactly 15 players (number + name)",
      });
    });
  });

  describe("getAll", () => {
    test("200: returns games + supports teamId + type filters", async () => {
      const req = { query: { teamId: " LOYOLA-1 ", type: "PLAYOFF" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "g1" }]);
      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ teamId: "LOYOLA-1", gameType: "playoff" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "g1" }]);
    });

    test("400: invalid game type filter", async () => {
      const req = { query: { type: "nope" } };
      const res = makeRes();

      await controller.getAll(req, res);

      expect(dao.readAll).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid game type filter" });
    });
  });

  describe("getOne", () => {
    test("200: returns game when found", async () => {
      const req = { params: { id: "g1" } };
      const res = makeRes();
      dao.read.mockResolvedValue({ _id: "g1" });

      await controller.getOne(req, res);

      expect(dao.read).toHaveBeenCalledWith("g1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: "g1" });
    });

    test("404: game not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();
      dao.read.mockResolvedValue(null);

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Game not found" });
    });
  });

  describe("updateScore", () => {
    test("200: updates score", async () => {
      const req = { params: { id: "g1" }, body: { us: 2, them: 1 } };
      const res = makeRes();
      dao.update.mockResolvedValue({ _id: "g1" });

      await controller.updateScore(req, res);

      expect(dao.update).toHaveBeenCalledWith("g1", {
        score: { us: 2, them: 1 },
        status: "in-progress",
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("400: invalid score values", async () => {
      const req = { params: { id: "g1" }, body: { us: -1, them: 2 } };
      const res = makeRes();

      await controller.updateScore(req, res);

      expect(dao.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid score values" });
    });
  });

  describe("finishGame", () => {
    test("200: sets Win result and finishes game", async () => {
      const req = { params: { id: "g1" }, body: { us: 3, them: 2 } };
      const res = makeRes();
      dao.update.mockResolvedValue({ _id: "g1", result: "Win" });

      await controller.finishGame(req, res);

      const [, update] = dao.update.mock.calls[0];
      expect(update.status).toBe("finished");
      expect(update.result).toBe("Win");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Game finished and saved to history" })
      );
    });

    test("200: sets Tie result", async () => {
      const req = { params: { id: "g1" }, body: { us: 2, them: 2 } };
      const res = makeRes();
      dao.update.mockResolvedValue({ _id: "g1", result: "Tie" });

      await controller.finishGame(req, res);

      const [, update] = dao.update.mock.calls[0];
      expect(update.result).toBe("Tie");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("updateGameInfo", () => {
    test("200: updates type/date/opponent fields", async () => {
      const req = {
        params: { id: "g1" },
        body: {
          gameType: "LEAGUE",
          gameDate: "2026-03-01T10:00",
          opponentTeamName: "Navy",
          opponentRoster: makeOppRoster15().map(p => ({ ...p, name: p.name + "s" })), // Fabrizio2s...
        },
      };
      const res = makeRes();
      dao.update.mockResolvedValue({ _id: "g1" });

      await controller.updateGameInfo(req, res);

      const [, update] = dao.update.mock.calls[0];
      expect(update.gameType).toBe("league");
      expect(update.gameDate).toBeInstanceOf(Date);
      expect(update["opponent.teamName"]).toBe("Navy");
      expect(update["opponent.roster"]).toHaveLength(15);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: "g1" });
    });

    test("400: invalid opponent team name", async () => {
      const req = { params: { id: "g1" }, body: { opponentTeamName: " " } };
      const res = makeRes();

      await controller.updateGameInfo(req, res);

      expect(dao.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid opponent team name" });
    });
  });

  describe("deleteOne", () => {
    test("200: deletes when found", async () => {
      const req = { params: { id: "g1" } };
      const res = makeRes();
      dao.del.mockResolvedValue(true);

      await controller.deleteOne(req, res);

      expect(dao.del).toHaveBeenCalledWith("g1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Game deleted successfully" });
    });

    test("404: game not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();
      dao.del.mockResolvedValue(false);

      await controller.deleteOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Game not found" });
    });
  });

  describe("deleteAll", () => {
    test("200: deletes with teamId filter", async () => {
      const req = { query: { teamId: " LOYOLA-1 " } };
      const res = makeRes();
      dao.deleteAll.mockResolvedValue(undefined);

      await controller.deleteAll(req, res);

      expect(dao.deleteAll).toHaveBeenCalledWith({ teamId: "LOYOLA-1" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Games deleted successfully" });
    });
  });
});
