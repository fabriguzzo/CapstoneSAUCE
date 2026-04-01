import { describe, test, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const bcrypt = {
  hash: vi.fn(),
};

const cryptoMock = {
  randomBytes: vi.fn(),
  createHash: vi.fn(),
};

const passport = {
  authenticate: vi.fn(),
};

const userDao = {
  findByEmail: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  setResetToken: vi.fn(),
  findByResetToken: vi.fn(),
  updatePassword: vi.fn(),
};

const teamDao = {
  create: vi.fn(),
  read: vi.fn(),
};

const authMiddleware = {
  generateToken: vi.fn(),
};

const emailService = {
  sendPasswordResetEmail: vi.fn(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadControllerWithMocks() {
  const controllerPath = path.resolve(__dirname, "./authController.js");
  const source = fs.readFileSync(controllerPath, "utf8");
  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${source}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: controllerPath });
  const module = { exports: {} };

  const localRequire = (request) => {
    if (request === "bcrypt") return bcrypt;
    if (request === "crypto") return cryptoMock;
    if (request === "../middleware/passport") return passport;
    if (request === "../model/userDao") return userDao;
    if (request === "../model/teamDao") return teamDao;
    if (request === "../middleware/auth") return authMiddleware;
    if (request === "../services/emailService") return emailService;
    throw new Error(`Unexpected require in authController.test.js: ${request}`);
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

describe("authController Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FRONTEND_URL;
  });

  describe("exports", () => {
    test("should export required functions", () => {
      expect(typeof controller.register).toBe("function");
      expect(typeof controller.login).toBe("function");
      expect(typeof controller.getMe).toBe("function");
      expect(typeof controller.forgotPassword).toBe("function");
      expect(typeof controller.resetPassword).toBe("function");
    });
  });

  describe("register", () => {
    test("201: registers a coach and creates a team", async () => {
      const req = {
        body: {
          email: "coach@example.com",
          password: "password123",
          name: "Coach",
          role: "coach",
          teamName: "Team A",
        },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed");
      teamDao.create.mockResolvedValue({ _id: "t1" });
      userDao.create.mockResolvedValue({
        _id: "u1",
        email: "coach@example.com",
        name: "Coach",
        role: "coach",
        teamId: "t1",
        status: "approved",
      });
      authMiddleware.generateToken.mockReturnValue("token123");

      await controller.register(req, res);

      expect(teamDao.create).toHaveBeenCalledWith({ name: "Team A", coach: "Coach" });
      expect(userDao.create).toHaveBeenCalledWith({
        email: "coach@example.com",
        password: "hashed",
        name: "Coach",
        role: "coach",
        teamId: "t1",
        status: "approved",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: "token123",
        user: {
          id: "u1",
          email: "coach@example.com",
          name: "Coach",
          role: "coach",
          teamId: "t1",
          status: "approved",
        },
      });
    });

    test("201: registers a member for an existing team", async () => {
      const req = {
        body: {
          email: "member@example.com",
          password: "password123",
          name: "Member",
          role: "member",
          teamId: "t1",
        },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed");
      teamDao.read.mockResolvedValue({ _id: "t1", name: "Team A" });
      userDao.create.mockResolvedValue({
        _id: "u2",
        email: "member@example.com",
        name: "Member",
        role: "member",
        teamId: "t1",
        status: "pending",
      });
      authMiddleware.generateToken.mockReturnValue("token456");

      await controller.register(req, res);

      expect(teamDao.read).toHaveBeenCalledWith("t1");
      expect(userDao.create).toHaveBeenCalledWith({
        email: "member@example.com",
        password: "hashed",
        name: "Member",
        role: "member",
        teamId: "t1",
        status: "pending",
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("400: missing required fields", async () => {
      const req = { body: { email: "", password: "", name: "", role: "" } };
      const res = makeRes();

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email, password, name, and role are required" });
    });

    test("400: invalid role", async () => {
      const req = {
        body: { email: "x@example.com", password: "password123", name: "X", role: "admin" },
      };
      const res = makeRes();

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Role must be "coach" or "member"' });
    });

    test("400: duplicate email", async () => {
      const req = {
        body: { email: "x@example.com", password: "password123", name: "X", role: "coach", teamName: "Team" },
      };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue({ _id: "u1" });

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "An account with this email already exists" });
    });

    test("500: unexpected register failure", async () => {
      const req = {
        body: { email: "x@example.com", password: "password123", name: "X", role: "coach", teamName: "Team" },
      };
      const res = makeRes();

      userDao.findByEmail.mockRejectedValue(new Error("db fail"));

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Registration failed" });
    });
  });

  describe("login", () => {
    test("200: logs in successfully", async () => {
      const req = {};
      const res = makeRes();
      const next = vi.fn();
      const user = {
        _id: "u1",
        email: "user@example.com",
        name: "User",
        role: "member",
        teamId: "t1",
        status: "approved",
        profilePicture: "/img.png",
      };

      passport.authenticate.mockImplementation((_strategy, _opts, callback) => {
        return () => callback(null, user, null);
      });
      authMiddleware.generateToken.mockReturnValue("token789");

      controller.login(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        token: "token789",
        user: {
          id: "u1",
          email: "user@example.com",
          name: "User",
          role: "member",
          teamId: "t1",
          status: "approved",
          profilePicture: "/img.png",
        },
      });
    });

    test("401: rejects invalid credentials", async () => {
      const req = {};
      const res = makeRes();
      const next = vi.fn();

      passport.authenticate.mockImplementation((_strategy, _opts, callback) => {
        return () => callback(null, null, { message: "Invalid email or password" });
      });

      controller.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid email or password" });
    });

    test("500: passport returns error", async () => {
      const req = {};
      const res = makeRes();
      const next = vi.fn();

      passport.authenticate.mockImplementation((_strategy, _opts, callback) => {
        return () => callback(new Error("boom"), null, null);
      });

      controller.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Login failed" });
    });
  });

  describe("getMe", () => {
    test("200: returns current user profile", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      userDao.findById.mockResolvedValue({
        _id: "u1",
        email: "user@example.com",
        name: "User",
        role: "member",
        teamId: "t1",
        status: "approved",
        profilePicture: "/img.png",
      });

      await controller.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith({
        id: "u1",
        email: "user@example.com",
        name: "User",
        role: "member",
        teamId: "t1",
        status: "approved",
        profilePicture: "/img.png",
      });
    });

    test("404: user not found", async () => {
      const req = { user: { id: "u1" } };
      const res = makeRes();

      userDao.findById.mockResolvedValue(null);

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });
  });

  describe("forgotPassword", () => {
    test("400: missing email", async () => {
      const req = { body: {} };
      const res = makeRes();

      await controller.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email is required" });
    });

    test("200: returns success when user is not found", async () => {
      const req = { body: { email: "missing@example.com" } };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue(null);

      await controller.forgotPassword(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    });

    test("200: stores reset token and sends email when user exists", async () => {
      const req = { body: { email: "user@example.com" } };
      const res = makeRes();

      userDao.findByEmail.mockResolvedValue({ _id: "u1", email: "user@example.com" });
      cryptoMock.randomBytes.mockReturnValue({ toString: vi.fn(() => "rawtoken") });
      const digest = vi.fn(() => "hashedtoken");
      const update = vi.fn(() => ({ digest }));
      cryptoMock.createHash.mockReturnValue({ update, digest });
      userDao.setResetToken.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await controller.forgotPassword(req, res);

      expect(userDao.setResetToken).toHaveBeenCalledTimes(1);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendPasswordResetEmail.mock.calls[0][0]).toBe("user@example.com");
      expect(emailService.sendPasswordResetEmail.mock.calls[0][1]).toContain("/reset-password?token=rawtoken");
      expect(res.json).toHaveBeenCalledWith({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    });
  });

  describe("resetPassword", () => {
    test("400: missing token or newPassword", async () => {
      const req = { body: { token: "", newPassword: "" } };
      const res = makeRes();

      await controller.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Token and new password are required" });
    });

    test("400: password too short", async () => {
      const req = { body: { token: "abc", newPassword: "short" } };
      const res = makeRes();

      await controller.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Password must be at least 8 characters" });
    });

    test("400: invalid reset token", async () => {
      const req = { body: { token: "abc", newPassword: "password123" } };
      const res = makeRes();

      const digest = vi.fn(() => "hashedtoken");
      const update = vi.fn(() => ({ digest }));
      cryptoMock.createHash.mockReturnValue({ update, digest });
      userDao.findByResetToken.mockResolvedValue(null);

      await controller.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired reset token" });
    });

    test("200: resets password successfully", async () => {
      const req = { body: { token: "abc", newPassword: "password123" } };
      const res = makeRes();

      const digest = vi.fn(() => "hashedtoken");
      const update = vi.fn(() => ({ digest }));
      cryptoMock.createHash.mockReturnValue({ update, digest });
      userDao.findByResetToken.mockResolvedValue({ _id: "u1" });
      bcrypt.hash.mockResolvedValue("newhashed");
      userDao.updatePassword.mockResolvedValue(undefined);

      await controller.resetPassword(req, res);

      expect(userDao.updatePassword).toHaveBeenCalledWith("u1", "newhashed");
      expect(res.json).toHaveBeenCalledWith({ message: "Password has been reset successfully" });
    });
  });
});
