import { NextResponse } from 'next/server';
import { getGames, updateGameInDB } from '@/lib/storage';

/**
 * Migration endpoint to fix old Ace games with missing round winners
 * This will populate the winners field for any round where a player has 0 points
 */
export async function POST(request) {
  try {
    const games = await getGames();
    const aceGames = games.filter(g => g.type.toLowerCase() === 'ace');
    
    let migratedCount = 0;
    let roundsFixed = 0;
    
    for (const game of aceGames) {
      let gameMigrated = false;
      
      if (game.rounds && game.rounds.length > 0) {
        const updatedRounds = game.rounds.map(round => {
          // Check if winners field is empty or missing
          const hasWinners = round.winners && Object.keys(round.winners).length > 0;
          
          if (!hasWinners && round.scores) {
            // Populate winners based on 0 scores
            const winners = {};
            let foundWinners = false;
            
            Object.keys(round.scores).forEach(playerId => {
              if (round.scores[playerId] === 0) {
                winners[playerId] = true;
                foundWinners = true;
              }
            });
            
            if (foundWinners) {
              roundsFixed++;
              gameMigrated = true;
              return {
                ...round,
                winners
              };
            }
          }
          
          return round;
        });
        
        if (gameMigrated) {
          // Update the game with fixed rounds
          const updatedGame = {
            ...game,
            rounds: updatedRounds,
            history: updatedRounds // Keep history in sync
          };
          
          await updateGameInDB(updatedGame);
          migratedCount++;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Migration complete! Fixed ${roundsFixed} rounds across ${migratedCount} Ace games.`,
      gamesFixed: migratedCount,
      roundsFixed
    });
    
  } catch (error) {
    console.error('Error migrating Ace games:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to migrate Ace games',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

