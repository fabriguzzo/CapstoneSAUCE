const mongoose = require("mongoose");

const StatRoleSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    assigneeUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // which stat this team member account is responsible for
    statKey: {
      type: String,
      required: true,
      enum: ["goals", "assists", "shots", "hits", "pim", "saves", "faceoff_tracker", "hit_penalty_tracker", "shots_goals_tracker", "time_of_possession", "pass_tracker"],
    },
  },
  { timestamps: true }
);

// one assignment per stat per user account per team
StatRoleSchema.index({ teamId: 1, assigneeUserId: 1, statKey: 1 }, { unique: true });

const StatRole = mongoose.model("StatRole", StatRoleSchema);

exports.readAll = async (filter = {}) => StatRole.find(filter).lean();

exports.replaceTeamAssignments = async (teamId, assignments) => {
  await StatRole.deleteMany({ teamId });

  const ops = assignments.map((a) => ({
    updateOne: {
      filter: { teamId, assigneeUserId: a.assigneeUserId, statKey: a.statKey },
      update: { $set: { teamId, assigneeUserId: a.assigneeUserId, statKey: a.statKey } },
      upsert: true,
    },
  }));

  return StatRole.bulkWrite(ops);
};

exports.deleteByTeam = async (teamId) => StatRole.deleteMany({ teamId });

exports.StatRole = StatRole;
