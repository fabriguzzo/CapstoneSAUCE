const dao = require("../model/statRoleDao");
const mongoose = require("mongoose");
require("../model/playerDao");
const Player = mongoose.model("Player");

const VALID_KEYS = new Set([
  "goals",
  "assists",
  "shots",
  "hits",
  "pim",
  "plusMinus",
  "saves",
  "goalsAgainst",
]);

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.teamId) filter.teamId = req.query.teamId;
    if (req.query.playerId) filter.playerId = req.query.playerId;

    const rows = await dao.readAll(filter);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("getAll stat roles error:", err);
    return res.status(500).json({ error: "Failed to load stat roles" });
  }
};

exports.bulkSave = async (req, res) => {
  try {
    const { teamId, assignments } = req.body;

    if (!teamId) return res.status(400).json({ error: "teamId is required" });
    if (!Array.isArray(assignments)) return res.status(400).json({ error: "assignments must be an array" });

    // validate payload
    for (const a of assignments) {
      if (!a.playerId) return res.status(400).json({ error: "Each assignment needs playerId" });
      if (!a.statKey || !VALID_KEYS.has(a.statKey)) {
        return res.status(400).json({ error: `Invalid statKey for playerId ${a.playerId}` });
      }
    }

    // make sure all players belong to the team
    const ids = assignments.map((x) => x.playerId);
    const count = await Player.countDocuments({ _id: { $in: ids }, teamId });
    if (count !== ids.length) {
      return res.status(400).json({ error: "One or more players do not belong to that team" });
    }

    const result = await dao.bulkUpsert(teamId, assignments);
    return res.status(200).json({ message: "Roles saved", result });
  } catch (err) {
    console.error("bulkSave stat roles error:", err);
    return res.status(500).json({ error: "Failed to save roles" });
  }
};