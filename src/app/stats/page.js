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
        </div>

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

              {interestingStats.stats.minRoundsToWin && filterGameType === 'Rummy' && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => {
                    const gameId = interestingStats.stats.minRoundsToWin.gameId;
                    if (gameId) {
                      router.push(`/game/${gameId}`);
                    } else {
                      router.push(`/profile?userId=${interestingStats.stats.minRoundsToWin.player.id}`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>⚡</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Speed Winner</div>
                    <div className={styles.badgeSubtitle}>Least Rounds to Win</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.minRoundsToWin.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.minRoundsToWin.player.profilePhoto} 
                          alt={interestingStats.stats.minRoundsToWin.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.minRoundsToWin.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.minRoundsToWin.value} rounds</div>
                    {renderCurrentUserStat('minRoundsToWin', ' rounds')}
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

