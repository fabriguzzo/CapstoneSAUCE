import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

/**
 * Mocks
 */
const dao = {
  readAll: vi.fn(),
  bulkUpsert: vi.fn(),
};

const playerModelMock = {
  countDocuments: vi.fn(),
};

const mongooseMock = {
  model: vi.fn((name) => {
    if (name === "Player") return playerModelMock;
    throw new Error(`Unexpected mongoose.model(${name})`);
  }),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMocks() {
  const controllerPath = path.resolve(__dirname, "./statRoleController.js");
  const source = fs.readFileSync(controllerPath, "utf8");

  const injectedPrelude = `const dao = globalThis.__daoMock;\n`;

  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${injectedPrelude}${source}\n})`;

  globalThis.__daoMock = dao;

  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };

  const localRequire = (request) => {
    if (request === "mongoose") return mongooseMock;

    if (request === "../model/playerDao" || request === "../model/playerDao.js") return {};

    if (
      request === "../model/statRoleDao" ||
      request === "../model/statRoleDao.js" ||
      request.includes("statRoleDao")
    ) {
      return dao;
    }

    throw new Error(`Unexpected require in statRoleController.test.js: ${request}`);
  };

  fn(module.exports, localRequire, module, controllerPath, path.dirname(controllerPath));
  return module.exports;
}

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function makeValidAssignment(overrides = {}) {
  return { playerId: "p1", statKey: "goals", ...overrides };
}

const controller = loadControllerWithMocks();

describe("statRoleController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    test("should export required functions", () => {
      expect(typeof controller.getAll).toBe("function");
      expect(typeof controller.bulkSave).toBe("function");
    });
  });

  describe("getAll", () => {
    test("200: returns all rows with no filters", async () => {
      const req = { query: {} };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "r1" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledTimes(1);
      expect(dao.readAll).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "r1" }]);
    });

    test("200: applies teamId filter", async () => {
      const req = { query: { teamId: "t1" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "r1", teamId: "t1" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ teamId: "t1" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("200: applies playerId filter", async () => {
      const req = { query: { playerId: "p9" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "rX", playerId: "p9" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ playerId: "p9" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("200: applies both teamId and playerId filters", async () => {
      const req = { query: { teamId: "t1", playerId: "p1" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "r1", teamId: "t1", playerId: "p1" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ teamId: "t1", playerId: "p1" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("500: dao.readAll throws", async () => {
      const req = { query: { teamId: "t1" } };
      const res = makeRes();

      dao.readAll.mockRejectedValue(new Error("db down"));

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to load stat roles" });
    });
  });

  describe("bulkSave", () => {
    test("400: missing teamId", async () => {
      const req = { body: { assignments: [makeValidAssignment()] } };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "teamId is required" });
    });

    test("400: assignments not an array", async () => {
      const req = { body: { teamId: "t1", assignments: "nope" } };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "assignments must be an array" });
    });

    test("400: assignment missing playerId", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ playerId: "" })] },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(playerModelMock.countDocuments).not.toHaveBeenCalled();
      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Each assignment needs playerId" });
    });

    test("400: invalid statKey (missing)", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ statKey: "" })] },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(playerModelMock.countDocuments).not.toHaveBeenCalled();
      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/Invalid statKey/);
    });

    test("400: invalid statKey (unknown)", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ statKey: "notARealStat" })] },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(playerModelMock.countDocuments).not.toHaveBeenCalled();
      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/Invalid statKey/);
    });

    test("400: players do not all belong to team (count mismatch)", async () => {
      const req = {
        body: {
          teamId: "t1",
          assignments: [
            makeValidAssignment({ playerId: "p1", statKey: "goals" }),
            makeValidAssignment({ playerId: "p2", statKey: "assists" }),
          ],
        },
      };
      const res = makeRes();

      playerModelMock.countDocuments.mockResolvedValue(1);

      await controller.bulkSave(req, res);

      expect(playerModelMock.countDocuments).toHaveBeenCalledWith({
        _id: { $in: ["p1", "p2"] },
        teamId: "t1",
      });
      expect(dao.bulkUpsert).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "One or more players do not belong to that team" });
    });

    test("200: saves roles when valid", async () => {
      const req = {
        body: {
          teamId: "t1",
          assignments: [
            makeValidAssignment({ playerId: "p1", statKey: "goals" }),
            makeValidAssignment({ playerId: "p2", statKey: "assists" }),
          ],
        },
      };
      const res = makeRes();

      playerModelMock.countDocuments.mockResolvedValue(2);
      dao.bulkUpsert.mockResolvedValue({ ok: 1 });

      await controller.bulkSave(req, res);

      expect(playerModelMock.countDocuments).toHaveBeenCalledWith({
        _id: { $in: ["p1", "p2"] },
        teamId: "t1",
      });
      expect(dao.bulkUpsert).toHaveBeenCalledWith("t1", req.body.assignments);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Roles saved", result: { ok: 1 } });
    });

    test("500: Player.countDocuments throws", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ playerId: "p1", statKey: "goals" })] },
      };
      const res = makeRes();

      playerModelMock.countDocuments.mockRejectedValue(new Error("mongo fail"));

      await controller.bulkSave(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to save roles" });
    });

    test("500: dao.bulkUpsert throws", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ playerId: "p1", statKey: "goals" })] },
      };
      const res = makeRes();

      playerModelMock.countDocuments.mockResolvedValue(1);
      dao.bulkUpsert.mockRejectedValue(new Error("write fail"));

      await controller.bulkSave(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to save roles" });
    });
  });
});