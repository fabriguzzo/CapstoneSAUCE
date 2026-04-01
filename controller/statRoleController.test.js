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
  replaceTeamAssignments: vi.fn(),
};

const userDao = {
  findApprovedMembersByIds: vi.fn(),
};

const notificationDao = {
  createMany: vi.fn(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMocks() {
  const controllerPath = path.resolve(__dirname, "./statRoleController.js");
  const source = fs.readFileSync(controllerPath, "utf8");

  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;

  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };

  const localRequire = (request) => {
    if (
      request === "../model/statRoleDao" ||
      request === "../model/statRoleDao.js" ||
      request.includes("statRoleDao")
    ) {
      return dao;
    }

    if (request === "../model/userDao") return userDao;
    if (request === "../model/notificationDao") return notificationDao;

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
  return { assigneeUserId: "u1", statKey: "goals", ...overrides };
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

    test("200: applies assigneeUserId filter", async () => {
      const req = { query: { assigneeUserId: "u9" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "rX", assigneeUserId: "u9" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ assigneeUserId: "u9" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("200: applies both teamId and assigneeUserId filters", async () => {
      const req = { query: { teamId: "t1", assigneeUserId: "u1" } };
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "r1", teamId: "t1", assigneeUserId: "u1" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith({ teamId: "t1", assigneeUserId: "u1" });
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

      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "teamId is required" });
    });

    test("400: assignments not an array", async () => {
      const req = { body: { teamId: "t1", assignments: "nope" } };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "assignments must be an array" });
    });

    test("400: assignment missing assigneeUserId", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ assigneeUserId: "" })] },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(userDao.findApprovedMembersByIds).not.toHaveBeenCalled();
      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Each assignment needs assigneeUserId" });
    });

    test("400: invalid statKey (missing)", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ statKey: "" })] },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(userDao.findApprovedMembersByIds).not.toHaveBeenCalled();
      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/Invalid statKey/);
    });

    test("400: invalid statKey (unknown)", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ statKey: "notARealStat" })] },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(userDao.findApprovedMembersByIds).not.toHaveBeenCalled();
      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/Invalid statKey/);
    });

    test("400: duplicate stat assignment for the same user", async () => {
      const req = {
        body: {
          teamId: "t1",
          assignments: [
            makeValidAssignment({ assigneeUserId: "u1", statKey: "goals" }),
            makeValidAssignment({ assigneeUserId: "u1", statKey: "goals" }),
          ],
        },
      };
      const res = makeRes();

      await controller.bulkSave(req, res);

      expect(userDao.findApprovedMembersByIds).not.toHaveBeenCalled();
      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Duplicate stat assignment for assigneeUserId u1" });
    });

    test("400: assignees must be approved members on the team", async () => {
      const req = {
        user: { id: "coach1" },
        body: {
          teamId: "t1",
          assignments: [
            makeValidAssignment({ assigneeUserId: "u1", statKey: "goals" }),
            makeValidAssignment({ assigneeUserId: "u2", statKey: "assists" }),
          ],
        },
      };
      const res = makeRes();

      userDao.findApprovedMembersByIds.mockResolvedValue([{ _id: "u1", name: "Chris" }]);

      await controller.bulkSave(req, res);

      expect(userDao.findApprovedMembersByIds).toHaveBeenCalledWith(["u1", "u2"], "t1");
      expect(dao.replaceTeamAssignments).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "One or more assignees are not approved member accounts on that team" });
    });

    test("200: saves roles when valid", async () => {
      const req = {
        user: { id: "coach1" },
        body: {
          teamId: "t1",
          assignments: [
            makeValidAssignment({ assigneeUserId: "u1", statKey: "goals" }),
            makeValidAssignment({ assigneeUserId: "u1", statKey: "assists" }),
            makeValidAssignment({ assigneeUserId: "u2", statKey: "assists" }),
          ],
        },
      };
      const res = makeRes();

      userDao.findApprovedMembersByIds.mockResolvedValue([
        { _id: "u1", name: "Chris", playerId: "p1" },
        { _id: "u2", name: "Sam", playerId: null },
      ]);
      dao.readAll.mockResolvedValue([]);
      dao.replaceTeamAssignments.mockResolvedValue({ ok: 1 });
      notificationDao.createMany.mockResolvedValue([{ _id: "n1" }]);

      await controller.bulkSave(req, res);

      expect(userDao.findApprovedMembersByIds).toHaveBeenCalledWith(["u1", "u2"], "t1");
      expect(dao.readAll).toHaveBeenCalledWith({ teamId: "t1" });
      expect(dao.replaceTeamAssignments).toHaveBeenCalledWith("t1", req.body.assignments);
      expect(notificationDao.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipientUserId: "u1",
            playerId: "p1",
            teamId: "t1",
            assignedByUserId: "coach1",
            statKey: "goals",
            seen: false,
          }),
          expect.objectContaining({
            recipientUserId: "u1",
            playerId: "p1",
            teamId: "t1",
            assignedByUserId: "coach1",
            statKey: "assists",
            seen: false,
          }),
          expect.objectContaining({
            recipientUserId: "u2",
            playerId: null,
            teamId: "t1",
            assignedByUserId: "coach1",
            statKey: "assists",
            seen: false,
          }),
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Roles saved", result: { ok: 1 } });
    });

    test("500: assignee lookup throws", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ assigneeUserId: "u1", statKey: "goals" })] },
      };
      const res = makeRes();

      userDao.findApprovedMembersByIds.mockRejectedValue(new Error("mongo fail"));

      await controller.bulkSave(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to save roles" });
    });

    test("500: dao.bulkUpsert throws", async () => {
      const req = {
        body: { teamId: "t1", assignments: [makeValidAssignment({ assigneeUserId: "u1", statKey: "goals" })] },
      };
      const res = makeRes();

      userDao.findApprovedMembersByIds.mockResolvedValue([{ _id: "u1", name: "Chris", playerId: null }]);
      dao.readAll.mockResolvedValue([]);
      dao.replaceTeamAssignments.mockRejectedValue(new Error("write fail"));

      await controller.bulkSave(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to save roles" });
    });
  });
});
