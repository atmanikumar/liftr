'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function StatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [filterGameType, setFilterGameType] = useState('Rummy');
  const [interestingStats, setInterestingStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Player comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [playerList, setPlayerList] = useState([]);
  const [leftPlayer, setLeftPlayer] = useState(null);
  const [rightPlayer, setRightPlayer] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Helper to get current user's stat value
  const getCurrentUserStat = (statKey) => {
    if (!interestingStats?.currentUserStats) return null;
    return interestingStats.currentUserStats[statKey];
  };

  // Helper to render current user stat
  const renderCurrentUserStat = (statKey, suffix = '') => {
    const stat = getCurrentUserStat(statKey);
    if (stat === null || stat === undefined) return null;
    
    // Handle percentage stats (objects with value and counts)
    if (typeof stat === 'object' && stat.value !== undefined) {
      if (stat.value === 0) return null;
      return (
        <div className={styles.currentUserStat}>
          <span className={styles.currentUserLabel}>Your Score:</span>
          <span className={styles.currentUserValue}>
            {Math.round(stat.value)}%
            {stat.matchWins !== undefined && ` (${stat.matchWins}/${stat.gamesPlayed})`}
            {stat.finals !== undefined && ` (${stat.finals}/${stat.gamesPlayed})`}
            {stat.finalLosses !== undefined && ` (${stat.finalLosses}/${stat.gamesPlayed})`}
            {stat.roundWins !== undefined && ` (${stat.roundWins}/${stat.totalRounds})`}
            {stat.totalDrops !== undefined && ` (${stat.totalDrops}/${stat.totalRounds})`}
            {stat.playedRounds !== undefined && ` (${stat.playedRounds}/${stat.totalRounds})`}
            {stat.scores80 !== undefined && ` (${stat.scores80}/${stat.gamesPlayed})`}
            {stat.mustPlayWins !== undefined && ` (${stat.mustPlayWins} wins / ${stat.mustPlayRounds} must-play)`}
          </span>
        </div>
      );
    }
    
    // Handle regular numeric stats
    if (stat === 0) return null;
    return (
      <div className={styles.currentUserStat}>
        <span className={styles.currentUserLabel}>Your Score:</span>
        <span className={styles.currentUserValue}>{stat}{suffix}</span>
      </div>
    );
  };

  // Fetch player list on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const users = await response.json();
          setPlayerList(users);
          // Set current user as left player by default
          if (user) {
            setLeftPlayer(user.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    };
    
    if (user) {
      fetchPlayers();
    }
  }, [user]);

  // Fetch interesting stats for selected game type (lazy load)
  useEffect(() => {
    const fetchInterestingStats = async () => {
      if (!user) return;
      
      setStatsLoading(true);
      try {
        const response = await fetch(`/api/interesting-stats?gameType=${filterGameType}&userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setInterestingStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch interesting stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchInterestingStats();
  }, [user, filterGameType]);

  // Fetch comparison data when players are selected
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!leftPlayer || !rightPlayer || leftPlayer === rightPlayer) {
        setComparisonData(null);
        return;
      }
      
      setComparisonLoading(true);
      try {
        // Use new comparison endpoint
        const response = await fetch(`/api/compare?player1=${leftPlayer}&player2=${rightPlayer}&gameType=${filterGameType}`);
        
        if (response.ok) {
          const data = await response.json();
          setComparisonData(data);
        }
      } catch (error) {
        console.error('Failed to fetch comparison data:', error);
      } finally {
        setComparisonLoading(false);
      }
    };

    if (showComparison) {
      fetchComparisonData();
    }
  }, [leftPlayer, rightPlayer, filterGameType, showComparison]);

  // Show loading state
  if (authLoading) {
    return (
      <div className={styles.statsPage}>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className={styles.statsPage}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>📊 Statistics</h1>
            <p className={styles.subtitle}>View detailed game statistics and achievements</p>
          </div>
          <button 
            className={styles.compareBtn}
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? '📊 Hide Comparison' : '⚔️ Compare Players'}
          </button>
        </div>

        {/* Player Comparison Section */}
        {showComparison && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className={styles.sectionTitle}>⚔️ Player Comparison</h2>
            
            <div className={styles.comparisonSelector}>
              <div className={styles.playerSelector}>
                <label>Player 1</label>
                <select 
                  value={leftPlayer || ''} 
                  onChange={(e) => setLeftPlayer(e.target.value)}
                  className={styles.playerDropdown}
                >
                  <option value="">Select Player</option>
                  {playerList.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.vsIcon}>VS</div>
              
              <div className={styles.playerSelector}>
                <label>Player 2</label>
                <select 
                  value={rightPlayer || ''} 
                  onChange={(e) => setRightPlayer(e.target.value)}
                  className={styles.playerDropdown}
                >
                  <option value="">Select Player</option>
                  {playerList.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comparisonLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
                  refresh
                </span>
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading comparison...</p>
              </div>
            ) : comparisonData && comparisonData.player1 && comparisonData.player2 ? (
              <div className={styles.comparisonGrid}>
                {/* Player Info Row */}
                <div className={styles.comparisonRow}>
                  <div className={styles.leftCell}>
                    <div className={styles.playerInfo}>
                      {comparisonData.player1.profilePhoto && (
                        <img src={comparisonData.player1.profilePhoto} alt={comparisonData.player1.name} className={styles.compareAvatar} />
                      )}
                      <h3>{comparisonData.player1.name}</h3>
                    </div>
                  </div>
                  <div className={styles.centerCell}><strong>vs</strong></div>
                  <div className={styles.rightCell}>
                    <div className={styles.playerInfo}>
                      {comparisonData.player2.profilePhoto && (
                        <img src={comparisonData.player2.profilePhoto} alt={comparisonData.player2.name} className={styles.compareAvatar} />
                      )}
                      <h3>{comparisonData.player2.name}</h3>
                    </div>
                  </div>
                </div>

                {/* Stats Rows */}
                <div className={styles.comparisonRow}>
                  <div className={`${styles.leftCell} ${comparisonData.player1.stats.totalGames > comparisonData.player2.stats.totalGames ? styles.winner : ''}`}>
                    {comparisonData.player1.stats.totalGames}
                  </div>
                  <div className={styles.centerCell}>Games Played</div>
                  <div className={`${styles.rightCell} ${comparisonData.player2.stats.totalGames > comparisonData.player1.stats.totalGames ? styles.winner : ''}`}>
                    {comparisonData.player2.stats.totalGames}
                  </div>
                </div>

                <div className={styles.comparisonRow}>
                  <div className={`${styles.leftCell} ${comparisonData.player1.stats.wins > comparisonData.player2.stats.wins ? styles.winner : ''}`}>
                    {comparisonData.player1.stats.wins}
                  </div>
                  <div className={styles.centerCell}>Total Wins</div>
                  <div className={`${styles.rightCell} ${comparisonData.player2.stats.wins > comparisonData.player1.stats.wins ? styles.winner : ''}`}>
                    {comparisonData.player2.stats.wins}
                  </div>
                </div>

                <div className={styles.comparisonRow}>
                  <div className={`${styles.leftCell} ${comparisonData.player1.stats.winPercentage > comparisonData.player2.stats.winPercentage ? styles.winner : ''}`}>
                    {Math.round(comparisonData.player1.stats.winPercentage)}%
                  </div>
                  <div className={styles.centerCell}>Win Rate</div>
                  <div className={`${styles.rightCell} ${comparisonData.player2.stats.winPercentage > comparisonData.player1.stats.winPercentage ? styles.winner : ''}`}>
                    {Math.round(comparisonData.player2.stats.winPercentage)}%
                  </div>
                </div>

                <div className={styles.comparisonRow}>
                  <div className={`${styles.leftCell} ${comparisonData.player1.stats.rating > comparisonData.player2.stats.rating ? styles.winner : ''}`}>
                    {comparisonData.player1.stats.rating}
                  </div>
                  <div className={styles.centerCell}>Rating (WPR)</div>
                  <div className={`${styles.rightCell} ${comparisonData.player2.stats.rating > comparisonData.player1.stats.rating ? styles.winner : ''}`}>
                    {comparisonData.player2.stats.rating}
                  </div>
                </div>

                <div className={styles.comparisonRow}>
                  <div className={`${styles.leftCell} ${comparisonData.player1.stats.maxConsecutiveWins > comparisonData.player2.stats.maxConsecutiveWins ? styles.winner : ''}`}>
                    {comparisonData.player1.stats.maxConsecutiveWins}
                  </div>
                  <div className={styles.centerCell}>Win Streak</div>
                  <div className={`${styles.rightCell} ${comparisonData.player2.stats.maxConsecutiveWins > comparisonData.player1.stats.maxConsecutiveWins ? styles.winner : ''}`}>
                    {comparisonData.player2.stats.maxConsecutiveWins}
                  </div>
                </div>

                {comparisonData.player1.stats.headToHeadGames > 0 && (
                  <>
                    <div className={styles.comparisonRow} style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.headToHeadWins > comparisonData.player2.stats.headToHeadWins ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.headToHeadWins}
                      </div>
                      <div className={styles.centerCell}><strong>Head-to-Head Wins</strong></div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.headToHeadWins > comparisonData.player1.stats.headToHeadWins ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.headToHeadWins}
                      </div>
                    </div>

                    <div className={styles.comparisonRow} style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.headToHeadWinPercentage > comparisonData.player2.stats.headToHeadWinPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player1.stats.headToHeadWinPercentage)}%
                      </div>
                      <div className={styles.centerCell}><strong>H2H Win Rate</strong> ({comparisonData.player1.stats.headToHeadGames} games)</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.headToHeadWinPercentage > comparisonData.player1.stats.headToHeadWinPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player2.stats.headToHeadWinPercentage)}%
                      </div>
                    </div>
                  </>
                )}

                {filterGameType === 'Rummy' && (
                  <>
                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.finals > comparisonData.player2.stats.finals ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.finals}
                      </div>
                      <div className={styles.centerCell}>Finals Reached</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.finals > comparisonData.player1.stats.finals ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.finals}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.finalsPercentage > comparisonData.player2.stats.finalsPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player1.stats.finalsPercentage)}%
                      </div>
                      <div className={styles.centerCell}>Finals Rate</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.finalsPercentage > comparisonData.player1.stats.finalsPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player2.stats.finalsPercentage)}%
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.maxConsecutiveFinals > comparisonData.player2.stats.maxConsecutiveFinals ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.maxConsecutiveFinals}
                      </div>
                      <div className={styles.centerCell}>Finals Streak</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.maxConsecutiveFinals > comparisonData.player1.stats.maxConsecutiveFinals ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.maxConsecutiveFinals}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.roundWins > comparisonData.player2.stats.roundWins ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.roundWins}
                      </div>
                      <div className={styles.centerCell}>Round Wins</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.roundWins > comparisonData.player1.stats.roundWins ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.roundWins}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.roundWinPercentage > comparisonData.player2.stats.roundWinPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player1.stats.roundWinPercentage)}%
                      </div>
                      <div className={styles.centerCell}>Round Win %</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.roundWinPercentage > comparisonData.player1.stats.roundWinPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player2.stats.roundWinPercentage)}%
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.avgPointsPerGame < comparisonData.player2.stats.avgPointsPerGame ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.avgPointsPerGame.toFixed(1)}
                      </div>
                      <div className={styles.centerCell}>Avg Points/Game</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.avgPointsPerGame < comparisonData.player1.stats.avgPointsPerGame ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.avgPointsPerGame.toFixed(1)}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.avgPointsPerRound < comparisonData.player2.stats.avgPointsPerRound ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.avgPointsPerRound.toFixed(1)}
                      </div>
                      <div className={styles.centerCell}>Avg Points/Round</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.avgPointsPerRound < comparisonData.player1.stats.avgPointsPerRound ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.avgPointsPerRound.toFixed(1)}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.dropPercentage < comparisonData.player2.stats.dropPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player1.stats.dropPercentage)}%
                      </div>
                      <div className={styles.centerCell}>Drop Rate</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.dropPercentage < comparisonData.player1.stats.dropPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player2.stats.dropPercentage)}%
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.clutchPercentage > comparisonData.player2.stats.clutchPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player1.stats.clutchPercentage)}%
                      </div>
                      <div className={styles.centerCell}>Clutch Win % ({comparisonData.player1.stats.mustPlayRounds + comparisonData.player2.stats.mustPlayRounds} pressure rounds)</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.clutchPercentage > comparisonData.player1.stats.clutchPercentage ? styles.winner : ''}`}>
                        {Math.round(comparisonData.player2.stats.clutchPercentage)}%
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.scores80 < comparisonData.player2.stats.scores80 ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.scores80}
                      </div>
                      <div className={styles.centerCell}>80s (Avoidable)</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.scores80 < comparisonData.player1.stats.scores80 ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.scores80}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.perfectGames > comparisonData.player2.stats.perfectGames ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.perfectGames}
                      </div>
                      <div className={styles.centerCell}>Perfect Wins (0 pts)</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.perfectGames > comparisonData.player1.stats.perfectGames ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.perfectGames}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.highestScore < comparisonData.player2.stats.highestScore ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.highestScore}
                      </div>
                      <div className={styles.centerCell}>Highest Single Round</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.highestScore < comparisonData.player1.stats.highestScore ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.highestScore}
                      </div>
                    </div>

                    <div className={styles.comparisonRow}>
                      <div className={`${styles.leftCell} ${comparisonData.player1.stats.lowestScore < comparisonData.player2.stats.lowestScore ? styles.winner : ''}`}>
                        {comparisonData.player1.stats.lowestScore}
                      </div>
                      <div className={styles.centerCell}>Lowest Single Round</div>
                      <div className={`${styles.rightCell} ${comparisonData.player2.stats.lowestScore < comparisonData.player1.stats.lowestScore ? styles.winner : ''}`}>
                        {comparisonData.player2.stats.lowestScore}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : leftPlayer && rightPlayer && leftPlayer !== rightPlayer ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                No data available for comparison
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                Select two different players to compare
              </div>
            )}
          </div>
        )}

        {/* Interesting Statistics Section */}
        <div className="card">
          <h2 className={styles.sectionTitle}>🏆 Interesting Statistics</h2>
          
          {/* Game Type Tabs */}
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tab} ${filterGameType === 'Rummy' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Rummy')}
            >
              Rummy
            </button>
            <button 
              className={`${styles.tab} ${filterGameType === 'Chess' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Chess')}
            >
              Chess
            </button>
            <button 
              className={`${styles.tab} ${filterGameType === 'Ace' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Ace')}
            >
              Ace
            </button>
          </div>

          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
                refresh
              </span>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading {filterGameType} stats...</p>
            </div>
          ) : interestingStats && interestingStats.stats && Object.keys(interestingStats.stats).length > 0 ? (
            <div className={styles.interestingStatsGrid}>
              {interestingStats.stats.roundWinChampion && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>👑</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Round Win Champion</div>
                    <div className={styles.badgeSubtitle}>Round Win %</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.roundWinChampion.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.roundWinChampion.player.profilePhoto} 
                          alt={interestingStats.stats.roundWinChampion.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.roundWinChampion.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.roundWinChampion.value)}% 
                      ({interestingStats.stats.roundWinChampion.roundWins}/{interestingStats.stats.roundWinChampion.totalRounds} rounds)
                    </div>
                    {renderCurrentUserStat('roundWinChampion')}
                  </div>
                </div>
              )}

              {interestingStats.stats.patientGuy && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>🧘</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Drop Specialist</div>
                    <div className={styles.badgeSubtitle}>Drop Percentage</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.patientGuy.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.patientGuy.player.profilePhoto} 
                          alt={interestingStats.stats.patientGuy.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.patientGuy.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.patientGuy.value)}% 
                      ({interestingStats.stats.patientGuy.totalDrops}/{interestingStats.stats.patientGuy.totalRounds} rounds)
                    </div>
                    {renderCurrentUserStat('patientGuy')}
                  </div>
                </div>
              )}

              {interestingStats.stats.strategist && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>♟️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Strategist</div>
                    <div className={styles.badgeSubtitle}>Final Reached %</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.strategist.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.strategist.player.profilePhoto} 
                          alt={interestingStats.stats.strategist.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.strategist.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.strategist.value)}% 
                      ({interestingStats.stats.strategist.finals}/{interestingStats.stats.strategist.gamesPlayed} games)
                    </div>
                    {renderCurrentUserStat('strategist')}
                  </div>
                </div>
              )}

              {interestingStats.stats.finalHero && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>🎖️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Final Hero</div>
                    <div className={styles.badgeSubtitle}>Win Percentage</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.finalHero.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.finalHero.player.profilePhoto} 
                          alt={interestingStats.stats.finalHero.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.finalHero.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.finalHero.value)}% 
                      ({interestingStats.stats.finalHero.matchWins}/{interestingStats.stats.finalHero.gamesPlayed} games)
                    </div>
                    {renderCurrentUserStat('finalHero')}
                  </div>
                </div>
              )}

              {interestingStats.stats.warrior && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>⚔️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Warrior</div>
                    <div className={styles.badgeSubtitle}>Final Loss Percentage</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.warrior.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.warrior.player.profilePhoto} 
                          alt={interestingStats.stats.warrior.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.warrior.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.warrior.value)}% 
                      ({interestingStats.stats.warrior.finalLosses}/{interestingStats.stats.warrior.gamesPlayed} games)
                    </div>
                    {renderCurrentUserStat('warrior')}
                  </div>
                </div>
              )}

              {interestingStats.stats.consistent && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/stats/details?stat=consistent&gameType=${filterGameType}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🎯</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Consistent</div>
                    <div className={styles.badgeSubtitle}>Most Consecutive Finals</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.consistent.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.consistent.player.profilePhoto} 
                          alt={interestingStats.stats.consistent.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.consistent.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.consistent.value} consecutive finals</div>
                    {renderCurrentUserStat('consistent', ' consecutive finals')}
                  </div>
                </div>
              )}

              {interestingStats.stats.consecutiveWinner && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/stats/details?stat=consecutiveWinner&gameType=${filterGameType}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🔥</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>On Fire!</div>
                    <div className={styles.badgeSubtitle}>Most Consecutive Match Wins</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.consecutiveWinner.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.consecutiveWinner.player.profilePhoto} 
                          alt={interestingStats.stats.consecutiveWinner.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.consecutiveWinner.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.consecutiveWinner.value} match streak</div>
                    {renderCurrentUserStat('consecutiveWinner', ' match streak')}
                  </div>
                </div>
              )}

              {interestingStats.stats.consecutiveRoundWinner && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/stats/details?stat=consecutiveRoundWinner&gameType=${filterGameType}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>⚡</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Round Dominator</div>
                    <div className={styles.badgeSubtitle}>Most Consecutive Round Wins</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.consecutiveRoundWinner.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.consecutiveRoundWinner.player.profilePhoto} 
                          alt={interestingStats.stats.consecutiveRoundWinner.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.consecutiveRoundWinner.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.consecutiveRoundWinner.value} round streak</div>
                    {renderCurrentUserStat('consecutiveRoundWinner', ' round streak')}
                  </div>
                </div>
              )}

              {interestingStats.stats.eightyClub && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>💥</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>80 Club</div>
                    <div className={styles.badgeSubtitle}>80s Percentage</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.eightyClub.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.eightyClub.player.profilePhoto} 
                          alt={interestingStats.stats.eightyClub.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.eightyClub.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.eightyClub.value)}% 
                      ({interestingStats.stats.eightyClub.scores80}/{interestingStats.stats.eightyClub.gamesPlayed} games)
                    </div>
                    {renderCurrentUserStat('eightyClub')}
                  </div>
                </div>
              )}

              {interestingStats.stats.bravePlayer && filterGameType === 'Rummy' && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>🦁</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Brave Player</div>
                    <div className={styles.badgeSubtitle}>Rounds Played Without Drop %</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.bravePlayer.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.bravePlayer.player.profilePhoto} 
                          alt={interestingStats.stats.bravePlayer.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.bravePlayer.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.bravePlayer.value)}% 
                      ({interestingStats.stats.bravePlayer.playedRounds}/{interestingStats.stats.bravePlayer.totalRounds} rounds)
                    </div>
                    {renderCurrentUserStat('bravePlayer')}
                  </div>
                </div>
              )}

              {interestingStats.stats.earliestElimination && filterGameType !== 'Rummy' && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/stats/details?stat=earliestElimination&gameType=${filterGameType}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>⏰</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Early Exit</div>
                    <div className={styles.badgeSubtitle}>Earliest Elimination</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.earliestElimination.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.earliestElimination.player.profilePhoto} 
                          alt={interestingStats.stats.earliestElimination.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.earliestElimination.player.name}
                    </div>
                    <div className={styles.badgeValue}>Round {interestingStats.stats.earliestElimination.value}</div>
                    {getCurrentUserStat('earliestElimination') !== null && (
                      <div className={styles.currentUserStat}>
                        <span className={styles.currentUserLabel}>Your Score:</span>
                        <span className={styles.currentUserValue}>Round {getCurrentUserStat('earliestElimination')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {interestingStats.stats.maxRoundsInSingleGame && filterGameType === 'Rummy' && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => {
                    const gameId = interestingStats.stats.maxRoundsInSingleGame.gameId;
                    if (gameId) {
                      router.push(`/game/${gameId}`);
                    } else {
                      router.push(`/profile?userId=${interestingStats.stats.maxRoundsInSingleGame.player.id}`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🏃</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Marathon Player</div>
                    <div className={styles.badgeSubtitle}>Most Rounds in Single Game (Excluding Drops)</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.maxRoundsInSingleGame.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.maxRoundsInSingleGame.player.profilePhoto} 
                          alt={interestingStats.stats.maxRoundsInSingleGame.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.maxRoundsInSingleGame.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.maxRoundsInSingleGame.value} rounds</div>
                    {renderCurrentUserStat('maxRoundsInSingleGame', ' rounds')}
                  </div>
                </div>
              )}

              {interestingStats.stats.clutchPlayer && filterGameType === 'Rummy' && (
                <div className={styles.statBadge}>
                  <div className={styles.badgeIcon}>💪</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Clutch Player</div>
                    <div className={styles.badgeSubtitle}>Must-Play Round Win %</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.clutchPlayer.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.clutchPlayer.player.profilePhoto} 
                          alt={interestingStats.stats.clutchPlayer.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.clutchPlayer.player.name}
                    </div>
                    <div className={styles.badgeValue}>
                      {Math.round(interestingStats.stats.clutchPlayer.value)}% 
                      ({interestingStats.stats.clutchPlayer.mustPlayWins} wins / {interestingStats.stats.clutchPlayer.mustPlayRounds} must-play)
                    </div>
                    {renderCurrentUserStat('clutchPlayer')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>No {filterGameType} stats available yet!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

