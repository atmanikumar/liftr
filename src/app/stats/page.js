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

  // Fetch interesting stats for selected game type (lazy load)
  useEffect(() => {
    const fetchInterestingStats = async () => {
      if (!user) return;
      
      setStatsLoading(true);
      try {
        const response = await fetch(`/api/interesting-stats?gameType=${filterGameType}`);
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
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.roundWinChampion.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>👑</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Round Win Champion</div>
                    <div className={styles.badgeSubtitle}>Most Round Wins</div>
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
                    <div className={styles.badgeValue}>{interestingStats.stats.roundWinChampion.value} round wins</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.patientGuy && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.patientGuy.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🧘</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Patient Guy</div>
                    <div className={styles.badgeSubtitle}>Most Drops</div>
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
                    <div className={styles.badgeValue}>{interestingStats.stats.patientGuy.value} drops</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.strategist && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.strategist.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>♟️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Strategist</div>
                    <div className={styles.badgeSubtitle}>Most Finals Reached</div>
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
                    <div className={styles.badgeValue}>{interestingStats.stats.strategist.value} finals</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.finalHero && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.finalHero.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🎖️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Final Hero</div>
                    <div className={styles.badgeSubtitle}>Most Final Wins</div>
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
                    <div className={styles.badgeValue}>{interestingStats.stats.finalHero.value} final wins</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.warrior && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.warrior.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>⚔️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Warrior</div>
                    <div className={styles.badgeSubtitle}>Most Final Losses</div>
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
                    <div className={styles.badgeValue}>{interestingStats.stats.warrior.value} final losses</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.consecutiveWinner && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.consecutiveWinner.player.id}`)}
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
                  </div>
                </div>
              )}

              {interestingStats.stats.consecutiveRoundWinner && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => {
                    const gameId = interestingStats.stats.consecutiveRoundWinner.gameId;
                    if (gameId) {
                      router.push(`/game/${gameId}`);
                    } else {
                      router.push(`/profile?userId=${interestingStats.stats.consecutiveRoundWinner.player.id}`);
                    }
                  }}
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
                  </div>
                </div>
              )}

              {interestingStats.stats.eightyClub && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.eightyClub.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>💥</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>80 Club</div>
                    <div className={styles.badgeSubtitle}>Most 80s</div>
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
                    <div className={styles.badgeValue}>{interestingStats.stats.eightyClub.value} times</div>
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

