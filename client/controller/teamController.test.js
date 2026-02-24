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
  const controllerPath = path.resolve(__dirname, "./teamController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === "../model/teamDao.js") return dao;
    throw new Error(`Unexpected require in teamController.test.js: ${request}`);
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
    name: "Loyola Hockey",
    coach: "Coach Smith",
    description: "Loyola University Hockey Team",
    ...overrides,
  };
}

describe("teamController Module", () => {
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
    test("201: creates team when payload is valid", async () => {
      const req = { body: makeValidCreateBody() };
      const res = makeRes();

      dao.create.mockResolvedValue({ _id: "t1", name: "Loyola Hockey", coach: "Coach Smith" });
      await controller.create(req, res);

      expect(dao.create).toHaveBeenCalledTimes(1);
      const [teamData] = dao.create.mock.calls[0];

      expect(teamData.name).toBe("Loyola Hockey");
      expect(teamData.coach).toBe("Coach Smith");
      expect(teamData.description).toBe("Loyola University Hockey Team");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: "t1", name: "Loyola Hockey", coach: "Coach Smith" });
    });

    test("400: missing team name", async () => {
      const req = { body: makeValidCreateBody({ name: "" }) };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Team name is required" });
    });
  });

  describe("getAll", () => {
    test("200: returns all teams", async () => {
      const req = { query: {} };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "t1" }, { _id: "t2" }]);
      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "t1" }, { _id: "t2" }]);
    });
  });

  describe("getOne", () => {
    test("200: returns team when found", async () => {
      const req = { params: { id: "t1" } };
      const res = makeRes();
      dao.read.mockResolvedValue({ _id: "t1", name: "Loyola Hockey" });

      await controller.getOne(req, res);

      expect(dao.read).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: "t1", name: "Loyola Hockey" });
    });

    test("404: team not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();
      dao.read.mockResolvedValue(null);

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Team not found" });
    });
  });

  describe("update", () => {
    test("200: updates team when data is valid", async () => {
      const req = { params: { id: "t1" }, body: { name: "Updated Team", coach: "New Coach" } };
      const res = makeRes();
      dao.update.mockResolvedValue({ _id: "t1", name: "Updated Team", coach: "New Coach" });

      await controller.update(req, res);

      expect(dao.update).toHaveBeenCalledWith("t1", { name: "Updated Team", coach: "New Coach" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("400: invalid team name", async () => {
      const req = { params: { id: "t1" }, body: { name: "" } };
      const res = makeRes();

      await controller.update(req, res);

      expect(dao.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid team name" });
    });

    test("404: team not found", async () => {
      const req = { params: { id: "missing" }, body: { name: "New Name" } };
      const res = makeRes();
      dao.update.mockResolvedValue(null);

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Team not found" });
    });
  });

  describe("deleteOne", () => {
    test("200: deletes when found", async () => {
      const req = { params: { id: "t1" } };
      const res = makeRes();
      dao.del.mockResolvedValue(true);

      await controller.deleteOne(req, res);

      expect(dao.del).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Team deleted successfully" });
    });

    test("404: team not found", async () => {
      const req = { params: { id: "missing" } };
      const res = makeRes();
      dao.del.mockResolvedValue(false);

      await controller.deleteOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Team not found" });
    });
  });

  describe("deleteAll", () => {
    test("200: deletes all teams", async () => {
      const req = { query: {} };
      const res = makeRes();
      dao.deleteAll.mockResolvedValue(undefined);

      await controller.deleteAll(req, res);

      expect(dao.deleteAll).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Teams deleted successfully" });
    });
  });
});
