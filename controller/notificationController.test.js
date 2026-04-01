import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const notificationDao = {
  readByUserId: vi.fn(),
  countUnreadByUserId: vi.fn(),
  markAllSeenByUserId: vi.fn(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMocks() {
  const controllerPath = path.resolve(__dirname, "./notificationController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };

  const localRequire = (request) => {
    if (request === "../model/notificationDao") return notificationDao;
    throw new Error(`Unexpected require in notificationController.test.js: ${request}`);
  };

  fn(module.exports, localRequire, module, controllerPath, path.dirname(controllerPath));
  return module.exports;
}

const controller = loadControllerWithMocks();

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe("notificationController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    test("should export required functions", () => {
      expect(typeof controller.getMine).toBe("function");
      expect(typeof controller.getUnreadStatus).toBe("function");
      expect(typeof controller.markMineSeen).toBe("function");
    });
  });

  describe("getMine", () => {
    test("200: returns notifications for current user", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.readByUserId.mockResolvedValue([{ _id: "n1", message: "Assigned goals" }]);

      await controller.getMine(req, res);

      expect(notificationDao.readByUserId).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "n1", message: "Assigned goals" }]);
    });

    test("500: readByUserId throws", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.readByUserId.mockRejectedValue(new Error("db fail"));

      await controller.getMine(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch notifications" });
    });
  });

  describe("getUnreadStatus", () => {
    test("200: returns unread status when unread notifications exist", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.countUnreadByUserId.mockResolvedValue(3);

      await controller.getUnreadStatus(req, res);

      expect(notificationDao.countUnreadByUserId).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ unreadCount: 3, hasUnread: true });
    });

    test("200: returns unread status when there are no unread notifications", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.countUnreadByUserId.mockResolvedValue(0);

      await controller.getUnreadStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ unreadCount: 0, hasUnread: false });
    });

    test("500: countUnreadByUserId throws", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.countUnreadByUserId.mockRejectedValue(new Error("db fail"));

      await controller.getUnreadStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch notification status" });
    });
  });

  describe("markMineSeen", () => {
    test("200: marks current user's notifications as seen", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.markAllSeenByUserId.mockResolvedValue({ modifiedCount: 2 });

      await controller.markMineSeen(req, res);

      expect(notificationDao.markAllSeenByUserId).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Notifications marked as seen",
        result: { modifiedCount: 2 },
      });
    });

    test("500: markAllSeenByUserId throws", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      notificationDao.markAllSeenByUserId.mockRejectedValue(new Error("db fail"));

      await controller.markMineSeen(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update notifications" });
    });
  });
});
