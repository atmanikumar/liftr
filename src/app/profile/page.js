'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import styles from './page.module.css';

function ProfileContent() {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewUserId = searchParams.get('userId'); // View another player's profile
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedGameType, setSelectedGameType] = useState('Rummy');
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [ratingHistory, setRatingHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [allStats, setAllStats] = useState({}); // Store all stats for all game types
  const [allStatsLoading, setAllStatsLoading] = useState(true);
  
  // Image crop states
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    aspect: 1, // Square crop
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper function to get cookie
  const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Helper function to set cookie
  const setCookie = (name, value, hours = 24) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
  };

  // Fetch player insights with 24-hour cache
  useEffect(() => {
    const fetchInsights = async () => {
      if (!user && !viewUserId) return;
      
      const targetUserId = viewUserId || user?.id;
      const cacheKey = `insights_${targetUserId}_${selectedGameType}`;
      
      // Check cookie cache
      const cachedData = getCookie(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cachedData));
          const cachedTime = new Date(parsed.cachedAt).getTime();
          const now = new Date().getTime();
          const hoursSinceCached = (now - cachedTime) / (1000 * 60 * 60);
          
          // If cache is less than 24 hours old, use it
          if (hoursSinceCached < 24) {
            console.log(`[Insights Cache] Using cached data (${Math.round(hoursSinceCached)}h old)`);
            setInsights(parsed.data);
            setInsightsLoading(false);
            return;
          } else {
            console.log('[Insights Cache] Cache expired, fetching fresh data');
          }
        } catch (e) {
          console.log('[Insights Cache] Invalid cache, fetching fresh data');
        }
      }
      
      // No valid cache, fetch from API
      setInsightsLoading(true);
      try {
        console.log('[Insights API] Fetching fresh insights from Gemini AI...');
        const response = await fetch(`/api/player-insights/${targetUserId}?gameType=${selectedGameType}`);
        if (response.ok) {
          const data = await response.json();
          setInsights(data);
          
          // Cache the result for 24 hours
          const cacheData = {
            data: data,
            cachedAt: new Date().toISOString()
          };
          setCookie(cacheKey, encodeURIComponent(JSON.stringify(cacheData)), 24);
          console.log('[Insights Cache] Stored fresh data in cache (24h expiry)');
        }
      } catch (error) {
        console.error('[Insights API] Error:', error);
      } finally {
        setInsightsLoading(false);
      }
    };
    
    fetchInsights();
  }, [user, viewUserId, selectedGameType]);

  // Fetch rating history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user && !viewUserId) return;
      
      setHistoryLoading(true);
      try {
        const targetUserId = viewUserId || user?.id;
        const response = await fetch(`/api/rating-history/${targetUserId}?gameType=${selectedGameType}`);
        if (response.ok) {
          const data = await response.json();
          setRatingHistory(data);
        }
      } catch (error) {
        // Silent fail
      } finally {
        setHistoryLoading(false);
      }
    };
    
    fetchHistory();
  }, [user, viewUserId, selectedGameType]);

  // Fetch all stats for all game types
  useEffect(() => {
    const fetchAllStats = async () => {
      if (!user && !viewUserId) return;
      
      setAllStatsLoading(true);
      const targetUserId = viewUserId || user?.id;
      const statsData = {};

      try {
        // Fetch stats for all three game types
        for (const gameType of ['Rummy', 'Chess', 'Ace']) {
          const response = await fetch(`/api/interesting-stats?gameType=${gameType}&userId=${targetUserId}`);
          if (response.ok) {
            const data = await response.json();
            statsData[gameType] = data;
          }
        }
        
        setAllStats(statsData);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setAllStatsLoading(false);
      }
    };
    
    fetchAllStats();
  }, [user, viewUserId]);

  // Fetch players to get avatar
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setPlayers(data);
        }
      } catch (error) {
        // Silent fail
      }
    };
    fetchPlayers();
  }, []);

  // Convert crop to blob
  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  }, [completedCrop]);

  // Early returns after all hooks are defined
  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setError('');
    setSuccess('');

    // Create preview URL
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setSelectedImage(reader.result);
    });
    reader.readAsDataURL(file);
  };

  // Upload cropped image
  const handleUpload = async () => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      // Get cropped image blob
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob) {
        setError('Please select and crop an image');
        setUploading(false);
        return;
      }

      // Check blob size
      if (croppedBlob.size > 10 * 1024 * 1024) {
        setError('Cropped image is too large. Please crop a smaller area.');
        setUploading(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append('photo', croppedBlob, 'profile-photo.jpg');

      // Upload to API
      const response = await fetch('/api/profile/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess('Profile photo updated successfully!');
      setSelectedImage(null);
      setCompletedCrop(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh user data
      await checkAuth();

    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setCompletedCrop(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isOwnProfile = !viewUserId || (user && viewUserId === user.id);
  const displayUser = insights?.player || user;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {isOwnProfile ? 'Profile' : `${displayUser?.name}'s Profile`}
        </h1>

        <div className={styles.profileInfo}>
          <div className={styles.photoSection}>
            <div className={styles.currentPhoto}>
              {displayUser?.profilePhoto ? (
                <img src={displayUser.profilePhoto} alt="Profile" className={styles.profileImage} />
              ) : (
                <div className={styles.placeholderPhoto}>
                  {players.find(p => p.id === displayUser?.id)?.avatar || '👤'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Type Tabs */}
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tab} ${selectedGameType === 'Rummy' ? styles.tabActive : ''}`}
            onClick={() => setSelectedGameType('Rummy')}
          >
            🃏 Rummy
          </button>
          <button 
            className={`${styles.tab} ${selectedGameType === 'Chess' ? styles.tabActive : ''}`}
            onClick={() => setSelectedGameType('Chess')}
          >
            ♟️ Chess
          </button>
          <button 
            className={`${styles.tab} ${selectedGameType === 'Ace' ? styles.tabActive : ''}`}
            onClick={() => setSelectedGameType('Ace')}
          >
            🎯 Ace
          </button>
        </div>

        {/* Gameplay Summary */}
        {insightsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Analyzing gameplay patterns...</p>
          </div>
        ) : insights && (
          <div className={styles.insightsSection}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '2px solid var(--border)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                📊 Gameplay Summary - {selectedGameType}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {insights.generatedBy === 'gemini' && (
                  <span style={{
                    padding: '0.35rem 0.85rem',
                    background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 4px rgba(66, 133, 244, 0.3)'
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>✨</span>
                    GEMINI AI
                  </span>
                )}
                {insights.cachedAt && (() => {
                  const cachedTime = new Date(insights.cachedAt);
                  const now = new Date();
                  const hoursSince = Math.round((now - cachedTime) / (1000 * 60 * 60));
                  return (
                    <span style={{
                      padding: '0.35rem 0.75rem',
                      background: 'rgba(156, 163, 175, 0.1)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <span style={{ fontSize: '0.8rem' }}>💾</span>
                      Cached {hoursSince}h ago
                    </span>
                  );
                })()}
              </div>
            </div>
            
            {/* Comprehensive narrative paragraph */}
            {insights.insights && insights.insights.length > 0 && (
              <div style={{
                padding: '1rem',
                background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.03), transparent)',
                borderRadius: '12px',
                fontSize: '1.05rem',
                lineHeight: '1.9',
                color: 'var(--text)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                textAlign: 'justify',
                letterSpacing: '0.01em'
              }}>
                {insights.insights[0]}
              </div>
            )}
          </div>
        )}

        {/* Rating/Win Rate History Chart */}
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading history...</p>
          </div>
        ) : ratingHistory && ratingHistory.history.length > 0 && (
          <div className={styles.historySection}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              📈 {selectedGameType === 'Rummy' ? 'Rating History' : 'Win Rate History'} - {selectedGameType}
            </h3>
            <div className={styles.chartContainer}>
              <svg viewBox="0 0 800 420" className={styles.chart}>
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
                  </linearGradient>
                </defs>
                
                {/* Area under the line */}
                {ratingHistory.history.length > 0 && (
                  <path
                    d={`M 70,350 ${ratingHistory.history.map((point, index) => {
                      const x = 70 + (point.gameNumber / ratingHistory.totalGames) * 700;
                      const value = selectedGameType === 'Rummy' ? point.rating : point.winRate;
                      const y = 350 - (value / 100) * 300;
                      return `L ${x},${y}`;
                    }).join(' ')} L ${70 + (ratingHistory.history[ratingHistory.history.length - 1].gameNumber / ratingHistory.totalGames) * 700},350 Z`}
                    fill="url(#areaGradient)"
                  />
                )}
                
                {/* Smooth curve path */}
                {ratingHistory.history.length > 1 && (
                  <path
                    d={(() => {
                      const points = ratingHistory.history.map((point) => {
                        const value = selectedGameType === 'Rummy' ? point.rating : point.winRate;
                        return {
                          x: 70 + (point.gameNumber / ratingHistory.totalGames) * 700,
                          y: 350 - (value / 100) * 300
                        };
                      });
                      
                      // Create smooth curve using quadratic bezier
                      let pathData = `M ${points[0].x},${points[0].y}`;
                      
                      for (let i = 1; i < points.length; i++) {
                        const prev = points[i - 1];
                        const curr = points[i];
                        const midX = (prev.x + curr.x) / 2;
                        const midY = (prev.y + curr.y) / 2;
                        
                        if (i === 1) {
                          pathData += ` Q ${prev.x},${prev.y} ${midX},${midY}`;
                        } else {
                          pathData += ` T ${midX},${midY}`;
                        }
                      }
                      
                      // Add final point
                      const last = points[points.length - 1];
                      pathData += ` T ${last.x},${last.y}`;
                      
                      return pathData;
                    })()}
                    stroke="url(#lineGradient)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                
                {/* Data labels for last 10 games only */}
                {ratingHistory.history.map((point, index) => {
                  const x = 70 + (point.gameNumber / ratingHistory.totalGames) * 700;
                  const value = selectedGameType === 'Rummy' ? point.rating : point.winRate;
                  const y = 350 - (value / 100) * 300;
                  
                  // Show labels for last 10 games only
                  const isRecent = index >= ratingHistory.history.length - 10;
                  
                  return isRecent ? (
                    <g key={index}>
                      {/* Rating/Win Rate label above line */}
                      <text
                        x={x}
                        y={y - 15}
                        fontSize="15"
                        fontWeight="600"
                        fill="#3b82f6"
                        textAnchor="middle"
                      >
                        {value}
                      </text>
                      {/* Game number label below */}
                      <text
                        x={x}
                        y={370}
                        fontSize="13"
                        fill="#6b7280"
                        textAnchor="middle"
                      >
                        #{point.gameNumber}
                      </text>
                    </g>
                  ) : null;
                })}
                
                {/* Y-axis vertical line */}
                <line
                  x1="70"
                  y1="50"
                  x2="70"
                  y2="350"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                
                {/* Y-axis labels - Larger */}
                {[0, 20, 40, 60, 80, 100].map((value, i) => (
                  <text
                    key={i}
                    x="60"
                    y={350 - (value / 100) * 300 + 5}
                    fontSize="15"
                    fontWeight="500"
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {value}
                  </text>
                ))}
                
                {/* Y-axis title */}
                <text x="25" y="200" fontSize="15" fontWeight="600" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 25, 200)">
                  {selectedGameType === 'Rummy' ? 'Rating' : 'Win Rate (%)'}
                </text>
                
                {/* X-axis label */}
                <text x="420" y="405" fontSize="16" fontWeight="600" fill="#6b7280" textAnchor="middle">
                  Game Timeline (Recent 10 games labeled)
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* All Stats Section - Show rankings across all game types */}
        {allStatsLoading ? (
          <div className={styles.allStatsSection}>
            <h2 className={styles.subtitle}>📈 All Statistics</h2>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
                refresh
              </span>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading statistics...</p>
            </div>
          </div>
        ) : Object.keys(allStats).length > 0 && (
          <div className={styles.allStatsSection}>
            <h2 className={styles.subtitle}>📈 All Statistics</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
              Your performance across all stat categories. 🏆 = You&apos;re the champion!
            </p>
            
            {['Rummy', 'Chess', 'Ace'].map(gameType => {
              if (!allStats[gameType] || !allStats[gameType].stats) return null;
              
              const data = allStats[gameType];
              const allCategories = [
                { key: 'roundWinChampion', title: 'Round Win Champion', subtitle: 'Round Win %', icon: '👑', isPercentage: true },
                { key: 'patientGuy', title: 'Drop Specialist', subtitle: 'Drop Percentage', icon: '🧘', isPercentage: true },
                { key: 'strategist', title: 'Strategist', subtitle: 'Final Reached %', icon: '♟️', isPercentage: true },
                { key: 'finalHero', title: 'Final Hero', subtitle: 'Win Percentage', icon: '🎖️', isPercentage: true },
                { key: 'warrior', title: 'Warrior', subtitle: 'Final Loss Percentage', icon: '⚔️', isPercentage: true },
                { key: 'consistent', title: 'Consistent', subtitle: 'Most Consecutive Finals', icon: '🎯', suffix: ' consecutive finals' },
                { key: 'consecutiveWinner', title: 'On Fire!', subtitle: 'Most Consecutive Match Wins', icon: '🔥', suffix: ' match streak' },
                { key: 'consecutiveRoundWinner', title: 'Round Dominator', subtitle: 'Most Consecutive Round Wins', icon: '⚡', suffix: ' round streak' },
                { key: 'eightyClub', title: '80 Club', subtitle: '80s Percentage', icon: '💥', isPercentage: true },
                { key: 'bravePlayer', title: 'Brave Player', subtitle: 'Rounds Played Without Drop %', icon: '🦁', rummyOnly: true, isPercentage: true },
                { key: 'earliestElimination', title: 'Early Exit', subtitle: 'Earliest Elimination', icon: '⏰', excludeRummy: true, prefix: 'Round ' },
                { key: 'maxRoundsInSingleGame', title: 'Marathon Player', subtitle: 'Most Rounds in Single Game (Excluding Drops)', icon: '🏃', rummyOnly: true, suffix: ' rounds', hasGameLink: true },
              ];
              
              const categories = allCategories.filter(cat => {
                if (cat.rummyOnly && gameType !== 'Rummy') return false;
                if (cat.excludeRummy && gameType === 'Rummy') return false;
                return data.stats[cat.key] && data.stats[cat.key].value > 0;
              });
              
              if (categories.length === 0) return null;
              
              return (
                <div key={gameType} className={styles.gameStatsSection}>
                  <h3 className={styles.gameTypeTitle}>{gameType}</h3>
                  <div className={styles.allStatsGrid}>
                    {categories.map(category => {
                      const topStat = data.stats[category.key];
                      const userValue = data.currentUserStats ? data.currentUserStats[category.key] : null;
                      const isWinner = topStat && topStat.player && topStat.player.id === (viewUserId || user?.id);
                      
                      const hasGameLink = category.hasGameLink && topStat.gameId;
                      
                      return (
                        <div 
                          key={category.key} 
                          className={`${styles.statRankCard} ${isWinner ? styles.statRankCardWinner : ''} ${hasGameLink ? styles.clickableStatCard : ''}`}
                          onClick={() => hasGameLink && router.push(`/game/${topStat.gameId}`)}
                          style={{ cursor: hasGameLink ? 'pointer' : 'default' }}
                        >
                          <div className={styles.statRankIcon}>{category.icon}</div>
                          <div className={styles.statRankContent}>
                            <div className={styles.statRankTitle}>
                              {category.title}
                              {isWinner && <span className={styles.winnerBadge}>🏆</span>}
                              {hasGameLink && <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>🔗</span>}
                            </div>
                            <div className={styles.statRankSubtitle}>{category.subtitle}</div>
                            <div className={styles.statRankValues}>
                              <div className={styles.statRankTop}>
                                <span className={styles.statRankLabel}>Top:</span>
                                <span className={styles.statRankValue}>
                                  {category.isPercentage ? (
                                    <>
                                      {Math.round(topStat.value)}%
                                      {topStat.matchWins !== undefined && ` (${topStat.matchWins}/${topStat.gamesPlayed})`}
                                      {topStat.finals !== undefined && ` (${topStat.finals}/${topStat.gamesPlayed})`}
                                      {topStat.finalLosses !== undefined && ` (${topStat.finalLosses}/${topStat.gamesPlayed})`}
                                      {topStat.roundWins !== undefined && ` (${topStat.roundWins}/${topStat.totalRounds})`}
                                      {topStat.totalDrops !== undefined && ` (${topStat.totalDrops}/${topStat.totalRounds})`}
                                      {topStat.playedRounds !== undefined && ` (${topStat.playedRounds}/${topStat.totalRounds})`}
                                      {topStat.scores80 !== undefined && ` (${topStat.scores80}/${topStat.gamesPlayed})`}
                                    </>
                                  ) : (
                                    `${category.prefix || ''}${topStat.value}${category.suffix || ''}`
                                  )}
                                </span>
                              </div>
                              {userValue !== null && userValue !== undefined && (
                                category.isPercentage ? (
                                  typeof userValue === 'object' && userValue.value > 0 && (
                                    <div className={styles.statRankYours}>
                                      <span className={styles.statRankLabel}>Yours:</span>
                                      <span className={styles.statRankValue}>
                                        {Math.round(userValue.value)}%
                                        {userValue.matchWins !== undefined && ` (${userValue.matchWins}/${userValue.gamesPlayed})`}
                                        {userValue.finals !== undefined && ` (${userValue.finals}/${userValue.gamesPlayed})`}
                                        {userValue.finalLosses !== undefined && ` (${userValue.finalLosses}/${userValue.gamesPlayed})`}
                                        {userValue.roundWins !== undefined && ` (${userValue.roundWins}/${userValue.totalRounds})`}
                                        {userValue.totalDrops !== undefined && ` (${userValue.totalDrops}/${userValue.totalRounds})`}
                                        {userValue.playedRounds !== undefined && ` (${userValue.playedRounds}/${userValue.totalRounds})`}
                                        {userValue.scores80 !== undefined && ` (${userValue.scores80}/${userValue.gamesPlayed})`}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  userValue > 0 && (
                                    <div className={styles.statRankYours}>
                                      <span className={styles.statRankLabel}>Yours:</span>
                                      <span className={styles.statRankValue}>
                                        {category.prefix || ''}{userValue}{category.suffix || ''}
                                      </span>
                                    </div>
                                  )
                                )
                              )}
                            </div>
                          </div>
                    </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* Only show photo upload section for own profile */}
        {isOwnProfile && (
          <div className={styles.uploadSection}>
            <h2 className={styles.subtitle}>Update Profile Photo</h2>
            <p className={styles.description}>
              Maximum file size: 10MB. Allowed formats: JPG, PNG, WebP
            </p>

            {!selectedImage ? (
              <div className={styles.fileInputWrapper}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className={styles.fileLabel}>
                  Choose Photo
                </label>
              </div>
            ) : (
              <div className={styles.cropSection}>
                <div className={styles.cropContainer}>
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={selectedImage}
                      alt="Crop preview"
                      className={styles.cropImage}
                    />
                  </ReactCrop>
                </div>

                <div className={styles.cropActions}>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !completedCrop}
                    className={styles.uploadButton}
                  >
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={uploading}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading profile...</p>
          </div>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

