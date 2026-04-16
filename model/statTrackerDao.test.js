import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function chainResult(value) {
  return {
    sort: vi.fn(() => ({
      lean: vi.fn(async () => value),
    })),
    lean: vi.fn(async () => value),
  };
}

function isValid24Hex(v) {
  return typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
}

//Mongoose mocks
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

const TypesMock = {
  ObjectId: ObjectIdMock,
};
TypesMock.ObjectId.isValid = vi.fn((v) => isValid24Hex(v));

//Model method sys
const StatLine_spy = {
  find: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
  deleteMany: vi.fn(),
  bulkWrite: vi.fn(),
};
const StatHistory_spy = {
  find: vi.fn(),
  bulkWrite: vi.fn(),
};
const GameEvent_spy = {
  find: vi.fn(),
  findOne: vi.fn(),
  findByIdAndDelete: vi.fn(),
  deleteMany: vi.fn(),
};

const statLineSaveSpy = vi.fn(async () => true);
const statHistorySaveSpy = vi.fn(async () => true);
const gameEventSaveSpy = vi.fn(async () => true);

class StatLineMock {
  constructor(data) {
    this.data = data;
  }
  save = statLineSaveSpy;

  static find(...args) {
    return StatLine_spy.find(...args);
  }
  static findById(...args) {
    return StatLine_spy.findById(...args);
  }
  static findByIdAndUpdate(...args) {
    return StatLine_spy.findByIdAndUpdate(...args);
  }
  static findByIdAndDelete(...args) {
    return StatLine_spy.findByIdAndDelete(...args);
  }
  static deleteMany(...args) {
    return StatLine_spy.deleteMany(...args);
  }
  static bulkWrite(...args) {
    return StatLine_spy.bulkWrite(...args);
  }
}

class StatHistoryMock {
  constructor(doc) {
    this.doc = doc;
  }
  save = statHistorySaveSpy;

  static find(...args) {
    return StatHistory_spy.find(...args);
  }
  static bulkWrite(...args) {
    return StatHistory_spy.bulkWrite(...args);
  }
}

class GameEventMock {
  constructor(data) {
    this.data = data;
  }
  save = gameEventSaveSpy;

  static find(...args) {
    return GameEvent_spy.find(...args);
  }
  static findOne(...args) {
    return GameEvent_spy.findOne(...args);
  }
  static findByIdAndDelete(...args) {
    return GameEvent_spy.findByIdAndDelete(...args);
  }
  static deleteMany(...args) {
    return GameEvent_spy.deleteMany(...args);
  }
}

const PossessionSnapshot_spy = {
  find: vi.fn(),
  findOne: vi.fn(),
  deleteMany: vi.fn(),
};
const possessionSaveSpy = vi.fn(async () => true);

class PossessionSnapshotMock {
  constructor(data) {
    this.data = data;
  }
  save = possessionSaveSpy;

  static find(...args) {
    return PossessionSnapshot_spy.find(...args);
  }
  static findOne(...args) {
    return PossessionSnapshot_spy.findOne(...args);
  }
  static deleteMany(...args) {
    return PossessionSnapshot_spy.deleteMany(...args);
  }
}

const mongooseMock = {
  Schema: SchemaMock,
  model: vi.fn((name) => {
    if (name === "StatHistory") return StatHistoryMock;
    if (name === "StatLine") return StatLineMock;
    if (name === "GameEvent") return GameEventMock;
    if (name === "PossessionSnapshot") return PossessionSnapshotMock;
    throw new Error(`Unexpected mongoose.model(${name})`);
  }),
  Types: TypesMock,
};

function loadDao() {
  const daoPath = path.resolve(__dirname, "./statTrackerDao.js");
  const src = fs.readFileSync(daoPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${src}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: daoPath });

  const module = { exports: {} };
  const localRequire = (req) => {
    if (req === "mongoose") return mongooseMock;
    throw new Error(`Unexpected require: ${req}`);
  };

  fn(module.exports, localRequire, module, daoPath, path.dirname(daoPath));
  return module.exports;
}

