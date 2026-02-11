import { describe, test, expect } from 'vitest';
import * as gameDao from './gameDao.js';

describe('GameDAO Module', () => {
  describe('exports', () => {
    test('should export GAME_TYPES array', () => {
      expect(gameDao.GAME_TYPES).toBeDefined();
      expect(Array.isArray(gameDao.GAME_TYPES)).toBe(true);
      expect(gameDao.GAME_TYPES).toHaveLength(6);
    });

    test('should export all required functions', () => {
      expect(gameDao.create).toBeDefined();
      expect(typeof gameDao.create).toBe('function');
      
      expect(gameDao.readAll).toBeDefined();
      expect(typeof gameDao.readAll).toBe('function');
      
      expect(gameDao.read).toBeDefined();
      expect(typeof gameDao.read).toBe('function');
      
      expect(gameDao.update).toBeDefined();
      expect(typeof gameDao.update).toBe('function');
      
      expect(gameDao.del).toBeDefined();
      expect(typeof gameDao.del).toBe('function');
      
      expect(gameDao.deleteAll).toBeDefined();
      expect(typeof gameDao.deleteAll).toBe('function');
    });
  });

  describe('GAME_TYPES constant', () => {
    test('should contain all valid game types', () => {
      const expectedTypes = [
        'regular-season',
        'league',
        'out-of-league',
        'playoff',
        'final',
        'tournament'
      ];
      
      expectedTypes.forEach(type => {
        expect(gameDao.GAME_TYPES).toContain(type);
      });
    });

    test('should have correct game types in order', () => {
      expect(gameDao.GAME_TYPES[0]).toBe('regular-season');
      expect(gameDao.GAME_TYPES[1]).toBe('league');
      expect(gameDao.GAME_TYPES[2]).toBe('out-of-league');
      expect(gameDao.GAME_TYPES[3]).toBe('playoff');
      expect(gameDao.GAME_TYPES[4]).toBe('final');
      expect(gameDao.GAME_TYPES[5]).toBe('tournament');
    });
  });

  describe('create function', () => {
    test('should be an async function', () => {
      expect(gameDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(gameDao.create.length).toBe(1);
    });
  });

  describe('readAll function', () => {
    test('should be an async function', () => {
      expect(gameDao.readAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(gameDao.readAll.length).toBe(0); // Has default parameter
    });
  });

  describe('read function', () => {
    test('should be an async function', () => {
      expect(gameDao.read.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(gameDao.read.length).toBe(1);
    });
  });

  describe('update function', () => {
    test('should be an async function', () => {
      expect(gameDao.update.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(gameDao.update.length).toBe(2);
    });
  });

  describe('del function', () => {
    test('should be an async function', () => {
      expect(gameDao.del.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(gameDao.del.length).toBe(1);
    });
  });

  describe('deleteAll function', () => {
    test('should be an async function', () => {
      expect(gameDao.deleteAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(gameDao.deleteAll.length).toBe(0); // Has default parameter
    });
  });

  describe('module structure', () => {
    test('should have correct number of exports', () => {
      const exports = Object.keys(gameDao);
      expect(exports).toContain('GAME_TYPES');
      expect(exports).toContain('create');
      expect(exports).toContain('readAll');
      expect(exports).toContain('read');
      expect(exports).toContain('update');
      expect(exports).toContain('del');
      expect(exports).toContain('deleteAll');
    });
  });
});