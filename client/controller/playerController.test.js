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
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMockedDao() {
  const controllerPath = path.resolve(__dirname, "./playerController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === "../model/playerDao.js") return dao;
    throw new Error(`Unexpected require in playerController.test.js: ${request}`);
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

function makeValidCreateBody(overrides = {}) {
  return {
    name: "John Doe",
    number: 10,
    teamId: "team123",
    position: "Forward",
    ...overrides,
  };
}

describe("playerController Module", () => {
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
    });
  });

  describe("create", () => {
    test("201: creates player when payload is valid", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      dao.create.mockResolvedValue({ _id: "p1", name: "John Doe", number: 10 });
      await controller.create(req, res);

      expect(dao.create).toHaveBeenCalledTimes(1);
      const [playerData] = dao.create.mock.calls[0];

      expect(playerData.name).toBe("John Doe");
      expect(playerData.number).toBe(10);
      expect(playerData.teamId).toBe("team123");
      expect(playerData.position).toBe("Forward");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: "p1", name: "John Doe", number: 10 });
    });

    test("400: missing player name", async () => {
      const req = { body: makeValidCreateBody({ name: "" }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Player name is required" });
    });

    test("400: invalid player number", async () => {
      const req = { body: makeValidCreateBody({ number: -1 }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Player number must be a positive integer" });
    });

    test("400: missing team ID", async () => {
      const req = { body: makeValidCreateBody({ teamId: "" }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Team ID is required" });
    });
  });

  describe("getAll", () => {
    test("200: returns all players", async () => {
      const req = { query: {} };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "p1" }, { _id: "p2" }]);
      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "p1" }, { _id: "p2" }]);
    });

    test("200: returns players filtered by teamId", async () => {
      const req = { query: { teamId: "team123" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "p1" }]);
      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ teamId: "team123" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getOne", () => {
    test("200: returns player when found", async () => {
      const req = { params: { id: "p1" } };
      const res = makeRes();
      dao.read.mockResolvedValue({ _id: "p1", name: "John Doe" });

      await controller.getOne(req, res);

      expect(dao.read).toHaveBeenCalledWith("p1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: "p1", name: "John Doe" });
    });

    test("404: player not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();
      dao.read.mockResolvedValue(null);

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Player not found" });
    });
  });

  describe("update", () => {
    test("200: updates player when data is valid", async () => {
      const req = { params: { id: "p1" }, body: { name: "Jane Doe", number: 20 } };
      const res = makeRes();
      dao.update.mockResolvedValue({ _id: "p1", name: "Jane Doe", number: 20 });

      await controller.update(req, res);

      expect(dao.update).toHaveBeenCalledWith("p1", { name: "Jane Doe", number: 20 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("400: invalid player name", async () => {
      const req = { params: { id: "p1" }, body: { name: "" } };
      const res = makeRes();

      await controller.update(req, res);

      expect(dao.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid player name" });
    });

    test("400: invalid player number", async () => {
      const req = { params: { id: "p1" }, body: { number: -5 } };
      const res = makeRes();

      await controller.update(req, res);

      expect(dao.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Player number must be a positive integer" });
    });

    test("404: player not found", async () => {
      const req = { params: { id: "missing" }, body: { name: "Jane Doe" } };
      const res = makeRes();
      dao.update.mockResolvedValue(null);

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Player not found" });
    });
  });

  describe("deleteOne", () => {
    test("200: deletes when found", async () => {
      const req = { params: { id: "p1" } };
      const res = makeRes();
      dao.del.mockResolvedValue(true);

      await controller.deleteOne(req, res);

      expect(dao.del).toHaveBeenCalledWith("p1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Player deleted successfully" });
    });

    test("404: player not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();
      dao.del.mockResolvedValue(false);

      await controller.deleteOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Player not found" });
    });
  });

  describe("deleteAll", () => {
    test("200: deletes all players", async () => {
      const req = { query: {} };
      const res = makeRes();
      dao.deleteAll.mockResolvedValue(undefined);

      await controller.deleteAll(req, res);

      expect(dao.deleteAll).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Players deleted successfully" });
    });

    test("200: deletes players filtered by teamId", async () => {
      const req = { query: { teamId: "team123" } };
      const res = makeRes();
      dao.deleteAll.mockResolvedValue(undefined);

      await controller.deleteAll(req, res);

      expect(dao.deleteAll).toHaveBeenCalledWith({ teamId: "team123" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