describe("statTrackerDao.js", () => {
  let dao;

  beforeEach(() => {
    vi.clearAllMocks();
    dao = loadDao();

    //defaults
    StatLine_spy.find.mockReturnValue(chainResult([{ _id: "s1" }]));
    StatLine_spy.findById.mockReturnValue({ lean: vi.fn(async () => ({ _id: "s1", goals: 1 })) });
    StatLine_spy.findByIdAndUpdate.mockReturnValue({ lean: vi.fn(async () => ({ _id: "s1", goals: 5 })) });
    StatLine_spy.findByIdAndDelete.mockReturnValue({ lean: vi.fn(async () => ({ _id: "s1" })) });
    StatLine_spy.deleteMany.mockResolvedValue({ deletedCount: 2 });
    StatLine_spy.bulkWrite.mockResolvedValue({ ok: 1 });

    StatHistory_spy.find.mockReturnValue(chainResult([{ _id: "h1" }]));
    StatHistory_spy.bulkWrite.mockResolvedValue({ ok: 1 });

    GameEvent_spy.find.mockReturnValue(chainResult([{ _id: "e1", eventType: "faceoff" }]));
    GameEvent_spy.findOne.mockReturnValue({ sort: vi.fn(() => ({ _id: "e1" })) });

    PossessionSnapshot_spy.find.mockReturnValue(chainResult([{ _id: "p1", homeSeconds: 30, awaySeconds: 20 }]));
    PossessionSnapshot_spy.findOne.mockReturnValue({ sort: vi.fn(() => ({ lean: vi.fn(async () => ({ _id: "p1", homeSeconds: 30, awaySeconds: 20 })) })) });
    PossessionSnapshot_spy.deleteMany.mockResolvedValue({ deletedCount: 1 });
    GameEvent_spy.findByIdAndDelete.mockReturnValue({ lean: vi.fn(async () => ({ _id: "e1" })) });
    GameEvent_spy.deleteMany.mockResolvedValue({ deletedCount: 1 });

    TypesMock.ObjectId.isValid.mockImplementation((v) => isValid24Hex(v));
  });

  test("exports models", () => {
    expect(dao.StatLine).toBe(StatLineMock);
    expect(dao.StatHistory).toBe(StatHistoryMock);
    expect(dao.GameEvent).toBe(GameEventMock);
    expect(dao.EVENT_TYPES).toEqual(["faceoff", "hit", "penalty", "goal", "assist", "shot", "save", "goal_against"]);
  });

  test("create saves StatLine and history", async () => {
    const payload = { gameId: "g1", teamId: "t1", playerId: "p1", goals: 2 };
    const stat = await dao.create(payload);

    expect(stat).toBeInstanceOf(StatLineMock);
    expect(statLineSaveSpy).toHaveBeenCalledTimes(1);
    expect(statHistorySaveSpy).toHaveBeenCalledTimes(1);

    const hist = statHistorySaveSpy.mock.instances[0]?.doc;
    expect(hist.gameId).toBe("g1");
    expect(hist.goals).toBe(2);
    expect(hist.assists).toBe(0);
  });

  test("readAll calls find(filter).sort().lean()", async () => {
    const rows = await dao.readAll({ teamId: "t1" });
    expect(StatLine_spy.find).toHaveBeenCalledWith({ teamId: "t1" });
    expect(rows).toEqual([{ _id: "s1" }]);
  });

  test("read calls findById(id).lean()", async () => {
    const row = await dao.read("abc");
    expect(StatLine_spy.findById).toHaveBeenCalledWith("abc");
    expect(row._id).toBe("s1");
  });

  test("update saves history when existing stat found", async () => {
    await dao.update("s1", { goals: 9 });
    expect(statHistorySaveSpy).toHaveBeenCalledTimes(1);
    expect(StatLine_spy.findByIdAndUpdate).toHaveBeenCalled();
  });

  test("update does not save history when stat not found", async () => {
    StatLine_spy.findById.mockReturnValueOnce({ lean: vi.fn(async () => null) });
    await dao.update("missing", { goals: 1 });
    expect(statHistorySaveSpy).not.toHaveBeenCalled();
  });

  test("del calls findByIdAndDelete(id).lean()", async () => {
    const out = await dao.del("x");
    expect(StatLine_spy.findByIdAndDelete).toHaveBeenCalledWith("x");
    expect(out._id).toBe("s1");
  });

  test("deleteAll calls deleteMany(filter)", async () => {
    const out = await dao.deleteAll({ gameId: "g1" });
    expect(StatLine_spy.deleteMany).toHaveBeenCalledWith({ gameId: "g1" });
    expect(out.deletedCount).toBe(2);
  });

  test("bulkUpsert writes StatLine + StatHistory when lines non-empty", async () => {
    const lines = [{ gameId: "g1", teamId: "t1", playerId: "p1", goals: 1 }];
    await dao.bulkUpsert(lines);

    expect(StatLine_spy.bulkWrite).toHaveBeenCalledTimes(1);
    expect(StatHistory_spy.bulkWrite).toHaveBeenCalledTimes(1);
  });

  test("bulkUpsert skips StatHistory.bulkWrite when lines empty", async () => {
    await dao.bulkUpsert([]);
    expect(StatLine_spy.bulkWrite).toHaveBeenCalledTimes(1);
    expect(StatHistory_spy.bulkWrite).not.toHaveBeenCalled();
  });

  test("getHistory converts valid ObjectId strings", async () => {
    const valid = "aaaaaaaaaaaaaaaaaaaaaaaa";
    await dao.getHistory({ gameId: valid, teamId: "nope" });

    const used = StatHistory_spy.find.mock.calls[0][0];
    expect(used.gameId).toBeInstanceOf(ObjectIdMock);
    expect(used.teamId).toBe("nope");
  });

  test("getPlayerHistory builds query (valid/invalid combos)", async () => {
    const g = "bbbbbbbbbbbbbbbbbbbbbbbb";
    const p = "cccccccccccccccccccccccc";

    await dao.getPlayerHistory(g, p);
    let q = StatHistory_spy.find.mock.calls.at(-1)[0];
    expect(q.gameId).toBeInstanceOf(ObjectIdMock);
    expect(q.playerId).toBeInstanceOf(ObjectIdMock);

    await dao.getPlayerHistory("bad", "bad");
    q = StatHistory_spy.find.mock.calls.at(-1)[0];
    expect(q).toEqual({});
  });

  test("getGameHistory uses gameId if valid, else empty", async () => {
    const g = "dddddddddddddddddddddddd";
    await dao.getGameHistory(g);
    let q = StatHistory_spy.find.mock.calls.at(-1)[0];
    expect(q.gameId).toBeInstanceOf(ObjectIdMock);

    await dao.getGameHistory("bad");
    q = StatHistory_spy.find.mock.calls.at(-1)[0];
    expect(q).toEqual({});
  });

  // ── GameEvent tests ──

  test("createEvent saves a GameEvent", async () => {
    const payload = { gameId: "g1", teamId: "t1", eventType: "faceoff", team: "home", winner: "home" };
    await dao.createEvent(payload);

    expect(gameEventSaveSpy).toHaveBeenCalledTimes(1);
  });

  test("getEventsByGame calls find with gameId", async () => {
    await dao.getEventsByGame("g1");
    expect(GameEvent_spy.find).toHaveBeenCalledWith({ gameId: "g1" });
  });

  test("getEventsByGame filters by eventType when provided", async () => {
    await dao.getEventsByGame("g1", "hit");
    expect(GameEvent_spy.find).toHaveBeenCalledWith({ gameId: "g1", eventType: "hit" });
  });

  test("deleteLastEvent finds and deletes last event", async () => {
    const mockEvent = { _id: "e1" };
    GameEvent_spy.findOne.mockReturnValueOnce({ sort: vi.fn(() => mockEvent) });
    GameEvent_spy.findByIdAndDelete.mockReturnValueOnce({ lean: vi.fn(async () => mockEvent) });

    const result = await dao.deleteLastEvent("g1", "faceoff");
    expect(GameEvent_spy.findOne).toHaveBeenCalledWith({ gameId: "g1", eventType: "faceoff" });
    expect(result).toEqual(mockEvent);
  });

  test("deleteLastEvent returns null when no events", async () => {
    GameEvent_spy.findOne.mockReturnValueOnce({ sort: vi.fn(() => null) });

    const result = await dao.deleteLastEvent("g1");
    expect(result).toBeNull();
  });

  test("deleteAllEvents calls deleteMany", async () => {
    await dao.deleteAllEvents({ gameId: "g1" });
    expect(GameEvent_spy.deleteMany).toHaveBeenCalledWith({ gameId: "g1" });
  });
});