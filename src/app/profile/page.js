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
  const [achievements, setAchievements] = useState([]);
  
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

  // Fetch achievements (interesting stats)
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user && !viewUserId) return;
      
      const targetUserId = viewUserId || user?.id;
      const userAchievements = [];

      try {
        // Check all three game types
        for (const gameType of ['Rummy', 'Chess', 'Ace']) {
          const response = await fetch(`/api/interesting-stats?gameType=${gameType}`);
          if (response.ok) {
            const data = await response.json();
            
            // Check each stat category
            const allCategories = [
              { key: 'patientGuy', title: 'Patient Guy', subtitle: 'Most Drops', icon: '🧘' },
              { key: 'strategist', title: 'Strategist', subtitle: 'Most Finals Reached', icon: '♟️' },
              { key: 'finalHero', title: 'Final Hero', subtitle: 'Most Final Wins', icon: '🎖️' },
              { key: 'warrior', title: 'Warrior', subtitle: 'Most Final Losses', icon: '⚔️' },
              { key: 'consistent', title: 'Consistent', subtitle: 'Most Consecutive Finals', icon: '🎯' },
              { key: 'consecutiveWinner', title: 'On Fire!', subtitle: 'Most Consecutive Match Wins', icon: '🔥' },
              { key: 'consecutiveRoundWinner', title: 'Round Dominator', subtitle: 'Most Consecutive Round Wins', icon: '⚡' },
              { key: 'eightyClub', title: '80 Club', subtitle: 'Most 80s', icon: '💥' },
              { key: 'roundWinChampion', title: 'Round Win Champion', subtitle: 'Most Round Wins', icon: '👑' },
              { key: 'bravePlayer', title: 'Brave Player', subtitle: 'Most Played Rounds (Not Dropped)', icon: '🦁', rummyOnly: true },
              { key: 'earliestElimination', title: 'Early Exit', subtitle: 'Earliest Elimination', icon: '⏰', excludeRummy: true },
              { key: 'maxRoundsInSingleGame', title: 'Marathon Player', subtitle: 'Most Rounds in Single Game', icon: '🏃', rummyOnly: true },
            ];
            
            // Filter categories based on game type
            const categories = allCategories.filter(cat => {
              if (cat.rummyOnly && gameType !== 'Rummy') return false;
              if (cat.excludeRummy && gameType === 'Rummy') return false;
              return true;
            });

            categories.forEach(category => {
              const stat = data.stats[category.key];
              if (stat && stat.player && stat.player.id === targetUserId) {
                userAchievements.push({
                  gameType,
                  ...category,
                  value: stat.value,
                  gameId: stat.gameId || null // For match-wise stats like consecutiveRoundWinner
                });
              }
            });
          }
        }
        
        setAchievements(userAchievements);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      }
    };
    
    fetchAchievements();
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

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <div className={styles.achievementsSection}>
            <h2 className={styles.subtitle}>🏆 Achievements</h2>
            <div className={styles.achievementsGrid}>
              {achievements.map((achievement, index) => (
                <div 
                  key={index} 
                  className={`${styles.achievementBadge} ${achievement.gameId ? styles.clickableAchievement : ''}`}
                  onClick={() => {
                    if (achievement.gameId) {
                      router.push(`/game/${achievement.gameId}`);
                    }
                  }}
                  style={{ cursor: achievement.gameId ? 'pointer' : 'default' }}
                >
                  <div className={styles.achievementIcon}>{achievement.icon}</div>
                  <div className={styles.achievementContent}>
                    <div className={styles.achievementTitle}>{achievement.title}</div>
                    <div className={styles.achievementSubtitle}>{achievement.subtitle}</div>
                    <div className={styles.achievementGameType}>{achievement.gameType}</div>
                    <div className={styles.achievementValue}>
                      {achievement.value}
                      {achievement.gameId && <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>🔗</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

