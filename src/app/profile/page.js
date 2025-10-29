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
  const [playerStats, setPlayerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
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

  // Fetch player stats
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!user && !viewUserId) return;
      
      setStatsLoading(true);
      try {
        const targetUserId = viewUserId || user?.id;
        const response = await fetch(`/api/player-stats/${targetUserId}`);
        if (response.ok) {
          const data = await response.json();
          setPlayerStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch player stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchPlayerStats();
  }, [user, viewUserId]);

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
  const displayUser = playerStats?.player || user;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {isOwnProfile ? 'Profile Settings' : `${displayUser?.name}'s Profile`}
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

        {/* Player Stats Section */}
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading stats...</p>
          </div>
        ) : playerStats && (
          <div className={styles.statsSection}>
            <h2 className={styles.subtitle}>Game Statistics</h2>
            
            {['Rummy', 'Chess', 'Ace'].map(gameType => {
              const stats = playerStats.stats[gameType];
              if (!stats || stats.totalGames === 0) return null;
              
              return (
                <div key={gameType} className={styles.gameStats}>
                  <h3 className={styles.gameTitle}>{gameType}</h3>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{stats.rank || 'N/A'}</div>
                      <div className={styles.statLabel}>Rank (of {stats.totalPlayers})</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{stats.winPercentage}%</div>
                      <div className={styles.statLabel}>Win Rate</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{stats.totalGames}</div>
                      <div className={styles.statLabel}>Total Games</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{stats.wins}</div>
                      <div className={styles.statLabel}>Wins</div>
                    </div>
                    {gameType === 'Chess' && (
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>{stats.draws}</div>
                        <div className={styles.statLabel}>Draws</div>
                      </div>
                    )}
                    {gameType === 'Rummy' && (
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>{stats.finals}</div>
                        <div className={styles.statLabel}>Finals</div>
                      </div>
                    )}
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{stats.losses}</div>
                      <div className={styles.statLabel}>Losses</div>
                    </div>
                  </div>
                </div>
              );
            })}
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

