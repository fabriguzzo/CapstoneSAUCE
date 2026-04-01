import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaIndexSpy = vi.fn();

class ObjectIdMock {
  constructor(v) {
    this.value = v;
  }
}

function SchemaMock(def, opts) {
  this.def = def;
  this.opts = opts;
  this.index = schemaIndexSpy;
}
SchemaMock.Types = { ObjectId: ObjectIdMock };

function chainSortLean(value) {
  return {
    sort: vi.fn(() => ({
      lean: vi.fn(async () => value),
    })),
  };
}

const Notification_spy = {
  insertMany: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
  updateMany: vi.fn(),
};

class NotificationMock {
  static insertMany(...args) {
    return Notification_spy.insertMany(...args);
  }
  static find(...args) {
    return Notification_spy.find(...args);
  }
  static countDocuments(...args) {
    return Notification_spy.countDocuments(...args);
  }
  static updateMany(...args) {
    return Notification_spy.updateMany(...args);
  }
}

const mongooseMock = {
  Schema: SchemaMock,
  model: vi.fn((name) => {
    if (name === "Notification") return NotificationMock;
    throw new Error(`Unexpected mongoose.model(${name})`);
  }),
};

function loadDao() {
  const daoPath = path.resolve(__dirname, "./notificationDao.js");
  const src = fs.readFileSync(daoPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${src}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: daoPath });

  const module = { exports: {} };
  const localRequire = (req) => {
    if (req === "mongoose") return mongooseMock;
    throw new Error(`Unexpected require in notificationDao.test.js: ${req}`);
  };

  fn(module.exports, localRequire, module, daoPath, path.dirname(daoPath));
  return module.exports;
}

describe("notificationDao.js", () => {
  let dao;

  beforeEach(() => {
    vi.clearAllMocks();
    dao = loadDao();

    Notification_spy.insertMany.mockResolvedValue([{ _id: "n1" }]);
    Notification_spy.find.mockReturnValue(chainSortLean([{ _id: "n1" }]));
    Notification_spy.countDocuments.mockResolvedValue(2);
    Notification_spy.updateMany.mockResolvedValue({ modifiedCount: 2 });
  });

  test("exports Notification model", () => {
    expect(dao.Notification).toBe(NotificationMock);
  });

  test("createMany returns [] without calling insertMany when input is empty", async () => {
    const result = await dao.createMany([]);

    expect(Notification_spy.insertMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test("createMany calls insertMany with notifications", async () => {
    const notifications = [{ recipientUserId: "u1", message: "Assigned goals" }];

    const result = await dao.createMany(notifications);

    expect(Notification_spy.insertMany).toHaveBeenCalledWith(notifications);
    expect(result).toEqual([{ _id: "n1" }]);
  });

  test("readByUserId calls find().sort().lean()", async () => {
    const rows = await dao.readByUserId("u1");

    expect(Notification_spy.find).toHaveBeenCalledWith({ recipientUserId: "u1" });
    expect(rows).toEqual([{ _id: "n1" }]);
  });

  test("countUnreadByUserId calls countDocuments with seen false filter", async () => {
    const count = await dao.countUnreadByUserId("u1");

    expect(Notification_spy.countDocuments).toHaveBeenCalledWith({
      recipientUserId: "u1",
      seen: false,
    });
    expect(count).toBe(2);
  });

  test("markAllSeenByUserId calls updateMany with seen filter and update", async () => {
    const result = await dao.markAllSeenByUserId("u1");

    expect(Notification_spy.updateMany).toHaveBeenCalledWith(
      { recipientUserId: "u1", seen: false },
      { $set: { seen: true } }
    );
    expect(result).toEqual({ modifiedCount: 2 });
  });

  test("schema index is defined", () => {
    expect(schemaIndexSpy).toHaveBeenCalled();
  });
});
