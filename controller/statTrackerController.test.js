import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const dao = {
  create: vi.fn(),
  readAll: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  deleteAll: vi.fn(),
  bulkUpsert: vi.fn(),

  getHistory: vi.fn(),
  getPlayerHistory: vi.fn(),
  getGameHistory: vi.fn(),

  EVENT_TYPES: ['faceoff', 'hit', 'penalty', 'goal', 'assist', 'shot', 'save', 'goal_against'],
  createEvent: vi.fn(),
  getEventsByGame: vi.fn(),
  deleteLastEvent: vi.fn(),
};


const Player = {
  countDocuments: vi.fn(),
};

const mongooseMock = {
  model: vi.fn((name) => {
    if (name !== "Player") throw new Error(`Unexpected mongoose.model(${name}) in test`);
    return Player;
  }),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMockedDeps() {
  const controllerPath = path.resolve(__dirname, "./statTrackerController.js");
  const source = fs.readFileSync(controllerPath, "utf8");

  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });

  const module = { exports: {} };

  const localRequire = (request) => {
    if (request === "../model/statTrackerDao.js") return dao;
    if (request === "mongoose") return mongooseMock;
    throw new Error(`Unexpected require in statTrackerController.test.js: ${request}`);
  };

  fn(module.exports, localRequire, module, controllerPath, path.dirname(controllerPath));
  return module.exports;
}

const controller = loadControllerWithMockedDeps();

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function makeValidCreateBody(overrides = {}) {
  return {
    gameId: "g1",
    teamId: "t1",
    playerId: "p1",
    goals: 1,
    assists: 0,
    shots: 2,
    hits: 0,
    pim: 0,
    plusMinus: 0,
    saves: 0,
    goalsAgainst: 0,
    ...overrides,
  };
}

function makeValidBulkBody(overrides = {}) {
  return {
    gameId: "g1",
    teamId: "t1",
    lines: [
      {
        playerId: "p1",
        goals: 1,
        assists: 0,
        shots: 2,
        hits: 0,
        pim: 0,
        plusMinus: 0,
        saves: 0,
        goalsAgainst: 0,
      },
      {
        playerId: "p2",
        goals: 0,
        assists: 1,
        shots: 1,
        hits: 1,
        pim: 0,
        plusMinus: -1,
        saves: 0,
        goalsAgainst: 0,
      },
    ],
    ...overrides,
  };
}

