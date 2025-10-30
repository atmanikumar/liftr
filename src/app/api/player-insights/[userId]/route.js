import { NextResponse } from 'next/server';
import { getGames, getUserById } from '@/lib/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }) : null;

// Log initialization status (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[Player Insights] Gemini AI:', model ? '✓ Enabled' : '✗ Disabled (using fallback)');
}

// Generate comprehensive narrative analysis for a player using AI
async function generateInsights(summary, games, gameType) {
  const highlights = [];
  
  // Generate highlights based on performance (rule-based)
  if (summary.recentForm.winRate > summary.winRate + 10) {
    highlights.push('Hot Streak');
  }
  if (summary.winRate >= 40) {
    highlights.push('Dominant');
  }
  if (summary.finalsRate >= 60) {
    highlights.push('Finals Master');
  }
  if (summary.dropRate <= 15) {
    highlights.push('Brave Heart');
  } else if (summary.dropRate >= 35) {
    highlights.push('Strategic');
  }
  if (summary.roundWinRate >= 25) {
    highlights.push('Round Champion');
  }
  if (summary.avgPointsPerRound <= 20) {
    highlights.push('Low Scorer');
  }
  
  // Win streak detection
  const recentWins = games.slice(0, 10).filter(g => {
    const isWinner = g.winner === summary.userId || (g.winners && g.winners.includes(summary.userId));
    return isWinner;
  }).length;
  
  if (recentWins >= 5) {
    highlights.push('Win Streak');
  }
  
  if (games.length > 0 && games[0].isWinner) {
    highlights.push('Best Win');
  }
  
  let narrative = '';
  let usedAI = false;
  
  // Use AI if API key is available, otherwise fallback to rule-based
  if (model) {
    try {
      const playRatio = summary.totalRounds > 0
        ? Math.round((summary.totalRoundsPlayed / summary.totalRounds) * 100)
        : 0;
      const successRate = summary.totalRoundsPlayed > 0 && summary.totalRoundsWon > 0
        ? Math.round((summary.totalRoundsWon / summary.totalRoundsPlayed) * 100)
        : 0;
      
      const prompt = gameType.toLowerCase() === 'rummy' 
        ? `Stats: Games ${summary.totalGames} | Win ${summary.winRate}% | Recent ${summary.recentForm.winRate}% | Finals ${summary.finalsRate}% | Drop ${summary.dropRate}% | RoundWin ${summary.roundWinRate}%

Write a 5-6 line BALANCED Rummy player summary in TAMIL SCRIPT ONLY. NO English letters.

IMPORTANT: DO NOT mention any numbers or percentages. Instead use qualitative descriptions.

Use words like:
- Overall: நல்ல (good), சிறப்பு (excellent), சராசரி (average), பலவீனம் (weak), நடுத்தர (medium)
- Strengths: வலுவான (strong), மிகச்சிறந்த (very good), திறமையான (skilled), சிறப்பாக (excellently)
- Weaknesses: மேம்படுத்த வேண்டும் (needs improvement), கவனம் தேவை (needs attention), சற்று குறைவு (a bit low)

For difficult Tamil words, use Tamil script with English words:
- கேம் (game), ப்ளேயர் (player), ரவுண்ட் (round), ஃபைனல்ஸ் (finals), ட்ராப் (drop), வின் (win)

Tone: BALANCED - friendly but professional. Respectful. NO disrespect, NO movie dialogues.

Cover: How good/bad/average the player is, strong areas, areas needing improvement. Direct start - NO intro words, NO numbers.`
        : `Stats: Games ${summary.totalGames} | Wins ${summary.wins} | WinRate ${summary.winRate}% | Recent ${summary.recentForm.winRate}%

Write 3-4 line BALANCED ${gameType} player summary in TAMIL SCRIPT ONLY. NO English letters.

IMPORTANT: DO NOT mention numbers or percentages. Use qualitative words: நல்ல (good), சிறப்பு (excellent), சராசரி (average), வலுவான (strong).

Tone: Friendly but professional. Respectful. NO movie dialogues. Use Tamil script for English words (கேம், வின், ப்ளேயர்). Direct start. Cover how good/bad player is, strengths, improvements needed. NO numbers.`;

      console.log(`[Gemini AI] Generating insights for ${gameType} player (${summary.totalGames} games)...`);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      narrative = response.text().trim();
      usedAI = true;
      
      console.log(`[Gemini AI] ✓ Generated ${narrative.length} character analysis`);
    } catch (error) {
      console.error('[Gemini AI] ✗ Error:', error.message || error);
      
      // Check for specific error types
      if (error.status === 429) {
        console.log('[Gemini AI] ⚠️  Rate limit reached. Free tier: 15 requests/min.');
      } else if (error.status === 401 || error.status === 403) {
        console.log('[Gemini AI] ⚠️  Invalid API key. Check GEMINI_API_KEY in .env.local');
      } else if (error.status === 404) {
        console.log('[Gemini AI] ⚠️  Model not found. Using gemini-pro');
      }
      
      console.log('[Gemini AI] Using fallback narrative...');
      // Fallback to basic summary if AI fails
      narrative = `Across ${summary.totalGames} games, shows ${summary.winRate}% win rate with ${summary.recentForm.winRate}% recent form. ${gameType === 'Rummy' ? `Finals reach: ${summary.finalsRate}%, drop rate: ${summary.dropRate}%, round wins: ${summary.roundWinRate}%.` : `${summary.wins} victories demonstrating ${summary.winRate >= 40 ? 'strong' : 'developing'} performance.`}`;
    }
  } else {
    // Fallback: Simple rule-based narrative when no API key
    console.log('[Player Insights] No Gemini API key - using rule-based analysis');
    const playRatio = summary.totalRounds > 0
      ? Math.round((summary.totalRoundsPlayed / summary.totalRounds) * 100)
      : 0;
    const successRate = summary.totalRoundsPlayed > 0 && summary.totalRoundsWon > 0
      ? Math.round((summary.totalRoundsWon / summary.totalRoundsPlayed) * 100)
      : 0;
    
    const recentFormText = summary.recentForm.winRate > summary.winRate + 10
      ? `showing momentum with ${summary.recentForm.winRate}% recent win rate`
      : summary.recentForm.winRate < summary.winRate - 10
      ? `experiencing dip in recent form (${summary.recentForm.winRate}%)`
      : `maintaining steady ${summary.recentForm.winRate}% recent form`;
    
    if (gameType.toLowerCase() === 'rummy') {
      // Determine playing style
      const styleDesc = summary.dropRate <= 15 
        ? `aggressive, high-risk player who commits to most hands (${summary.dropRate}% drop rate)`
        : summary.dropRate >= 35
        ? `cautious, selective player who frequently drops weak hands (${summary.dropRate}% drop rate)`
        : `balanced player who adapts their drop strategy situationally (${summary.dropRate}% drop rate)`;
      
      // Strengths
      const strengths = [];
      if (summary.avgPointsPerRound <= 20) strengths.push('excellent point control');
      if (summary.finalsRate >= 50) strengths.push('strong finals reach');
      if (summary.roundWinRate >= 20) strengths.push('consistent round wins');
      if (summary.winRate >= 40) strengths.push('dominant win rate');
      
      // Weaknesses
      const weaknesses = [];
      if (summary.avgPointsPerRound > 30) weaknesses.push('heavy point accumulation');
      if (summary.finalsRate < 30) weaknesses.push('struggles reaching finals');
      if (summary.roundWinRate < 15) weaknesses.push('low round win rate');
      if (summary.dropRate > 40) weaknesses.push('over-reliance on drops');
      
      const strengthText = strengths.length > 0 
        ? `Key strengths include ${strengths.join(', ')}.`
        : `Shows potential with room for improvement.`;
      
      const weaknessText = weaknesses.length > 0
        ? ` Areas for improvement: ${weaknesses.join(', ')}.`
        : ` Maintains solid fundamentals across all aspects.`;
      
      narrative = `This player demonstrates ${styleDesc} across ${summary.totalGames} games, achieving ${summary.winRate}% win rate and ${recentFormText}. ` +
        `In round-by-round play, they win ${summary.roundWinRate}% of rounds when engaged, playing through ${playRatio}% of all rounds with ${successRate}% success rate. ` +
        `They average ${summary.avgPointsPerRound} points per round and reach finals in ${summary.finalsRate}% of games. ` +
        `${strengthText}${weaknessText} ` +
        `${summary.totalGames >= 50 ? 'As a seasoned player with sophisticated strategy, they understand when to push and when to fold.' : summary.totalGames >= 20 ? 'Developing a distinct playstyle with growing pattern recognition.' : 'Building experience with emerging gameplay patterns.'}`;
    } else {
      const styleDesc = summary.winRate >= 40 ? 'dominant' : summary.winRate >= 25 ? 'competitive' : 'developing';
      
      const strengths = [];
      if (summary.winRate >= 40) strengths.push('high win rate');
      if (summary.recentForm.winRate > summary.winRate + 10) strengths.push('strong momentum');
      
      const weaknesses = [];
      if (summary.winRate < 25) weaknesses.push('needs consistency');
      if (summary.recentForm.winRate < summary.winRate - 10) weaknesses.push('recent dip in form');
      
      const strengthText = strengths.length > 0 ? `Strengths: ${strengths.join(', ')}.` : '';
      const weaknessText = weaknesses.length > 0 ? ` Areas to improve: ${weaknesses.join(', ')}.` : '';
      
      narrative = `This player shows ${styleDesc} performance across ${summary.totalGames} games with ${summary.winRate}% win rate, ${recentFormText}. ` +
        `They've secured ${summary.wins} victories, ` +
        `${gameType === 'Chess' && summary.totalGames >= 10 ? (summary.winRate >= 40 ? 'displaying strong strategic thinking and endgame execution' : 'showing growing tactical awareness with room for refinement') : (summary.winRate >= 30 ? 'demonstrating consistent competitive ability' : 'building foundational skills with each game')}. ` +
        `${strengthText}${weaknessText}`;
    }
  }
  
  return { 
    insights: [narrative], 
    highlights,
    generatedBy: usedAI ? 'gemini' : 'rule-based'
  };
}

