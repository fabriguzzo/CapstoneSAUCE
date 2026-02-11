import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  number: number;
  teamId: mongoose.Types.ObjectId;
  position?: string;
}

const PlayerSchema: Schema = new Schema({
  name: { type: String, required: true },
  number: { type: Number, required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  position: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<IPlayer>('Player', PlayerSchema);
