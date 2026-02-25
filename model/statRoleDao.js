const mongoose = require("mongoose");

const StatRoleSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // which stat this player is responsible for
    statKey: {
      type: String,
      required: true,
      enum: ["goals", "assists", "shots", "hits", "pim", "plusMinus", "saves", "goalsAgainst"],
    },
  },
  { timestamps: true }
);

// one assignment per player per team
StatRoleSchema.index({ teamId: 1, playerId: 1 }, { unique: true });

const StatRole = mongoose.model("StatRole", StatRoleSchema);

exports.readAll = async (filter = {}) => StatRole.find(filter).lean();

exports.bulkUpsert = async (teamId, assignments) => {
  const ops = assignments.map((a) => ({
    updateOne: {
      filter: { teamId, playerId: a.playerId },
      update: { $set: { teamId, playerId: a.playerId, statKey: a.statKey } },
      upsert: true,
    },
  }));

  return StatRole.bulkWrite(ops);
};

exports.deleteByTeam = async (teamId) => StatRole.deleteMany({ teamId });

exports.StatRole = StatRole;