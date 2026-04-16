import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import * as playerDao from './playerDao.js';

const Player = mongoose.model('Player');

describe('PlayerDAO Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('schema/model structure', () => {
    test('should register Player model', () => {
      expect(Player).toBeDefined();
      expect(Player.modelName).toBe('Player');
    });

    test('should have expected schema fields', () => {
      const paths = Player.schema.paths;

      expect(paths.name).toBeDefined();
      expect(paths.number).toBeDefined();
      expect(paths.teamId).toBeDefined();
      expect(paths.position).toBeDefined();
      expect(paths.createdAt).toBeDefined();
      expect(paths.updatedAt).toBeDefined();
    });

    test('should mark required fields correctly', () => {
      expect(Player.schema.path('name').isRequired).toBeTruthy();
      expect(Player.schema.path('number').isRequired).toBeTruthy();
      expect(Player.schema.path('teamId').isRequired).toBeTruthy();
    });
  });

  describe('exports', () => {
    test('should export all required functions', () => {
      expect(typeof playerDao.create).toBe('function');
      expect(typeof playerDao.readAll).toBe('function');
      expect(typeof playerDao.read).toBe('function');
      expect(typeof playerDao.findByTeamAndName).toBe('function');
      expect(typeof playerDao.update).toBe('function');
      expect(typeof playerDao.del).toBe('function');
      expect(typeof playerDao.deleteAll).toBe('function');
    });

    test('should have correct number of exports', () => {
      const exports = Object.keys(playerDao);
      expect(exports).toContain('create');
      expect(exports).toContain('readAll');
      expect(exports).toContain('read');
      expect(exports).toContain('findByTeamAndName');
      expect(exports).toContain('update');
      expect(exports).toContain('del');
      expect(exports).toContain('deleteAll');
    });
  });

  describe('create', () => {
    test('should be an async function', () => {
      expect(playerDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(playerDao.create.length).toBe(1);
    });

    test('should create a new Player and save it', async () => {
      const data = { name: 'Alice', number: 10, teamId: new mongoose.Types.ObjectId() };
      const savedDoc = { _id: 'p1', ...data };
      const saveSpy = vi.spyOn(Player.prototype, 'save').mockResolvedValue(savedDoc);

      const result = await playerDao.create(data);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedDoc);
    });

    test('should reject when save fails', async () => {
      vi.spyOn(Player.prototype, 'save').mockRejectedValue(new Error('save failed'));

      await expect(playerDao.create({ name: 'Alice', number: 10 })).rejects.toThrow('save failed');
    });
  });

  describe('readAll', () => {
    test('should be an async function', () => {
      expect(playerDao.readAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter with default of empty object', () => {
      expect(playerDao.readAll.length).toBe(0);
    });

    test('should call find with filter, sort by number asc, and lean', async () => {
      const leanResult = [{ _id: 'p1', number: 7 }];
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Player, 'find').mockReturnValue({ sort: sortMock });

      const result = await playerDao.readAll({ teamId: 't1' });

      expect(findSpy).toHaveBeenCalledWith({ teamId: 't1' });
      expect(sortMock).toHaveBeenCalledWith({ number: 1 });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should default to empty filter when called with no arguments', async () => {
      const leanMock = vi.fn().mockResolvedValue([]);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Player, 'find').mockReturnValue({ sort: sortMock });

      await playerDao.readAll();

      expect(findSpy).toHaveBeenCalledWith({});
    });

    test('should reject when query chain fails', async () => {
      const sortMock = vi.fn().mockImplementation(() => {
        throw new Error('sort failed');
      });
      vi.spyOn(Player, 'find').mockReturnValue({ sort: sortMock });

      await expect(playerDao.readAll()).rejects.toThrow('sort failed');
    });
  });

  describe('read', () => {
    test('should be an async function', () => {
      expect(playerDao.read.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(playerDao.read.length).toBe(1);
    });

    test('should call findById and lean', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 'p1', name: 'Alice' });
      const spy = vi.spyOn(Player, 'findById').mockReturnValue({ lean: leanMock });

      const result = await playerDao.read('p1');

      expect(spy).toHaveBeenCalledWith('p1');
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 'p1', name: 'Alice' });
    });

    test('should return null when player not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null);
      vi.spyOn(Player, 'findById').mockReturnValue({ lean: leanMock });

      const result = await playerDao.read('missing');

      expect(result).toBeNull();
    });

    test('should reject when findById fails', async () => {
      vi.spyOn(Player, 'findById').mockImplementation(() => {
        throw new Error('findById failed');
      });

      await expect(playerDao.read('p1')).rejects.toThrow('findById failed');
    });
  });

  describe('findByTeamAndName', () => {
    test('should be an async function', () => {
      expect(playerDao.findByTeamAndName.constructor.name).toBe('AsyncFunction');
    });

    test('should accept teamId and name parameters', () => {
      expect(playerDao.findByTeamAndName.length).toBe(2);
    });

    test('should query by teamId and name, sort by number asc, and lean', async () => {
      const leanResult = [{ _id: 'p1', name: 'Alice', number: 7 }];
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Player, 'find').mockReturnValue({ sort: sortMock });

      const result = await playerDao.findByTeamAndName('t1', 'Alice');

      expect(findSpy).toHaveBeenCalledWith({ teamId: 't1', name: 'Alice' });
      expect(sortMock).toHaveBeenCalledWith({ number: 1 });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should reject when query chain fails', async () => {
      const sortMock = vi.fn().mockImplementation(() => {
        throw new Error('sort failed');
      });
      vi.spyOn(Player, 'find').mockReturnValue({ sort: sortMock });

      await expect(playerDao.findByTeamAndName('t1', 'Alice')).rejects.toThrow('sort failed');
    });
  });

  describe('update', () => {
    test('should be an async function', () => {
      expect(playerDao.update.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(playerDao.update.length).toBe(2);
    });

    test('should call findByIdAndUpdate with new:true and lean', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 'p1', number: 99 });
      const spy = vi.spyOn(Player, 'findByIdAndUpdate').mockReturnValue({ lean: leanMock });

      const result = await playerDao.update('p1', { number: 99 });

      expect(spy).toHaveBeenCalledWith('p1', { number: 99 }, { new: true });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 'p1', number: 99 });
    });

    test('should reject when update fails', async () => {
      vi.spyOn(Player, 'findByIdAndUpdate').mockImplementation(() => {
        throw new Error('update failed');
      });

      await expect(playerDao.update('p1', { number: 99 })).rejects.toThrow('update failed');
    });
  });

  describe('del', () => {
    test('should be an async function', () => {
      expect(playerDao.del.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(playerDao.del.length).toBe(1);
    });

    test('should call findByIdAndDelete and lean', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 'p1' });
      const spy = vi.spyOn(Player, 'findByIdAndDelete').mockReturnValue({ lean: leanMock });

      const result = await playerDao.del('p1');

      expect(spy).toHaveBeenCalledWith('p1');
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 'p1' });
    });

    test('should reject when delete fails', async () => {
      vi.spyOn(Player, 'findByIdAndDelete').mockImplementation(() => {
        throw new Error('delete failed');
      });

      await expect(playerDao.del('p1')).rejects.toThrow('delete failed');
    });
  });

  describe('deleteAll', () => {
    test('should be an async function', () => {
      expect(playerDao.deleteAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter with default of empty object', () => {
      expect(playerDao.deleteAll.length).toBe(0);
    });

    test('should call deleteMany with filter', async () => {
      const spy = vi.spyOn(Player, 'deleteMany').mockResolvedValue({ deletedCount: 3 });

      const result = await playerDao.deleteAll({ teamId: 't1' });

      expect(spy).toHaveBeenCalledWith({ teamId: 't1' });
      expect(result).toEqual({ deletedCount: 3 });
    });

    test('should default to empty filter when called with no arguments', async () => {
      const spy = vi.spyOn(Player, 'deleteMany').mockResolvedValue({ deletedCount: 0 });

      await playerDao.deleteAll();

      expect(spy).toHaveBeenCalledWith({});
    });

    test('should reject when deleteMany fails', async () => {
      vi.spyOn(Player, 'deleteMany').mockRejectedValue(new Error('deleteMany failed'));

      await expect(playerDao.deleteAll()).rejects.toThrow('deleteMany failed');
    });
  });
});
