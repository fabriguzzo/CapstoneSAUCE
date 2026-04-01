import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const bcrypt = {
  hash: vi.fn(),
};

const userDao = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  updateProfile: vi.fn(),
  findByTeamAndStatus: vi.fn(),
  findByTeam: vi.fn(),
  updateStatus: vi.fn(),
  updatePlayerLink: vi.fn(),
  deleteOne: vi.fn(),
};

const teamDao = {
  read: vi.fn(),
};

const playerDao = {
  findByTeamAndName: vi.fn(),
};

const emailService = {
  sendApprovalNotificationEmail: vi.fn(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMocks() {
  const controllerPath = path.resolve(__dirname, "./userController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };

  const localRequire = (request) => {
    if (request === "bcrypt") return bcrypt;
    if (request === "../model/userDao") return userDao;
    if (request === "../model/teamDao") return teamDao;
    if (request === "../model/playerDao") return playerDao;
    if (request === "../services/emailService") return emailService;
    throw new Error(`Unexpected require in userController.test.js: ${request}`);
  };

  fn(module.exports, localRequire, module, controllerPath, path.dirname(controllerPath));
  return module.exports;
}

const controller = loadControllerWithMocks();

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe("userController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    test("should export all required functions", () => {
      expect(typeof controller.getProfile).toBe("function");
      expect(typeof controller.updateProfile).toBe("function");
      expect(typeof controller.getPendingMembers).toBe("function");
      expect(typeof controller.getTeamMembers).toBe("function");
      expect(typeof controller.approveMember).toBe("function");
      expect(typeof controller.rejectMember).toBe("function");
      expect(typeof controller.removeMember).toBe("function");
    });
  });

  describe("getProfile", () => {
    test("200: returns user profile", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      userDao.findById.mockResolvedValue({ _id: "u1", name: "Fab" });

      await controller.getProfile(req, res);

      expect(userDao.findById).toHaveBeenCalledWith("u1");
      expect(res.json).toHaveBeenCalledWith({ _id: "u1", name: "Fab" });
      expect(res.status).not.toHaveBeenCalled();
    });

    test("404: user not found", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      userDao.findById.mockResolvedValue(null);

      await controller.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("500: findById throws", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      userDao.findById.mockRejectedValue(new Error("db fail"));

      await controller.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch profile" });
    });
  });

  describe("updateProfile", () => {
    test("200: updates name only", async () => {
      const req = {
        user: { id: "u1" },
        body: { name: "  Fabrizio  " },
      };
      const res = makeRes();

      userDao.updateProfile.mockResolvedValue({ _id: "u1", name: "Fabrizio" });

      await controller.updateProfile(req, res);

      expect(userDao.updateProfile).toHaveBeenCalledWith("u1", { name: "Fabrizio" });
      expect(res.json).toHaveBeenCalledWith({ _id: "u1", name: "Fabrizio" });
    });

    test("400: empty name", async () => {
      const req = {
        user: { id: "u1" },
        body: { name: "   " },
      };
      const res = makeRes();

      await controller.updateProfile(req, res);

      expect(userDao.updateProfile).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Name cannot be empty" });
    });

    test("200: updates email after normalization", async () => {
      const req = {
        user: { id: "u1" },
        body: { email: "  FAB@EXAMPLE.COM  " },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue(null);
      userDao.updateProfile.mockResolvedValue({ _id: "u1", email: "fab@example.com" });

      await controller.updateProfile(req, res);

      expect(userDao.findByEmail).toHaveBeenCalledWith("fab@example.com");
      expect(userDao.updateProfile).toHaveBeenCalledWith("u1", { email: "fab@example.com" });
      expect(res.json).toHaveBeenCalledWith({ _id: "u1", email: "fab@example.com" });
    });

    test("400: email already in use by another account", async () => {
      const req = {
        user: { id: "u1" },
        body: { email: "taken@example.com" },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue({ _id: "u2" });

      await controller.updateProfile(req, res);

      expect(userDao.updateProfile).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email already in use by another account",
      });
    });

    test("200: allows same email for same user", async () => {
      const req = {
        user: { id: "u1" },
        body: { email: "same@example.com" },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue({ _id: { toString: () => "u1" } });
      userDao.updateProfile.mockResolvedValue({ _id: "u1", email: "same@example.com" });

      await controller.updateProfile(req, res);

      expect(userDao.updateProfile).toHaveBeenCalledWith("u1", {
        email: "same@example.com",
      });
      expect(res.json).toHaveBeenCalledWith({ _id: "u1", email: "same@example.com" });
    });

    test("400: password too short", async () => {
      const req = {
        user: { id: "u1" },
        body: { password: "short" },
      };
      const res = makeRes();

      await controller.updateProfile(req, res);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userDao.updateProfile).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Password must be at least 8 characters",
      });
    });

    test("200: hashes password with salt rounds 12", async () => {
      const req = {
        user: { id: "u1" },
        body: { password: "longpassword" },
      };
      const res = makeRes();

      bcrypt.hash.mockResolvedValue("hashed-password");
      userDao.updateProfile.mockResolvedValue({ _id: "u1" });

      await controller.updateProfile(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("longpassword", 12);
      expect(userDao.updateProfile).toHaveBeenCalledWith("u1", {
        password: "hashed-password",
      });
      expect(res.json).toHaveBeenCalledWith({ _id: "u1" });
    });

    test("200: updates profile picture when file exists", async () => {
      const req = {
        user: { id: "u1" },
        body: {},
        file: { filename: "pic123.png" },
      };
      const res = makeRes();

      userDao.updateProfile.mockResolvedValue({
        _id: "u1",
        profilePicture: "/uploads/profiles/pic123.png",
      });

      await controller.updateProfile(req, res);

      expect(userDao.updateProfile).toHaveBeenCalledWith("u1", {
        profilePicture: "/uploads/profiles/pic123.png",
      });
      expect(res.json).toHaveBeenCalledWith({
        _id: "u1",
        profilePicture: "/uploads/profiles/pic123.png",
      });
    });

    test("200: updates name, email, password, and profile picture together", async () => {
      const req = {
        user: { id: "u1" },
        body: {
          name: "  Fab  ",
          email: "  FAB@EXAMPLE.COM ",
          password: "supersecure",
        },
        file: { filename: "fab.png" },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed-supersecure");
      userDao.updateProfile.mockResolvedValue({ _id: "u1", name: "Fab" });

      await controller.updateProfile(req, res);

      expect(userDao.updateProfile).toHaveBeenCalledWith("u1", {
        name: "Fab",
        email: "fab@example.com",
        password: "hashed-supersecure",
        profilePicture: "/uploads/profiles/fab.png",
      });
      expect(res.json).toHaveBeenCalledWith({ _id: "u1", name: "Fab" });
    });

    test("404: user not found during update", async () => {
      const req = {
        user: { id: "u1" },
        body: { name: "Fab" },
      };
      const res = makeRes();

      userDao.updateProfile.mockResolvedValue(null);

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("500: updateProfile throws", async () => {
      const req = {
        user: { id: "u1" },
        body: { name: "Fab" },
      };
      const res = makeRes();

      userDao.updateProfile.mockRejectedValue(new Error("update fail"));

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update profile" });
    });

    test("500: findByEmail throws", async () => {
      const req = {
        user: { id: "u1" },
        body: { email: "fab@example.com" },
      };
      const res = makeRes();

      userDao.findByEmail.mockRejectedValue(new Error("email lookup fail"));

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update profile" });
    });

    test("500: bcrypt.hash throws", async () => {
      const req = {
        user: { id: "u1" },
        body: { password: "verysecurepassword" },
      };
      const res = makeRes();

      bcrypt.hash.mockRejectedValue(new Error("hash fail"));

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update profile" });
    });
  });

  describe("getPendingMembers", () => {
    test("200: returns pending members", async () => {
      const req = { user: { teamId: "t1" } };
      const res = makeRes();

      userDao.findByTeamAndStatus.mockResolvedValue([{ _id: "u1" }]);

      await controller.getPendingMembers(req, res);

      expect(userDao.findByTeamAndStatus).toHaveBeenCalledWith("t1", "pending");
      expect(res.json).toHaveBeenCalledWith([{ _id: "u1" }]);
    });

    test("500: findByTeamAndStatus throws", async () => {
      const req = { user: { teamId: "t1" } };
      const res = makeRes();

      userDao.findByTeamAndStatus.mockRejectedValue(new Error("fail"));

      await controller.getPendingMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch pending members" });
    });
  });

  describe("getTeamMembers", () => {
    test("200: returns team members", async () => {
      const req = { user: { teamId: "t1" } };
      const res = makeRes();

      userDao.findByTeam.mockResolvedValue([{ _id: "u1" }, { _id: "u2" }]);

      await controller.getTeamMembers(req, res);

      expect(userDao.findByTeam).toHaveBeenCalledWith("t1");
      expect(res.json).toHaveBeenCalledWith([{ _id: "u1" }, { _id: "u2" }]);
    });

    test("500: findByTeam throws", async () => {
      const req = { user: { teamId: "t1" } };
      const res = makeRes();

      userDao.findByTeam.mockRejectedValue(new Error("fail"));

      await controller.getTeamMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch team members" });
    });
  });

  describe("approveMember", () => {
    test("200: approves member and sends approval email when team exists", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        teamId: { toString: () => "t1" },
      });
      userDao.updateStatus.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        status: "approved",
      });
      teamDao.read.mockResolvedValue({ _id: "t1", name: "Loyola" });
      emailService.sendApprovalNotificationEmail.mockResolvedValue(undefined);

      await controller.approveMember(req, res);

      expect(userDao.findById).toHaveBeenCalledWith("u2");
      expect(userDao.updateStatus).toHaveBeenCalledWith("u2", "approved");
      expect(teamDao.read).toHaveBeenCalledWith("t1");
      expect(emailService.sendApprovalNotificationEmail).toHaveBeenCalledWith(
        "member@example.com",
        "Loyola"
      );
      expect(res.json).toHaveBeenCalledWith({
        _id: "u2",
        email: "member@example.com",
        status: "approved",
      });
    });

    test("404: user not found", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue(null);

      await controller.approveMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("403: cannot manage member from another team", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        teamId: { toString: () => "other-team" },
      });

      await controller.approveMember(req, res);

      expect(userDao.updateStatus).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "You can only manage members of your own team",
      });
    });

    test("200: approval still succeeds if team is not found", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        teamId: { toString: () => "t1" },
      });
      userDao.updateStatus.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        status: "approved",
      });
      teamDao.read.mockResolvedValue(null);

      await controller.approveMember(req, res);

      expect(emailService.sendApprovalNotificationEmail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        _id: "u2",
        email: "member@example.com",
        status: "approved",
      });
    });

    test("200: approval still succeeds if email sending fails", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        teamId: { toString: () => "t1" },
      });
      userDao.updateStatus.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        status: "approved",
      });
      teamDao.read.mockResolvedValue({ _id: "t1", name: "Loyola" });
      emailService.sendApprovalNotificationEmail.mockRejectedValue(new Error("email fail"));

      await controller.approveMember(req, res);

      expect(res.json).toHaveBeenCalledWith({
        _id: "u2",
        email: "member@example.com",
        status: "approved",
      });
    });

    test("500: outer approve flow throws", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockRejectedValue(new Error("approve fail"));

      await controller.approveMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to approve member" });
    });
  });

  describe("rejectMember", () => {
    test("200: rejects member request", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        teamId: { toString: () => "t1" },
      });
      userDao.deleteOne.mockResolvedValue(true);

      await controller.rejectMember(req, res);

      expect(userDao.deleteOne).toHaveBeenCalledWith("u2");
      expect(res.json).toHaveBeenCalledWith({ message: "Member request rejected" });
    });

    test("404: user not found", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue(null);

      await controller.rejectMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("403: cannot reject member from another team", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        teamId: { toString: () => "other-team" },
      });

      await controller.rejectMember(req, res);

      expect(userDao.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "You can only manage members of your own team",
      });
    });

    test("500: reject flow throws", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockRejectedValue(new Error("reject fail"));

      await controller.rejectMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to reject member" });
    });
  });

  describe("removeMember", () => {
    test("200: removes non-coach member", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        role: "player",
        teamId: { toString: () => "t1" },
      });
      userDao.deleteOne.mockResolvedValue(true);

      await controller.removeMember(req, res);

      expect(userDao.deleteOne).toHaveBeenCalledWith("u2");
      expect(res.json).toHaveBeenCalledWith({ message: "Member removed from team" });
    });

    test("404: user not found", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue(null);

      await controller.removeMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("403: cannot remove member from another team", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        role: "player",
        teamId: { toString: () => "other-team" },
      });

      await controller.removeMember(req, res);

      expect(userDao.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "You can only manage members of your own team",
      });
    });

    test("400: cannot remove coach", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u2",
        role: "coach",
        teamId: { toString: () => "t1" },
      });

      await controller.removeMember(req, res);

      expect(userDao.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Cannot remove the coach from the team",
      });
    });

    test("500: remove flow throws", async () => {
      const req = {
        params: { userId: "u2" },
        user: { teamId: "t1" },
      };
      const res = makeRes();

      userDao.findById.mockRejectedValue(new Error("remove fail"));

      await controller.removeMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to remove member" });
    });
  });
});
