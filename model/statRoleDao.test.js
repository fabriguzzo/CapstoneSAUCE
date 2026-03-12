import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Minimal mock for mongoose.Schema that supports:
 * - new mongoose.Schema(...)
 * - schema.index(...)
 * - mongoose.Schema.Types.ObjectId
 */
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

/**
 * Mock StatRole model + chain helpers
 */
function chainLean(value) {
  return {
    lean: vi.fn(async () => value),
  };
}

const StatRole_spy = {
  find: vi.fn(),
  bulkWrite: vi.fn(),
  deleteMany: vi.fn(),
};

class StatRoleMock {
  static find(...args) {
    return StatRole_spy.find(...args);
  }
  static bulkWrite(...args) {
    return StatRole_spy.bulkWrite(...args);
  }
  static deleteMany(...args) {
    return StatRole_spy.deleteMany(...args);
  }
}

/**
 * Mock mongoose
 */
const mongooseMock = {
  Schema: SchemaMock,
  model: vi.fn((name) => {
    if (name === "StatRole") return StatRoleMock;
    throw new Error(`Unexpected mongoose.model(${name})`);
  }),
};

function loadDao() {
  const daoPath = path.resolve(__dirname, "./statRoleDao.js");
  const src = fs.readFileSync(daoPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${src}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: daoPath });

  const module = { exports: {} };
  const localRequire = (req) => {
    if (req === "mongoose") return mongooseMock;
    throw new Error(`Unexpected require in statRoleDao.test.js: ${req}`);
  };

  fn(module.exports, localRequire, module, daoPath, path.dirname(daoPath));
  return module.exports;
}

describe("statRoleDao.js", () => {
  let dao;

  beforeEach(() => {
    vi.clearAllMocks();
    dao = loadDao();

    // default behaviors
    StatRole_spy.find.mockReturnValue(chainLean([{ _id: "r1" }]));
    StatRole_spy.bulkWrite.mockResolvedValue({ ok: 1, nUpserted: 2 });
    StatRole_spy.deleteMany.mockResolvedValue({ deletedCount: 3 });
  });

  test("exports StatRole model", () => {
    expect(dao.StatRole).toBe(StatRoleMock);
  });

  test("readAll calls StatRole.find(filter).lean()", async () => {
    const rows = await dao.readAll({ teamId: "t1" });

    expect(StatRole_spy.find).toHaveBeenCalledTimes(1);
    expect(StatRole_spy.find).toHaveBeenCalledWith({ teamId: "t1" });

    // ensure lean was used by checking returned value
    expect(rows).toEqual([{ _id: "r1" }]);
  });

  test("bulkUpsert builds updateOne ops and calls bulkWrite", async () => {
    const teamId = "t1";
    const assignments = [
      { playerId: "p1", statKey: "goals" },
      { playerId: "p2", statKey: "assists" },
    ];

    await dao.bulkUpsert(teamId, assignments);

    expect(StatRole_spy.bulkWrite).toHaveBeenCalledTimes(1);

    const [ops] = StatRole_spy.bulkWrite.mock.calls[0];
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toHaveLength(2);

    expect(ops[0]).toEqual({
      updateOne: {
        filter: { teamId, playerId: "p1" },
        update: { $set: { teamId, playerId: "p1", statKey: "goals" } },
        upsert: true,
      },
    });

    expect(ops[1]).toEqual({
      updateOne: {
        filter: { teamId, playerId: "p2" },
        update: { $set: { teamId, playerId: "p2", statKey: "assists" } },
        upsert: true,
      },
    });
  });

  test("bulkUpsert with empty assignments calls bulkWrite([])", async () => {
    await dao.bulkUpsert("t1", []);
    expect(StatRole_spy.bulkWrite).toHaveBeenCalledTimes(1);
    expect(StatRole_spy.bulkWrite).toHaveBeenCalledWith([]);
  });

  test("deleteByTeam calls deleteMany({ teamId })", async () => {
    const out = await dao.deleteByTeam("t9");
    expect(StatRole_spy.deleteMany).toHaveBeenCalledTimes(1);
    expect(StatRole_spy.deleteMany).toHaveBeenCalledWith({ teamId: "t9" });
    expect(out).toEqual({ deletedCount: 3 });
  });

  test("schema index is defined (unique teamId+playerId)", () => {
    expect(schemaIndexSpy).toHaveBeenCalled();
  });
});