import { describe, test, expect } from 'vitest';
import * as teamDao from './teamDao.js';

describe('TeamDAO Module', () => {
  describe('exports', () => {
    test('should export all required functions', () => {
      expect(teamDao.create).toBeDefined();
      expect(typeof teamDao.create).toBe('function');
      
      expect(teamDao.readAll).toBeDefined();
      expect(typeof teamDao.readAll).toBe('function');
      
      expect(teamDao.read).toBeDefined();
      expect(typeof teamDao.read).toBe('function');
      
      expect(teamDao.update).toBeDefined();
      expect(typeof teamDao.update).toBe('function');
      
      expect(teamDao.del).toBeDefined();
      expect(typeof teamDao.del).toBe('function');
      
      expect(teamDao.deleteAll).toBeDefined();
      expect(typeof teamDao.deleteAll).toBe('function');
    });
  });

  describe('create function', () => {
    test('should be an async function', () => {
      expect(teamDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(teamDao.create.length).toBe(1);
    });
  });

  describe('readAll function', () => {
    test('should be an async function', () => {
      expect(teamDao.readAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(teamDao.readAll.length).toBe(0);
    });
  });

  describe('read function', () => {
    test('should be an async function', () => {
      expect(teamDao.read.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(teamDao.read.length).toBe(1);
    });
  });

  describe('update function', () => {
    test('should be an async function', () => {
      expect(teamDao.update.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(teamDao.update.length).toBe(2);
    });
  });

  describe('del function', () => {
    test('should be an async function', () => {
      expect(teamDao.del.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(teamDao.del.length).toBe(1);
    });
  });

  describe('deleteAll function', () => {
    test('should be an async function', () => {
      expect(teamDao.deleteAll.constructor.name).toBe('AsyncFunction');
    });

    test('should accept optional filter parameter', () => {
      expect(teamDao.deleteAll.length).toBe(0);
    });
  });

  describe('module structure', () => {
    test('should have correct number of exports', () => {
      const exports = Object.keys(teamDao);
      expect(exports).toContain('create');
      expect(exports).toContain('readAll');
      expect(exports).toContain('read');
      expect(exports).toContain('update');
      expect(exports).toContain('del');
      expect(exports).toContain('deleteAll');
    });
  });
});
