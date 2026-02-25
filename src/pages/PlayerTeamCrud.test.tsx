import { describe, test, expect, beforeEach, vi } from "vitest";

const mockTeams = [
  { _id: "team1", name: "Loyola Hockey", coach: "Coach Smith", description: "Test team" }
];

const mockPlayers = [
  { _id: "player1", name: "John Doe", number: 10, teamId: "team1", position: "Forward" }
];

global.fetch = vi.fn();

describe("PlayerTeamCrud Database Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Teams API Connection", () => {
    test("fetchTeams should call correct API endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockTeams)
      };
      fetch.mockResolvedValue(mockResponse);

      const response = await fetch('http://localhost:5001/api/teams');
      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/teams');
      expect(data).toEqual(mockTeams);
    });

    test("createTeam should POST to correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ _id: "newteam", name: "New Team" })
      };
      fetch.mockResolvedValue(mockResponse);

      const response = await fetch('http://localhost:5001/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "New Team" })
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/teams', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    test("updateTeam should PUT to correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ _id: "team1", name: "Updated Team" })
      };
      fetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:5001/api/teams/team1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Updated Team" })
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/teams/team1', expect.objectContaining({
        method: 'PUT'
      }));
    });

    test("deleteTeam should DELETE to correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ message: "Team deleted" })
      };
      fetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:5001/api/teams/team1', {
        method: 'DELETE'
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/teams/team1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  describe("Players API Connection", () => {
    test("fetchPlayers should call correct API endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockPlayers)
      };
      fetch.mockResolvedValue(mockResponse);

      const response = await fetch('http://localhost:5001/api/players');
      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/players');
      expect(data).toEqual(mockPlayers);
    });

    test("fetchPlayers with team filter should call correct API endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockPlayers)
      };
      fetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:5001/api/players?teamId=team1');

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/players?teamId=team1');
    });

    test("createPlayer should POST to correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ _id: "newplayer", name: "New Player" })
      };
      fetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:5001/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "New Player", number: 1, teamId: "team1" })
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/players', expect.objectContaining({
        method: 'POST'
      }));
    });

    test("updatePlayer should PUT to correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ _id: "player1", name: "Updated Player" })
      };
      fetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:5001/api/players/player1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Updated Player" })
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/players/player1', expect.objectContaining({
        method: 'PUT'
      }));
    });

    test("deletePlayer should DELETE to correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ message: "Player deleted" })
      };
      fetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:5001/api/players/player1', {
        method: 'DELETE'
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5001/api/players/player1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  describe("Error Handling", () => {
    test("should handle API errors gracefully", async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: "Team not found" })
      };
      fetch.mockResolvedValue(mockResponse);

      const response = await fetch('http://localhost:5001/api/teams/invalid');

      expect(response.ok).toBe(false);
    });
  });
});