describe("statTrackerController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    test("should export all required functions", () => {
      expect(typeof controller.create).toBe("function");
      expect(typeof controller.getAll).toBe("function");
      expect(typeof controller.getOne).toBe("function");
      expect(typeof controller.update).toBe("function");
      expect(typeof controller.deleteOne).toBe("function");
      expect(typeof controller.deleteAll).toBe("function");
      expect(typeof controller.bulkSave).toBe("function");
      expect(typeof controller.getHistory).toBe("function");
      expect(typeof controller.getPlayerHistory).toBe("function");
      expect(typeof controller.getGameHistory).toBe("function");
      expect(typeof controller.createEvent).toBe("function");
      expect(typeof controller.getEventsByGame).toBe("function");
      expect(typeof controller.undoLastEvent).toBe("function");
    });

  });

  describe("create", () => {
    test("201: creates stat line when payload is valid and player belongs to team", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(1);
      dao.create.mockResolvedValue({ _id: "s1", ...req.body });

      await controller.create(req, res);

      expect(Player.countDocuments).toHaveBeenCalledWith({ _id: "p1", teamId: "t1" });
      expect(dao.create).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: "s1", ...req.body });
    });

    test("400: missing gameId", async () => {
      const req = { body: makeValidCreateBody({ gameId: "" }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Game ID is required" });
    });

    test("400: player does not belong to team", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(0);

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Player does not belong to the provided team" });
    });

    test("400: invalid stat payload (negative goals)", async () => {
      const req = { body: makeValidCreateBody({ goals: -1 }) };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(1);

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "goals must be a non-negative integer" });
    });

    test("400: duplicate key error (11000)", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(1);
      const err = new Error("dup");
      err.code = 11000;
      dao.create.mockRejectedValue(err);

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Stat line already exists for this player in this game",
      });
    });

    test("500: create throws unknown error", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(1);
      dao.create.mockRejectedValue(new Error("boom"));

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to create stat line" });
    });
  });

  describe("getAll", () => {
    test("200: returns filtered stat lines", async () => {
      const req = { query: { gameId: "g1", teamId: "t1", playerId: "p1" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([
        { playerId: "p1", gameId: "g1", teamId: "t1", goals: 1, assists: 0, shots: 0, hits: 0, pim: 0, plusMinus: 0, saves: 0, goalsAgainst: 0 },
      ]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ gameId: "g1", teamId: "t1", playerId: "p1" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ gameId: "g1", teamId: "t1", goals: 1 }),
      ]);
    });

    test("500: readAll throws", async () => {
      const req = { query: {} };
      const res = makeRes();

      dao.readAll.mockRejectedValue(new Error("boom"));

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to retrieve stat lines" });
    });
  });

  describe("getOne", () => {
    test("200: returns stat line when found", async () => {
      const req = { params: { id: "s1" } };
      const res = makeRes();

      dao.read.mockResolvedValue({ _id: "s1", goals: 1 });

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: "s1", goals: 1 });
    });

    test("404: stat line not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();

      dao.read.mockResolvedValue(null);

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Stat line not found" });
    });
  });

  describe("update", () => {
    test("200: updates stat line when valid", async () => {
      const req = { params: { id: "s1" }, body: { goals: 2, plusMinus: -1 } };
      const res = makeRes();

      dao.update.mockResolvedValue({ _id: "s1", goals: 2, plusMinus: -1 });

      await controller.update(req, res);

      expect(dao.update).toHaveBeenCalledWith("s1", { goals: 2, plusMinus: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("400: invalid update payload", async () => {
      const req = { params: { id: "s1" }, body: { shots: -10 } };
      const res = makeRes();

      await controller.update(req, res);

      expect(dao.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "shots must be a non-negative integer" });
    });
  });

  describe("deleteOne", () => {
    test("200: deletes when found", async () => {
      const req = { params: { id: "s1" } };
      const res = makeRes();

      dao.del.mockResolvedValue(true);

      await controller.deleteOne(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Stat line deleted successfully" });
    });

    test("404: not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();

      dao.del.mockResolvedValue(false);

      await controller.deleteOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Stat line not found" });
    });
  });

  describe("deleteAll", () => {
    test("200: deletes all with filters", async () => {
      const req = { query: { teamId: "t1", gameId: "g1" } };
      const res = makeRes();

      dao.deleteAll.mockResolvedValue(undefined);

      await controller.deleteAll(req, res);

      expect(dao.deleteAll).toHaveBeenCalledWith({ teamId: "t1", gameId: "g1" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("bulkSave", () => {
    test("400: lines must be non-empty array", async () => {
      const req = { body: makeValidBulkBody({ lines: [] }) };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "lines must be a non-empty array" });
    });

    test("400: player count mismatch", async () => {
      const req = { body: makeValidBulkBody() };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(1);

      await controller.bulkSave(req, res);

      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "One or more players do not belong to the provided team" });
    });

    test("200: bulk saves when all players belong to team", async () => {
      const req = { body: makeValidBulkBody() };
      const res = makeRes();

      Player.countDocuments.mockResolvedValue(2);
      dao.bulkUpsert.mockResolvedValue({ ok: 1 });

      await controller.bulkSave(req, res);

      expect(dao.bulkUpsert).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Stats saved", result: { ok: 1 } });
    });
  });

  describe("history endpoints", () => {
    test("getHistory 200", async () => {
      const req = { query: { teamId: "t1" } };
      const res = makeRes();

      dao.getHistory.mockResolvedValue([{ x: 1 }]);

      await controller.getHistory(req, res);

      expect(dao.getHistory).toHaveBeenCalledWith({ teamId: "t1" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ x: 1 }]);
    });

    test("getPlayerHistory 400 missing gameId", async () => {
      const req = { query: { playerId: "p1" } };
      const res = makeRes();

      await controller.getPlayerHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Game ID is required" });
    });

    test("getGameHistory 400 missing gameId", async () => {
      const req = { params: {}, query: {} };
      const res = makeRes();

      await controller.getGameHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Game ID is required" });
    });
  });

  describe("event endpoints", () => {
    test("createEvent 201: valid faceoff event", async () => {
      const req = {
        body: {
          gameId: "g1", teamId: "t1", eventType: "faceoff", team: "home",
          homePlayerId: "p1", homePlayerName: "Player One", homePlayerNumber: 10,
          awayPlayerName: "Opp One", awayPlayerNumber: 5, winner: "home",
          period: 1, clockSecondsRemaining: 900, gameSecondsElapsed: 300,
        },
      };
      const res = makeRes();
      dao.createEvent.mockResolvedValue({ _id: "e1", ...req.body });

      await controller.createEvent(req, res);

      expect(dao.createEvent).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("createEvent 400: invalid eventType", async () => {
      const req = { body: { gameId: "g1", teamId: "t1", eventType: "invalid", team: "home" } };
      const res = makeRes();

      await controller.createEvent(req, res);

      expect(dao.createEvent).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("createEvent 400: faceoff missing winner", async () => {
      const req = {
        body: {
          gameId: "g1", teamId: "t1", eventType: "faceoff", team: "home",
          homePlayerName: "P1", awayPlayerName: "O1",
        },
      };
      const res = makeRes();

      await controller.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("createEvent 201: valid hit event", async () => {
      const req = {
        body: {
          gameId: "g1", teamId: "t1", eventType: "hit", team: "away",
          awayPlayerName: "Opp Two", awayPlayerNumber: 8,
        },
      };
      const res = makeRes();
      dao.createEvent.mockResolvedValue({ _id: "e2", ...req.body });

      await controller.createEvent(req, res);

      expect(dao.createEvent).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("createEvent 400: penalty without valid penaltyMinutes", async () => {
      const req = {
        body: { gameId: "g1", teamId: "t1", eventType: "penalty", team: "home" },
      };
      const res = makeRes();

      await controller.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("getEventsByGame 200", async () => {
      const req = { query: { gameId: "g1" } };
      const res = makeRes();
      dao.getEventsByGame.mockResolvedValue([{ _id: "e1" }]);

      await controller.getEventsByGame(req, res);

      expect(dao.getEventsByGame).toHaveBeenCalledWith("g1", null);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("getEventsByGame 200 with eventType filter", async () => {
      const req = { query: { gameId: "g1", eventType: "faceoff" } };
      const res = makeRes();
      dao.getEventsByGame.mockResolvedValue([]);

      await controller.getEventsByGame(req, res);

      expect(dao.getEventsByGame).toHaveBeenCalledWith("g1", "faceoff");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("getEventsByGame 400 missing gameId", async () => {
      const req = { query: {} };
      const res = makeRes();

      await controller.getEventsByGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("undoLastEvent 200", async () => {
      const req = { body: { gameId: "g1", eventType: "hit" } };
      const res = makeRes();
      dao.deleteLastEvent.mockResolvedValue({ _id: "e1" });

      await controller.undoLastEvent(req, res);

      expect(dao.deleteLastEvent).toHaveBeenCalledWith("g1", "hit");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("undoLastEvent 404 when nothing to undo", async () => {
      const req = { body: { gameId: "g1" } };
      const res = makeRes();
      dao.deleteLastEvent.mockResolvedValue(null);

      await controller.undoLastEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("undoLastEvent 400 missing gameId", async () => {
      const req = { body: {} };
      const res = makeRes();

      await controller.undoLastEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
