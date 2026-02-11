/**
 * Seed script to populate the database with test data
 * Creates a team "loyola" with 15 players for testing purposes
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Team from './src/models/Team';
import Player from './src/models/Player';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capstone-sauce';

const loyolaPlayers = [
  { name: 'Michael Johnson', number: 1, position: 'Goalie' },
  { name: 'David Smith', number: 2, position: 'Defense' },
  { name: 'James Wilson', number: 3, position: 'Defense' },
  { name: 'Christopher Brown', number: 4, position: 'Left Wing' },
  { name: 'Matthew Davis', number: 5, position: 'Center' },
  { name: 'Daniel Martinez', number: 6, position: 'Right Wing' },
  { name: 'Andrew Anderson', number: 7, position: 'Bench' },
  { name: 'Joshua Taylor', number: 8, position: 'Bench' },
  { name: 'Ryan Thomas', number: 9, position: 'Bench' },
  { name: 'Kevin White', number: 10, position: 'Bench' },
  { name: 'Jason Harris', number: 11, position: 'Bench' },
  { name: 'Brian Martin', number: 12, position: 'Bench' },
  { name: 'Eric Thompson', number: 13, position: 'Bench' },
  { name: 'Mark Garcia', number: 14, position: 'Bench' },
  { name: 'Steven Rodriguez', number: 15, position: 'Bench' }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if loyola team already exists
    let loyolaTeam = await Team.findOne({ name: 'loyola' });
    
    if (loyolaTeam) {
      console.log('Team "loyola" already exists');
      
      // Check if players already exist
      const existingPlayers = await Player.find({ teamId: loyolaTeam._id });
      
      if (existingPlayers.length === 15) {
        console.log('All 15 players already exist for loyola team');
        console.log('Seed data already present!');
      } else {
        console.log(`Found ${existingPlayers.length} players, expected 15. Creating missing players...`);
        
        // Create missing players
        for (const playerData of loyolaPlayers) {
          const exists = existingPlayers.some(p => p.name === playerData.name);
          if (!exists) {
            await Player.create({
              ...playerData,
              teamId: loyolaTeam!._id
            });
            console.log(`Created player: ${playerData.name}`);
          }
        }
        console.log('All players created successfully!');
      }
    } else {
      // Create loyola team
      console.log('Creating team "loyola"...');
      loyolaTeam = await Team.create({
        name: 'loyola',
        coach: 'Coach Smith',
        description: 'Loyola test team for development'
      });
      console.log(`Created team: ${loyolaTeam.name} (ID: ${loyolaTeam._id})`);

      // Create 15 players for loyola team
      console.log('Creating 15 players for loyola team...');
      for (const playerData of loyolaPlayers) {
        const player = await Player.create({
          ...playerData,
          teamId: loyolaTeam._id
        });
        console.log(`Created player: ${player.name} (#${player.number})`);
      }
      console.log('All players created successfully!');
    }

    console.log('\nSeed data summary:');
    console.log('- Team: loyola');
    console.log('- Players: 15 players created');
    
    const finalTeam = await Team.findOne({ name: 'loyola' });
    const finalPlayers = await Player.find({ teamId: finalTeam!._id }).sort({ number: 1 });
    
    console.log('\nFinal roster:');
    finalPlayers.forEach(p => {
      console.log(`  #${p.number} - ${p.name} (${p.position})`);
    });

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seed script
seedDatabase();
