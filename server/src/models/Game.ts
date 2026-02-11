import mongoose, { Schema, Document } from 'mongoose';

const PlayerSchema = new Schema({
  number: Number,
  name: String
}, { _id: false });

const LineupEntrySchema = new Schema({
  playerId: Schema.Types.ObjectId,
  slot: Number
}, { _id: false });

export const GAME_TYPES = [
  'regular-season',
  'league',
  'out-of-league',
  'playoff',
  'final',
  'tournament'
] as const;

export interface IGame extends Document {
  teamId: mongoose.Types.ObjectId;
  gameType: typeof GAME_TYPES[number];
  gameDate: Date;
  lineup: { playerId: mongoose.Types.ObjectId; slot: number }[];
  opponent: {
    teamName: string;
    roster: { number: number; name: string }[];
  };
  score: {
    us: number;
    them: number;
  };
  status: 'scheduled' | 'in-progress' | 'finished';
  result?: string;
  dateCreated: Date;
  dateUpdated?: Date;
}

const GameSchema: Schema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  gameType: { 
    type: String, 
    enum: GAME_TYPES, 
    required: true 
  },
  gameDate: { type: Date, required: true },
  lineup: [LineupEntrySchema],
  opponent: {
    teamName: String,
    roster: [PlayerSchema]
  },
  score: {
    us: { type: Number, default: 0 },
    them: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'finished'],
    default: 'scheduled'
  },
  result: String,
  dateCreated: { type: Date, default: Date.now },
  dateUpdated: Date
});

export default mongoose.model<IGame>('Game', GameSchema);
