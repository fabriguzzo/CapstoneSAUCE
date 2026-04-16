const dao = require("../model/statRoleDao");
const userDao = require("../model/userDao");
const notificationDao = require("../model/notificationDao");

const VALID_KEYS = new Set([
  "goals",
  "assists",
  "shots",
  "hits",
  "pim",
  "saves",
  "faceoff_tracker",
  "hit_penalty_tracker",
  "shots_goals_tracker",
  "time_of_possession",
  "pass_tracker",
]);

const STAT_LABELS = {
  goals: "Goals",
  assists: "Assists",
  shots: "Shots",
  hits: "Hits",
  pim: "PIM",
  saves: "Saves",
  faceoff_tracker: "Faceoff Tracker",
  hit_penalty_tracker: "Hit & Penalty Tracker",
  shots_goals_tracker: "Shots & Goals Tracker",
  time_of_possession: "Time of Possession",
  pass_tracker: "Pass Tracker",
};

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.teamId) filter.teamId = req.query.teamId;
    if (req.query.assigneeUserId) filter.assigneeUserId = req.query.assigneeUserId;

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
    const seenAssignmentKeys = new Set();
    for (const a of assignments) {
      if (!a.assigneeUserId) return res.status(400).json({ error: "Each assignment needs assigneeUserId" });
      if (!a.statKey || !VALID_KEYS.has(a.statKey)) {
        return res.status(400).json({ error: `Invalid statKey for assigneeUserId ${a.assigneeUserId}` });
      }
      const assignmentKey = `${a.assigneeUserId}:${a.statKey}`;
      if (seenAssignmentKeys.has(assignmentKey)) {
        return res.status(400).json({ error: `Duplicate stat assignment for assigneeUserId ${a.assigneeUserId}` });
      }
      seenAssignmentKeys.add(assignmentKey);
    }

    // make sure all assignees are approved member accounts on the team
    const ids = [...new Set(assignments.map((x) => x.assigneeUserId))];
    const approvedMembers = await userDao.findApprovedMembersByIds(ids, teamId);
    if (approvedMembers.length !== ids.length) {
      return res.status(400).json({ error: "One or more assignees are not approved member accounts on that team" });
    }

    const previousRoles = await dao.readAll({ teamId });
    const memberById = new Map(approvedMembers.map((member) => [member._id.toString(), member]));
    const previousAssignmentKeys = new Set(
      previousRoles.map((row) => `${row.assigneeUserId.toString()}:${row.statKey}`)
    );

    const result = await dao.replaceTeamAssignments(teamId, assignments);

    const notificationsToCreate = assignments.flatMap((assignment) => {
      const assignmentKey = `${assignment.assigneeUserId}:${assignment.statKey}`;
      if (previousAssignmentKeys.has(assignmentKey)) return [];

      const recipient = memberById.get(assignment.assigneeUserId);
      if (!recipient) return [];

      return [{
        recipientUserId: recipient._id,
        playerId: recipient.playerId || null,
        teamId,
        assignedByUserId: req.user?.id,
        statKey: assignment.statKey,
        message: `You were assigned to track ${STAT_LABELS[assignment.statKey]}.`,
        assignedAt: new Date(),
        seen: false,
      }];
    });

    await notificationDao.createMany(notificationsToCreate);
    return res.status(200).json({ message: "Roles saved", result });
  } catch (err) {
    console.error("bulkSave stat roles error:", err);
    return res.status(500).json({ error: "Failed to save roles" });
  }
};
