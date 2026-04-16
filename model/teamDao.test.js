import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import * as teamDao from './teamDao.js';

const Team = mongoose.model('Team');

describe('TeamDAO Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('schema/model structure', () => {
    test('should register Team model', () => {
      expect(Team).toBeDefined();
      expect(Team.modelName).toBe('Team');
    });

    test('should have expected schema fields', () => {
      const paths = Team.schema.paths;

      expect(paths.name).toBeDefined();
      expect(paths.coach).toBeDefined();
      expect(paths.description).toBeDefined();
      expect(paths.createdAt).toBeDefined();
      expect(paths.updatedAt).toBeDefined();
    });

    test('should mark name as required', () => {
      expect(Team.schema.path('name').isRequired).toBeTruthy();
    });

    test('should configure name field as unique', () => {
      expect(Team.schema.path('name').options.unique).toBe(true);
    });
  });

  describe('exports', () => {
    test('should export all required functions', () => {
      expect(typeof teamDao.create).toBe('function');
      expect(typeof teamDao.readAll).toBe('function');
      expect(typeof teamDao.read).toBe('function');
      expect(typeof teamDao.update).toBe('function');
      expect(typeof teamDao.del).toBe('function');
      expect(typeof teamDao.deleteAll).toBe('function');
    });

    test('should have correct exports', () => {
      const exports = Object.keys(teamDao);
      expect(exports).toContain('create');
      expect(exports).toContain('readAll');
      expect(exports).toContain('read');
      expect(exports).toContain('update');
      expect(exports).toContain('del');
      expect(exports).toContain('deleteAll');
    });
  });

  describe('create', () => {
    test('should be an async function', () => {
      expect(teamDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(teamDao.create.length).toBe(1);
    });

    test('should create a new Team and save it', async () => {
      const data = { name: 'Red Hawks', coach: 'Coach Bob' };
      const savedDoc = { _id: 't1', ...data };
      const saveSpy = vi.spyOn(Team.prototype, 'save').mockResolvedValue(savedDoc);

      const result = await teamDao.create(data);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedDoc);
    });

    test('should reject when save fails', async () => {
      vi.spyOn(Team.prototype, 'save').mockRejectedValue(new Error('save failed'));

      await expect(teamDao.create({ name: 'Red Hawks' })).rejects.toThrow('save failed');
    });
  });

  describe('readAll', () => {
    test('should be an async function', () => {
      expect(teamDao.readAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter with default of empty object', () => {
      expect(teamDao.readAll.length).toBe(0);
    });

    test('should call find with filter, sort by name asc, and lean', async () => {
      const leanResult = [{ _id: 't1', name: 'Red Hawks' }];
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Team, 'find').mockReturnValue({ sort: sortMock });

      const result = await teamDao.readAll({ name: 'Red Hawks' });

      expect(findSpy).toHaveBeenCalledWith({ name: 'Red Hawks' });
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should default to empty filter when called with no arguments', async () => {
      const leanMock = vi.fn().mockResolvedValue([]);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const findSpy = vi.spyOn(Team, 'find').mockReturnValue({ sort: sortMock });

      await teamDao.readAll();

      expect(findSpy).toHaveBeenCalledWith({});
    });

    test('should reject when query chain fails', async () => {
      const sortMock = vi.fn().mockImplementation(() => {
        throw new Error('sort failed');
      });
      vi.spyOn(Team, 'find').mockReturnValue({ sort: sortMock });

      await expect(teamDao.readAll()).rejects.toThrow('sort failed');
    });
  });

  describe('read', () => {
    test('should be an async function', () => {
      expect(teamDao.read.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(teamDao.read.length).toBe(1);
    });

    test('should call findById and lean', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 't1', name: 'Red Hawks' });
      const spy = vi.spyOn(Team, 'findById').mockReturnValue({ lean: leanMock });

      const result = await teamDao.read('t1');

      expect(spy).toHaveBeenCalledWith('t1');
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 't1', name: 'Red Hawks' });
    });

    test('should return null when team not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null);
      vi.spyOn(Team, 'findById').mockReturnValue({ lean: leanMock });

      const result = await teamDao.read('missing');

      expect(result).toBeNull();
    });

    test('should reject when findById fails', async () => {
      vi.spyOn(Team, 'findById').mockImplementation(() => {
        throw new Error('findById failed');
      });

      await expect(teamDao.read('t1')).rejects.toThrow('findById failed');
    });
  });

  describe('update', () => {
    test('should be an async function', () => {
      expect(teamDao.update.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(teamDao.update.length).toBe(2);
    });

    test('should call findByIdAndUpdate with new:true and lean', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 't1', name: 'Blue Jays' });
      const spy = vi.spyOn(Team, 'findByIdAndUpdate').mockReturnValue({ lean: leanMock });

      const result = await teamDao.update('t1', { name: 'Blue Jays' });

      expect(spy).toHaveBeenCalledWith('t1', { name: 'Blue Jays' }, { new: true });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 't1', name: 'Blue Jays' });
    });

    test('should reject when update fails', async () => {
      vi.spyOn(Team, 'findByIdAndUpdate').mockImplementation(() => {
        throw new Error('update failed');
      });

      await expect(teamDao.update('t1', { name: 'Blue Jays' })).rejects.toThrow('update failed');
    });
  });

  describe('del', () => {
    test('should be an async function', () => {
      expect(teamDao.del.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(teamDao.del.length).toBe(1);
    });

    test('should call findByIdAndDelete and lean', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 't1' });
      const spy = vi.spyOn(Team, 'findByIdAndDelete').mockReturnValue({ lean: leanMock });

      const result = await teamDao.del('t1');

      expect(spy).toHaveBeenCalledWith('t1');
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 't1' });
    });

    test('should reject when delete fails', async () => {
      vi.spyOn(Team, 'findByIdAndDelete').mockImplementation(() => {
        throw new Error('delete failed');
      });

      await expect(teamDao.del('t1')).rejects.toThrow('delete failed');
    });
  });

  describe('deleteAll', () => {
    test('should be an async function', () => {
      expect(teamDao.deleteAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter with default of empty object', () => {
      expect(teamDao.deleteAll.length).toBe(0);
    });

    test('should call deleteMany with filter', async () => {
      const spy = vi.spyOn(Team, 'deleteMany').mockResolvedValue({ deletedCount: 2 });

      const result = await teamDao.deleteAll({ name: 'Red Hawks' });

      expect(spy).toHaveBeenCalledWith({ name: 'Red Hawks' });
      expect(result).toEqual({ deletedCount: 2 });
    });

    test('should default to empty filter when called with no arguments', async () => {
      const spy = vi.spyOn(Team, 'deleteMany').mockResolvedValue({ deletedCount: 0 });

      await teamDao.deleteAll();

      expect(spy).toHaveBeenCalledWith({});
    });

    test('should reject when deleteMany fails', async () => {
      vi.spyOn(Team, 'deleteMany').mockRejectedValue(new Error('deleteMany failed'));

      await expect(teamDao.deleteAll()).rejects.toThrow('deleteMany failed');
    });
  });
});
