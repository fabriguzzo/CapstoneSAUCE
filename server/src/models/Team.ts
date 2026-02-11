import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  coach?: string;
  description?: string;
}

const TeamSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  coach: { type: String },
  description: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<ITeam>('Team', TeamSchema);
