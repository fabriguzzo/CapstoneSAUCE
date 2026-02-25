import { describe, test, expect } from 'vitest';
import * as playerDao from './playerDao.js';

describe('PlayerDAO Module', () => {
  describe('exports', () => {
    test('should export all required functions', () => {
      expect(playerDao.create).toBeDefined();
      expect(typeof playerDao.create).toBe('function');
      
      expect(playerDao.readAll).toBeDefined();
      expect(typeof playerDao.readAll).toBe('function');
      
      expect(playerDao.read).toBeDefined();
      expect(typeof playerDao.read).toBe('function');
      
      expect(playerDao.update).toBeDefined();
      expect(typeof playerDao.update).toBe('function');
      
      expect(playerDao.del).toBeDefined();
      expect(typeof playerDao.del).toBe('function');
      
      expect(playerDao.deleteAll).toBeDefined();
      expect(typeof playerDao.deleteAll).toBe('function');
    });
  });

  describe('create function', () => {
    test('should be an async function', () => {
      expect(playerDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(playerDao.create.length).toBe(1);
    });
  });

  describe('readAll function', () => {
    test('should be an async function', () => {
      expect(playerDao.readAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(playerDao.readAll.length).toBe(0);
    });
  });

  describe('read function', () => {
    test('should be an async function', () => {
      expect(playerDao.read.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(playerDao.read.length).toBe(1);
    });
  });

  describe('update function', () => {
    test('should be an async function', () => {
      expect(playerDao.update.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(playerDao.update.length).toBe(2);
    });
  });

  describe('del function', () => {
    test('should be an async function', () => {
      expect(playerDao.del.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(playerDao.del.length).toBe(1);
    });
  });

  describe('deleteAll function', () => {
    test('should be an async function', () => {
      expect(playerDao.deleteAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(playerDao.deleteAll.length).toBe(0);
    });
  });

  describe('module structure', () => {
    test('should have correct number of exports', () => {
      const exports = Object.keys(playerDao);
      expect(exports).toContain('create');
      expect(exports).toContain('readAll');
      expect(exports).toContain('read');
      expect(exports).toContain('update');
      expect(exports).toContain('del');
      expect(exports).toContain('deleteAll');
    });
  });
});
