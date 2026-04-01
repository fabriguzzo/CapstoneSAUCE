import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchemaMock {
  constructor(def, opts) {
    this.def = def;
    this.opts = opts;
  }
}

function chainSortLean(value) {
  return {
    sort: vi.fn(() => ({
      lean: vi.fn(async () => value),
    })),
  };
}

const feedbackSpy = {
  save: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  deleteMany: vi.fn(),
};

class FeedbackMock {
  constructor(data) {
    this.data = data;
  }

  save() {
    return feedbackSpy.save(this.data);
  }

  static find(...args) {
    return feedbackSpy.find(...args);
  }

  static findById(...args) {
    return feedbackSpy.findById(...args);
  }

  static deleteMany(...args) {
    return feedbackSpy.deleteMany(...args);
  }
}

const mongooseMock = {
  Schema: SchemaMock,
  model: vi.fn((name) => {
    if (name === "Feedback") return FeedbackMock;
    throw new Error(`Unexpected mongoose.model(${name})`);
  }),
};

function loadDao() {
  const daoPath = path.resolve(__dirname, "./feedbackDao.js");
  const src = fs.readFileSync(daoPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${src}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: daoPath });

  const module = { exports: {} };
  const localRequire = (req) => {
    if (req === "mongoose") return mongooseMock;
    throw new Error(`Unexpected require in feedbackDao.test.js: ${req}`);
  };

  fn(module.exports, localRequire, module, daoPath, path.dirname(daoPath));
  return module.exports;
}

describe("feedbackDao.js", () => {
  let dao;

  beforeEach(() => {
    vi.clearAllMocks();
    dao = loadDao();

    feedbackSpy.save.mockResolvedValue({ _id: "f1" });
    feedbackSpy.find.mockReturnValue(chainSortLean([{ _id: "f1" }]));
    feedbackSpy.findById.mockReturnValue({
      lean: vi.fn(async () => ({ _id: "f1", subject: "Bug" })),
    });
    feedbackSpy.deleteMany.mockResolvedValue({ deletedCount: 2 });
  });

  test("create instantiates Feedback and saves it", async () => {
    const data = {
      email: "user@example.com",
      subject: "Bug",
      message: "Something broke",
      timestamp: new Date("2026-04-01T12:00:00.000Z"),
    };

    const result = await dao.create(data);

    expect(feedbackSpy.save).toHaveBeenCalledWith(data);
    expect(result).toEqual({ _id: "f1" });
  });

  test("readAll calls find(filter).sort({ timestamp: -1 }).lean()", async () => {
    const rows = await dao.readAll({ email: "user@example.com" });

    expect(feedbackSpy.find).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(rows).toEqual([{ _id: "f1" }]);
  });

  test("read calls findById(id).lean()", async () => {
    const row = await dao.read("f1");

    expect(feedbackSpy.findById).toHaveBeenCalledWith("f1");
    expect(row).toEqual({ _id: "f1", subject: "Bug" });
  });

  test("deleteAll calls deleteMany(filter)", async () => {
    const result = await dao.deleteAll({ email: "user@example.com" });

    expect(feedbackSpy.deleteMany).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(result).toEqual({ deletedCount: 2 });
  });
});
