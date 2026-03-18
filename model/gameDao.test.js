import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import * as gameDao from './gameDao.js';

const Game = mongoose.model('Game');

describe('GameDAO Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exports', () => {
    test('should export GAME_TYPES array', () => {
      expect(gameDao.GAME_TYPES).toBeDefined();
      expect(Array.isArray(gameDao.GAME_TYPES)).toBe(true);
      expect(gameDao.GAME_TYPES).toHaveLength(6);
    });

    test('should export GAME_STATUS array', () => {
      expect(gameDao.GAME_STATUS).toBeDefined();
      expect(Array.isArray(gameDao.GAME_STATUS)).toBe(true);
      expect(gameDao.GAME_STATUS).toEqual([
        'scheduled',
        'live',
        'intermission',
        'final'
      ]);
    });

    test('should export all required functions', () => {
      expect(typeof gameDao.create).toBe('function');
      expect(typeof gameDao.readAll).toBe('function');
      expect(typeof gameDao.read).toBe('function');
      expect(typeof gameDao.update).toBe('function');
      expect(typeof gameDao.del).toBe('function');
      expect(typeof gameDao.deleteAll).toBe('function');
    });
  });

  describe('constants', () => {
    test('GAME_TYPES should contain all valid game types', () => {
      expect(gameDao.GAME_TYPES).toEqual([
        'regular-season',
        'league',
        'out-of-league',
        'playoff',
        'final',
        'tournament'
      ]);
    });

    test('GAME_STATUS should contain all valid statuses', () => {
      expect(gameDao.GAME_STATUS).toContain('scheduled');
      expect(gameDao.GAME_STATUS).toContain('live');
      expect(gameDao.GAME_STATUS).toContain('intermission');
      expect(gameDao.GAME_STATUS).toContain('final');
    });
  });

  describe('schema/model structure', () => {
    test('should register Game model', () => {
      expect(Game).toBeDefined();
      expect(Game.modelName).toBe('Game');
    });

    test('should have expected schema fields', () => {
      const paths = Game.schema.paths;

      expect(paths.teamId).toBeDefined();
      expect(paths.gameType).toBeDefined();
      expect(paths.gameDate).toBeDefined();
      expect(paths.lineup).toBeDefined();
      expect(paths['score.us']).toBeDefined();
      expect(paths['score.them']).toBeDefined();
      expect(paths.status).toBeDefined();
      expect(paths.currentPeriod).toBeDefined();
      expect(paths.clockSecondsRemaining).toBeDefined();
      expect(paths.result).toBeDefined();
      expect(paths.dateCreated).toBeDefined();
      expect(paths.dateUpdated).toBeDefined();
      expect(paths.dateFinished).toBeDefined();
    });

    test('should have correct defaults in schema', () => {
      expect(Game.schema.path('status').defaultValue).toBe('scheduled');
      expect(Game.schema.path('currentPeriod').defaultValue).toBe(1);
      expect(Game.schema.path('clockSecondsRemaining').defaultValue).toBe(1200);
      expect(Game.schema.path('score.us').defaultValue).toBe(0);
      expect(Game.schema.path('score.them').defaultValue).toBe(0);
    });

    test('should enforce enum values for gameType', () => {
      expect(Game.schema.path('gameType').enumValues).toEqual(gameDao.GAME_TYPES);
    });

    test('should enforce enum values for status', () => {
      expect(Game.schema.path('status').enumValues).toEqual(gameDao.GAME_STATUS);
    });
  });

  describe('create', () => {
    test('should be an async function', () => {
      expect(gameDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(gameDao.create.length).toBe(1);
    });

    test('should create a new Game and save it', async () => {
      const data = {
        teamId: new mongoose.Types.ObjectId(),
        gameType: 'league',
        gameDate: new Date('2026-03-10'),
      };

      const savedDoc = { _id: 'g1', ...data };
      const saveSpy = vi.spyOn(Game.prototype, 'save').mockResolvedValue(savedDoc);

      const result = await gameDao.create(data);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedDoc);
    });

    test('should reject when save fails', async () => {
      const data = {
        teamId: new mongoose.Types.ObjectId(),
        gameType: 'league',
        gameDate: new Date('2026-03-10'),
      };

      vi.spyOn(Game.prototype, 'save').mockRejectedValue(new Error('save failed'));

      await expect(gameDao.create(data)).rejects.toThrow('save failed');
    });
  });

  describe('readAll', () => {
    test('should be an async function', () => {
      expect(gameDao.readAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(gameDao.readAll.length).toBe(0);
    });

    test('should call find with provided filter, sort by gameDate descending, and lean', async () => {
      const filter = { teamId: 'team1' };
      const leanResult = [{ _id: 'g1' }];

      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Game, 'find').mockReturnValue({ sort: sortMock });

      const result = await gameDao.readAll(filter);

      expect(findSpy).toHaveBeenCalledWith(filter);
      expect(sortMock).toHaveBeenCalledWith({ gameDate: -1 });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should use empty object as default filter', async () => {
      const leanMock = vi.fn().mockResolvedValue([]);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Game, 'find').mockReturnValue({ sort: sortMock });

      await gameDao.readAll();

      expect(findSpy).toHaveBeenCalledWith({});
    });

    test('should reject when find chain fails', async () => {
      const sortMock = vi.fn().mockImplementation(() => {
        throw new Error('sort failed');
      });

      vi.spyOn(Game, 'find').mockReturnValue({ sort: sortMock });

      await expect(gameDao.readAll({})).rejects.toThrow('sort failed');
    });
  });

  describe('read', () => {
    test('should be an async function', () => {
      expect(gameDao.read.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(gameDao.read.length).toBe(1);
    });

    test('should call findById(id).lean()', async () => {
      const leanResult = { _id: 'g1' };
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const findByIdSpy = vi.spyOn(Game, 'findById').mockReturnValue({ lean: leanMock });

      const result = await gameDao.read('g1');

      expect(findByIdSpy).toHaveBeenCalledWith('g1');
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should reject when findById fails', async () => {
      vi.spyOn(Game, 'findById').mockImplementation(() => {
        throw new Error('findById failed');
      });

      await expect(gameDao.read('g1')).rejects.toThrow('findById failed');
    });
  });

  describe('update', () => {
    test('should be an async function', () => {
      expect(gameDao.update.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(gameDao.update.length).toBe(2);
    });

    test('should add dateUpdated and call findByIdAndUpdate with new:true and lean()', async () => {
      const updateData = { status: 'final' };
      const leanResult = { _id: 'g1', status: 'final' };
      const leanMock = vi.fn().mockResolvedValue(leanResult);

      const spy = vi
        .spyOn(Game, 'findByIdAndUpdate')
        .mockReturnValue({ lean: leanMock });

      const before = Date.now();
      const result = await gameDao.update('g1', updateData);
      const after = Date.now();

      expect(spy).toHaveBeenCalledTimes(1);

      const [idArg, updateArg, optionsArg] = spy.mock.calls[0];
      expect(idArg).toBe('g1');
      expect(updateArg.status).toBe('final');
      expect(updateArg.dateUpdated).toBeInstanceOf(Date);
      expect(updateArg.dateUpdated.getTime()).toBeGreaterThanOrEqual(before);
      expect(updateArg.dateUpdated.getTime()).toBeLessThanOrEqual(after);
      expect(optionsArg).toEqual({ new: true });

      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should mutate the original updateData object by adding dateUpdated', async () => {
      const updateData = { result: 'Win' };
      const leanMock = vi.fn().mockResolvedValue({ _id: 'g1', result: 'Win' });

      vi.spyOn(Game, 'findByIdAndUpdate').mockReturnValue({ lean: leanMock });

      await gameDao.update('g1', updateData);

      expect(updateData.dateUpdated).toBeInstanceOf(Date);
    });

    test('should reject when findByIdAndUpdate fails', async () => {
      vi.spyOn(Game, 'findByIdAndUpdate').mockImplementation(() => {
        throw new Error('update failed');
      });

      await expect(gameDao.update('g1', { status: 'live' })).rejects.toThrow('update failed');
    });
  });

  describe('del', () => {
    test('should be an async function', () => {
      expect(gameDao.del.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(gameDao.del.length).toBe(1);
    });

    test('should call findByIdAndDelete(id).lean()', async () => {
      const leanResult = { _id: 'g1' };
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const spy = vi.spyOn(Game, 'findByIdAndDelete').mockReturnValue({ lean: leanMock });

      const result = await gameDao.del('g1');

      expect(spy).toHaveBeenCalledWith('g1');
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should reject when findByIdAndDelete fails', async () => {
      vi.spyOn(Game, 'findByIdAndDelete').mockImplementation(() => {
        throw new Error('delete failed');
      });

      await expect(gameDao.del('g1')).rejects.toThrow('delete failed');
    });
  });

  describe('deleteAll', () => {
    test('should be an async function', () => {
      expect(gameDao.deleteAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(gameDao.deleteAll.length).toBe(0);
    });

    test('should call deleteMany with provided filter', async () => {
      const resultObj = { acknowledged: true, deletedCount: 2 };
      const spy = vi.spyOn(Game, 'deleteMany').mockResolvedValue(resultObj);

      const result = await gameDao.deleteAll({ teamId: 'team1' });

      expect(spy).toHaveBeenCalledWith({ teamId: 'team1' });
      expect(result).toEqual(resultObj);
    });

    test('should use empty object as default filter', async () => {
      const spy = vi.spyOn(Game, 'deleteMany').mockResolvedValue({ acknowledged: true });

      await gameDao.deleteAll();

      expect(spy).toHaveBeenCalledWith({});
    });

    test('should reject when deleteMany fails', async () => {
      vi.spyOn(Game, 'deleteMany').mockRejectedValue(new Error('deleteMany failed'));

      await expect(gameDao.deleteAll({})).rejects.toThrow('deleteMany failed');
    });
  });

  describe('module structure', () => {
    test('should have correct exports', () => {
      const exportedKeys = Object.keys(gameDao);

      expect(exportedKeys).toContain('GAME_TYPES');
      expect(exportedKeys).toContain('GAME_STATUS');
      expect(exportedKeys).toContain('create');
      expect(exportedKeys).toContain('readAll');
      expect(exportedKeys).toContain('read');
      expect(exportedKeys).toContain('update');
      expect(exportedKeys).toContain('del');
      expect(exportedKeys).toContain('deleteAll');
    });
  });
});