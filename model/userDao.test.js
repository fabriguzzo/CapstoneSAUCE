import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import * as userDao from './userDao.js';

const User = mongoose.model('User');

describe('UserDAO Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exports', () => {
    test('should export all required functions', () => {
      expect(typeof userDao.create).toBe('function');
      expect(typeof userDao.findByEmail).toBe('function');
      expect(typeof userDao.findById).toBe('function');
      expect(typeof userDao.findByIdWithPassword).toBe('function');
      expect(typeof userDao.findByTeamAndStatus).toBe('function');
      expect(typeof userDao.findByTeam).toBe('function');
      expect(typeof userDao.findCoachByTeam).toBe('function');
      expect(typeof userDao.updateProfile).toBe('function');
      expect(typeof userDao.setResetToken).toBe('function');
      expect(typeof userDao.findByResetToken).toBe('function');
      expect(typeof userDao.updatePassword).toBe('function');
      expect(typeof userDao.updateStatus).toBe('function');
      expect(typeof userDao.deleteOne).toBe('function');
    });
  });

  describe('schema/model structure', () => {
    test('should register User model', () => {
      expect(User).toBeDefined();
      expect(User.modelName).toBe('User');
    });

    test('should have expected schema fields', () => {
      const paths = User.schema.paths;

      expect(paths.email).toBeDefined();
      expect(paths.password).toBeDefined();
      expect(paths.name).toBeDefined();
      expect(paths.profilePicture).toBeDefined();
      expect(paths.role).toBeDefined();
      expect(paths.teamId).toBeDefined();
      expect(paths.status).toBeDefined();
      expect(paths.resetPasswordToken).toBeDefined();
      expect(paths.resetPasswordExpires).toBeDefined();
      expect(paths.createdAt).toBeDefined();
      expect(paths.updatedAt).toBeDefined();
    });

    test('should have correct defaults and enums', () => {
      expect(User.schema.path('status').defaultValue).toBe('pending');
      expect(User.schema.path('role').enumValues).toEqual(['coach', 'member', 'admin']);
      expect(User.schema.path('status').enumValues).toEqual(['pending', 'approved']);
    });

    test('should mark required fields correctly', () => {
      expect(User.schema.path('email').isRequired).toBeTruthy();
      expect(User.schema.path('password').isRequired).toBeTruthy();
      expect(User.schema.path('name').isRequired).toBeTruthy();
      expect(User.schema.path('role').isRequired).toBeTruthy();
      expect(User.schema.path('teamId').isRequired).toBeTruthy();
    });

    test('should configure email field options', () => {
      const emailPath = User.schema.path('email');
      expect(emailPath.options.lowercase).toBe(true);
      expect(emailPath.options.trim).toBe(true);
      expect(emailPath.options.unique).toBe(true);
    });

    test('should have compound index on teamId and status', () => {
      const indexes = User.schema.indexes();
      expect(indexes).toEqual(
        expect.arrayContaining([
          [
            { teamId: 1, status: 1 },
            expect.objectContaining({})
          ]
        ])
      );
    });
  });

  describe('create', () => {
    test('should be an async function', () => {
      expect(userDao.create.constructor.name).toBe('AsyncFunction');
    });

    test('should accept data parameter', () => {
      expect(userDao.create.length).toBe(1);
    });

    test('should create a new User and save it', async () => {
      const data = {
        email: 'fab@example.com',
        password: 'hashedpw',
        name: 'Fab',
        role: 'member',
        teamId: new mongoose.Types.ObjectId(),
      };

      const savedDoc = { _id: 'u1', ...data };
      const saveSpy = vi.spyOn(User.prototype, 'save').mockResolvedValue(savedDoc);

      const result = await userDao.create(data);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedDoc);
    });

    test('should reject when save fails', async () => {
      const data = {
        email: 'fab@example.com',
        password: 'hashedpw',
        name: 'Fab',
        role: 'member',
        teamId: new mongoose.Types.ObjectId(),
      };

      vi.spyOn(User.prototype, 'save').mockRejectedValue(new Error('save failed'));

      await expect(userDao.create(data)).rejects.toThrow('save failed');
    });
  });

  describe('findByEmail', () => {
    test('should be an async function', () => {
      expect(userDao.findByEmail.constructor.name).toBe('AsyncFunction');
    });

    test('should accept email parameter', () => {
      expect(userDao.findByEmail.length).toBe(1);
    });

    test('should lowercase email before querying', async () => {
      const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue({ _id: 'u1' });

      const result = await userDao.findByEmail('FAB@EXAMPLE.COM');

      expect(findOneSpy).toHaveBeenCalledWith({ email: 'fab@example.com' });
      expect(result).toEqual({ _id: 'u1' });
    });

    test('should reject when findOne fails', async () => {
      vi.spyOn(User, 'findOne').mockRejectedValue(new Error('findOne failed'));

      await expect(userDao.findByEmail('x@test.com')).rejects.toThrow('findOne failed');
    });
  });

  describe('findById', () => {
    test('should be an async function', () => {
      expect(userDao.findById.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(userDao.findById.length).toBe(1);
    });

    test('should call findById and exclude sensitive fields', async () => {
      const selected = { _id: 'u1', email: 'fab@example.com' };
      const selectMock = vi.fn().mockResolvedValue(selected);
      const spy = vi.spyOn(User, 'findById').mockReturnValue({ select: selectMock });

      const result = await userDao.findById('u1');

      expect(spy).toHaveBeenCalledWith('u1');
      expect(selectMock).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires');
      expect(result).toEqual(selected);
    });

    test('should reject when findById fails', async () => {
      vi.spyOn(User, 'findById').mockImplementation(() => {
        throw new Error('findById failed');
      });

      await expect(userDao.findById('u1')).rejects.toThrow('findById failed');
    });
  });

  describe('findByIdWithPassword', () => {
    test('should be an async function', () => {
      expect(userDao.findByIdWithPassword.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(userDao.findByIdWithPassword.length).toBe(1);
    });

    test('should call findById without select filtering', async () => {
      const spy = vi.spyOn(User, 'findById').mockResolvedValue({ _id: 'u1', password: 'hashed' });

      const result = await userDao.findByIdWithPassword('u1');

      expect(spy).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ _id: 'u1', password: 'hashed' });
    });

    test('should reject when findById fails', async () => {
      vi.spyOn(User, 'findById').mockRejectedValue(new Error('findById failed'));

      await expect(userDao.findByIdWithPassword('u1')).rejects.toThrow('findById failed');
    });
  });

  describe('findByTeamAndStatus', () => {
    test('should be an async function', () => {
      expect(userDao.findByTeamAndStatus.constructor.name).toBe('AsyncFunction');
    });

    test('should accept teamId and status parameters', () => {
      expect(userDao.findByTeamAndStatus.length).toBe(2);
    });

    test('should query by team and status, exclude sensitive fields, sort by createdAt desc, and lean', async () => {
      const leanResult = [{ _id: 'u1' }];
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const selectMock = vi.fn().mockReturnValue({ sort: sortMock });
      const findSpy = vi.spyOn(User, 'find').mockReturnValue({ select: selectMock });

      const result = await userDao.findByTeamAndStatus('team1', 'pending');

      expect(findSpy).toHaveBeenCalledWith({ teamId: 'team1', status: 'pending' });
      expect(selectMock).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires');
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should reject when query chain fails', async () => {
      const selectMock = vi.fn().mockImplementation(() => {
        throw new Error('select failed');
      });
      vi.spyOn(User, 'find').mockReturnValue({ select: selectMock });

      await expect(userDao.findByTeamAndStatus('team1', 'pending')).rejects.toThrow('select failed');
    });
  });

  describe('findByTeam', () => {
    test('should be an async function', () => {
      expect(userDao.findByTeam.constructor.name).toBe('AsyncFunction');
    });

    test('should accept teamId parameter', () => {
      expect(userDao.findByTeam.length).toBe(1);
    });

    test('should query approved team members, exclude sensitive fields, sort by name asc, and lean', async () => {
      const leanResult = [{ _id: 'u1' }, { _id: 'u2' }];
      const leanMock = vi.fn().mockResolvedValue(leanResult);
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const selectMock = vi.fn().mockReturnValue({ sort: sortMock });
      const findSpy = vi.spyOn(User, 'find').mockReturnValue({ select: selectMock });

      const result = await userDao.findByTeam('team1');

      expect(findSpy).toHaveBeenCalledWith({ teamId: 'team1', status: 'approved' });
      expect(selectMock).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires');
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
      expect(leanMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanResult);
    });

    test('should reject when query chain fails', async () => {
      const selectMock = vi.fn().mockImplementation(() => {
        throw new Error('select failed');
      });
      vi.spyOn(User, 'find').mockReturnValue({ select: selectMock });

      await expect(userDao.findByTeam('team1')).rejects.toThrow('select failed');
    });
  });

  describe('findCoachByTeam', () => {
    test('should be an async function', () => {
      expect(userDao.findCoachByTeam.constructor.name).toBe('AsyncFunction');
    });

    test('should accept teamId parameter', () => {
      expect(userDao.findCoachByTeam.length).toBe(1);
    });

    test('should query coach by team and exclude sensitive fields', async () => {
      const selected = { _id: 'u1', role: 'coach' };
      const selectMock = vi.fn().mockResolvedValue(selected);
      const spy = vi.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });

      const result = await userDao.findCoachByTeam('team1');

      expect(spy).toHaveBeenCalledWith({ teamId: 'team1', role: 'coach' });
      expect(selectMock).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires');
      expect(result).toEqual(selected);
    });

    test('should reject when findOne chain fails', async () => {
      const selectMock = vi.fn().mockImplementation(() => {
        throw new Error('select failed');
      });
      vi.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });

      await expect(userDao.findCoachByTeam('team1')).rejects.toThrow('select failed');
    });
  });

  describe('updateProfile', () => {
    test('should be an async function', () => {
      expect(userDao.updateProfile.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and updateData parameters', () => {
      expect(userDao.updateProfile.length).toBe(2);
    });

    test('should update profile and exclude sensitive fields', async () => {
      const selected = { _id: 'u1', name: 'Updated' };
      const selectMock = vi.fn().mockResolvedValue(selected);
      const spy = vi
        .spyOn(User, 'findByIdAndUpdate')
        .mockReturnValue({ select: selectMock });

      const result = await userDao.updateProfile('u1', { name: 'Updated' });

      expect(spy).toHaveBeenCalledWith('u1', { name: 'Updated' }, { new: true });
      expect(selectMock).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires');
      expect(result).toEqual(selected);
    });

    test('should reject when update fails', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockImplementation(() => {
        throw new Error('update failed');
      });

      await expect(userDao.updateProfile('u1', { name: 'Updated' })).rejects.toThrow('update failed');
    });
  });

  describe('setResetToken', () => {
    test('should be an async function', () => {
      expect(userDao.setResetToken.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id, token, and expires parameters', () => {
      expect(userDao.setResetToken.length).toBe(3);
    });

    test('should set reset token and expiry', async () => {
      const expires = new Date('2026-03-18T12:00:00Z');
      const spy = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({ _id: 'u1' });

      const result = await userDao.setResetToken('u1', 'hashed-token', expires);

      expect(spy).toHaveBeenCalledWith('u1', {
        resetPasswordToken: 'hashed-token',
        resetPasswordExpires: expires
      });
      expect(result).toEqual({ _id: 'u1' });
    });

    test('should reject when update fails', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockRejectedValue(new Error('set token failed'));

      await expect(
        userDao.setResetToken('u1', 'hashed-token', new Date())
      ).rejects.toThrow('set token failed');
    });
  });

  describe('findByResetToken', () => {
    test('should be an async function', () => {
      expect(userDao.findByResetToken.constructor.name).toBe('AsyncFunction');
    });

    test('should accept tokenHash parameter', () => {
      expect(userDao.findByResetToken.length).toBe(1);
    });

    test('should query by token and unexpired resetPasswordExpires', async () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue({ _id: 'u1' });

      const result = await userDao.findByResetToken('token-hash');

      expect(findOneSpy).toHaveBeenCalledWith({
        resetPasswordToken: 'token-hash',
        resetPasswordExpires: { $gt: 1700000000000 }
      });
      expect(result).toEqual({ _id: 'u1' });

      nowSpy.mockRestore();
    });

    test('should reject when findOne fails', async () => {
      vi.spyOn(User, 'findOne').mockRejectedValue(new Error('find token failed'));

      await expect(userDao.findByResetToken('token-hash')).rejects.toThrow('find token failed');
    });
  });

  describe('updatePassword', () => {
    test('should be an async function', () => {
      expect(userDao.updatePassword.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and hashedPassword parameters', () => {
      expect(userDao.updatePassword.length).toBe(2);
    });

    test('should update password and clear reset token fields', async () => {
      const spy = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({ _id: 'u1' });

      const result = await userDao.updatePassword('u1', 'new-hash');

      expect(spy).toHaveBeenCalledWith('u1', {
        password: 'new-hash',
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      });
      expect(result).toEqual({ _id: 'u1' });
    });

    test('should reject when update fails', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockRejectedValue(new Error('password update failed'));

      await expect(userDao.updatePassword('u1', 'new-hash')).rejects.toThrow('password update failed');
    });
  });

  describe('updateStatus', () => {
    test('should be an async function', () => {
      expect(userDao.updateStatus.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id and status parameters', () => {
      expect(userDao.updateStatus.length).toBe(2);
    });

    test('should update status and exclude sensitive fields', async () => {
      const selected = { _id: 'u1', status: 'approved' };
      const selectMock = vi.fn().mockResolvedValue(selected);
      const spy = vi
        .spyOn(User, 'findByIdAndUpdate')
        .mockReturnValue({ select: selectMock });

      const result = await userDao.updateStatus('u1', 'approved');

      expect(spy).toHaveBeenCalledWith('u1', { status: 'approved' }, { new: true });
      expect(selectMock).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires');
      expect(result).toEqual(selected);
    });

    test('should reject when update fails', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockImplementation(() => {
        throw new Error('status update failed');
      });

      await expect(userDao.updateStatus('u1', 'approved')).rejects.toThrow('status update failed');
    });
  });

  describe('deleteOne', () => {
    test('should be an async function', () => {
      expect(userDao.deleteOne.constructor.name).toBe('AsyncFunction');
    });

    test('should accept id parameter', () => {
      expect(userDao.deleteOne.length).toBe(1);
    });

    test('should call findByIdAndDelete', async () => {
      const spy = vi.spyOn(User, 'findByIdAndDelete').mockResolvedValue({ _id: 'u1' });

      const result = await userDao.deleteOne('u1');

      expect(spy).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ _id: 'u1' });
    });

    test('should reject when delete fails', async () => {
      vi.spyOn(User, 'findByIdAndDelete').mockRejectedValue(new Error('delete failed'));

      await expect(userDao.deleteOne('u1')).rejects.toThrow('delete failed');
    });
  });

  describe('module structure', () => {
    test('should have correct exports', () => {
      const exportedKeys = Object.keys(userDao);

      expect(exportedKeys).toContain('create');
      expect(exportedKeys).toContain('findByEmail');
      expect(exportedKeys).toContain('findById');
      expect(exportedKeys).toContain('findByIdWithPassword');
      expect(exportedKeys).toContain('findByTeamAndStatus');
      expect(exportedKeys).toContain('findByTeam');
      expect(exportedKeys).toContain('findCoachByTeam');
      expect(exportedKeys).toContain('updateProfile');
      expect(exportedKeys).toContain('setResetToken');
      expect(exportedKeys).toContain('findByResetToken');
      expect(exportedKeys).toContain('updatePassword');
      expect(exportedKeys).toContain('updateStatus');
      expect(exportedKeys).toContain('deleteOne');
    });
  });
});
