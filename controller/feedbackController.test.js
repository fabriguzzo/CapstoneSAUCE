import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const dao = {
  readAll: vi.fn(),
  create: vi.fn(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMockedDao() {
  const controllerPath = path.resolve(__dirname, "./feedbackController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === "../model/feedbackDao.js") return dao;
    throw new Error(`Unexpected require in feedbackController.test.js: ${request}`);
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

describe("feedbackController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    test("should export required functions", () => {
      expect(typeof controller.getAll).toBe("function");
      expect(typeof controller.create).toBe("function");
    });
  });

  describe("getAll", () => {
    test("200: returns all feedback", async () => {
      const req = {};
      const res = makeRes();

      dao.readAll.mockResolvedValue([{ _id: "f1" }, { _id: "f2" }]);

      await controller.getAll(req, res);

      expect(dao.readAll).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "f1" }, { _id: "f2" }]);
    });

    test("500: readAll throws", async () => {
      const req = {};
      const res = makeRes();

      dao.readAll.mockRejectedValue(new Error("db fail"));

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to retrieve feedback" });
    });
  });

  describe("create", () => {
    test("200: saves feedback when payload is valid", async () => {
      const req = {
        body: {
          email: "user@example.com",
          subject: "Feature request",
          message: "Please add notifications",
          timestamp: "2026-04-01T12:00:00.000Z",
        },
      };
      const res = makeRes();

      dao.create.mockResolvedValue({ _id: "f1" });

      await controller.create(req, res);

      expect(dao.create).toHaveBeenCalledWith({
        email: "user@example.com",
        subject: "Feature request",
        message: "Please add notifications",
        timestamp: "2026-04-01T12:00:00.000Z",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Feedback saved successfully" });
    });

    test("400: missing required fields", async () => {
      const req = {
        body: {
          email: "",
          subject: "Feature request",
          message: "Please add notifications",
        },
      };
      const res = makeRes();

      await controller.create(req, res);

      expect(dao.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email, subject, and message are required" });
    });

    test("200: uses current date when timestamp is omitted", async () => {
      const req = {
        body: {
          email: "user@example.com",
          subject: "Bug report",
          message: "Something broke",
        },
      };
      const res = makeRes();

      dao.create.mockResolvedValue({ _id: "f1" });

      await controller.create(req, res);

      expect(dao.create).toHaveBeenCalledTimes(1);
      const [feedbackData] = dao.create.mock.calls[0];
      expect(feedbackData.email).toBe("user@example.com");
      expect(feedbackData.subject).toBe("Bug report");
      expect(feedbackData.message).toBe("Something broke");
      expect(feedbackData.timestamp).toBeInstanceOf(Date);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("500: create throws", async () => {
      const req = {
        body: {
          email: "user@example.com",
          subject: "Feature request",
          message: "Please add notifications",
        },
      };
      const res = makeRes();

      dao.create.mockRejectedValue(new Error("db fail"));

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to save feedback" });
    });
  });
});