// GET AI-powered insights for a player
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    const games = await getGames();
    const player = await getUserById(userId);
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    // Filter games by type and where player participated
    const playerGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.players.some(p => p.id === userId) &&
      g.status === 'completed'
    );
    
    if (playerGames.length === 0) {
      return NextResponse.json({
        player: {
          id: player.id,
          name: player.name,
          profilePhoto: player.profilePhoto
        },
        gameType,
        insights: [`Welcome to ${gameType}! Start playing to get personalized insights about your game.`],
        highlights: [],
        summary: null
      });
    }
    
    // Sort by date (newest first)
    const sortedGames = playerGames.sort((a, b) => 
      new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
    );
    
    // Calculate summary stats
    const totalGames = sortedGames.length;
    const wins = sortedGames.filter(g => {
      const isWinner = g.winner === userId || (g.winners && g.winners.includes(userId));
      return isWinner;
    }).length;
    
    let finals = 0;
    let totalRoundsPlayed = 0;
    let totalRoundsWon = 0;
    let totalDrops = 0;
    let totalPointsScored = 0;
    
    sortedGames.forEach(game => {
      const playerInGame = game.players.find(p => p.id === userId);
      
      // Check finals
      if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
        const lastRound = game.rounds[game.rounds.length - 1];
        if (lastRound.scores && (lastRound.scores[userId] !== 0 || !playerInGame?.isLost)) {
          finals++;
        }
      }
      
      // Count rounds
      if (game.rounds) {
        game.rounds.forEach(round => {
          if (round.scores && round.scores[userId] !== undefined) {
            const isDropped = (round.drops && round.drops[userId]) || (round.doubleDrops && round.doubleDrops[userId]);
            if (!isDropped) {
              totalRoundsPlayed++;
            }
            if (isDropped) {
              totalDrops++;
            }
            if (round.winners && round.winners[userId]) {
              totalRoundsWon++;
            }
            totalPointsScored += round.scores[userId] || 0;
          }
        });
      }
    });
    
    const recentGames = sortedGames.slice(0, 10);
    const recentWins = recentGames.filter(g => {
      const isWinner = g.winner === userId || (g.winners && g.winners.includes(userId));
      return isWinner;
    }).length;
    
    const summary = {
      userId,
      totalGames,
      wins,
      winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
      finals,
      finalsRate: totalGames > 0 ? Math.round((finals / totalGames) * 100) : 0,
      totalRoundsPlayed,
      totalRoundsWon,
      totalRounds: totalRoundsPlayed + totalDrops,
      roundWinRate: totalRoundsPlayed > 0 ? Math.round((totalRoundsWon / totalRoundsPlayed) * 100) : 0,
      totalDrops,
      dropRate: (totalRoundsPlayed + totalDrops) > 0 ? Math.round((totalDrops / (totalRoundsPlayed + totalDrops)) * 100) : 0,
      avgPointsPerRound: totalRoundsPlayed > 0 ? Math.round(totalPointsScored / totalRoundsPlayed) : 0,
      recentForm: {
        last10Games: recentGames.length,
        wins: recentWins,
        winRate: recentGames.length > 0 ? Math.round((recentWins / recentGames.length) * 100) : 0
      }
    };
    
    // Sort games by total points for best/worst
    const gamesByPoints = [...sortedGames].sort((a, b) => {
      const aPlayer = a.players.find(p => p.id === userId);
      const bPlayer = b.players.find(p => p.id === userId);
      return (aPlayer?.totalPoints || 0) - (bPlayer?.totalPoints || 0);
    });
    
    const { insights, highlights, generatedBy } = await generateInsights(summary, gamesByPoints, gameType);
    
    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        profilePhoto: player.profilePhoto
      },
      gameType,
      insights,
      highlights,
      summary,
      generatedBy, // 'gemini' or 'rule-based'
      cachedAt: new Date().toISOString() // Timestamp for cache management
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error generating player insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

