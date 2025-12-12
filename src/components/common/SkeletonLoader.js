import { Box, Skeleton, Stack, Card } from '@mui/material';

// Card skeleton for workout/training program cards
export function CardSkeleton({ count = 1 }) {
  return (
    <Stack spacing={2}>
      {[...Array(count)].map((_, index) => (
        <Card key={index} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
          <Stack spacing={1.5}>
            <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
            <Stack direction="row" spacing={1}>
              <Skeleton variant="rounded" width={80} height={32} sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
              <Skeleton variant="rounded" width={80} height={32} sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
            </Stack>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

// Workout card skeleton for home page
export function WorkoutCardSkeleton({ count = 3 }) {
  return (
    <Stack spacing={2}>
      {[...Array(count)].map((_, index) => (
        <Card key={index} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="50%" height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            </Box>
            <Skeleton variant="text" width="30%" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: 3, bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
              <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 3, bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
            </Box>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

// Table skeleton for users page
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2, p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {[...Array(columns)].map((_, index) => (
          <Skeleton key={index} variant="text" width={`${100 / columns}%`} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        ))}
      </Box>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// Chart skeleton for progress page
export function ChartSkeleton() {
  return (
    <Card sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Skeleton variant="text" width={80} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
          <Skeleton variant="text" width={80} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
          <Skeleton variant="text" width={80} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        </Box>
      </Stack>
    </Card>
  );
}

// Stats card skeleton for dashboard
export function StatsCardSkeleton({ count = 3 }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {[...Array(count)].map((_, index) => (
        <Card key={index} sx={{ 
          flex: '1 1 200px', 
          p: 2.5, 
          bgcolor: 'rgba(255,255,255,0.03)', 
          borderRadius: 2,
          minWidth: 200
        }}>
          <Stack spacing={1.5}>
            <Skeleton variant="text" width="60%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            <Skeleton variant="text" width="80%" height={36} sx={{ bgcolor: 'rgba(196, 255, 13, 0.15)' }} />
            <Skeleton variant="text" width="40%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
          </Stack>
        </Card>
      ))}
    </Box>
  );
}

// List item skeleton for workout history
export function ListItemSkeleton({ count = 5 }) {
  return (
    <Stack spacing={1.5}>
      {[...Array(count)].map((_, index) => (
        <Box key={index} sx={{ 
          p: 2, 
          bgcolor: 'rgba(255,255,255,0.02)', 
          borderRadius: 1.5,
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Skeleton variant="text" width="40%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.06)', mt: 0.5 }} />
            </Box>
            <Skeleton variant="rounded" width={60} height={28} sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// Full page skeleton loader
export function PageSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Page title */}
        <Skeleton variant="text" width="30%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        
        {/* Stats cards */}
        <StatsCardSkeleton count={3} />
        
        {/* Charts */}
        <ChartSkeleton />
        
        {/* Cards */}
        <CardSkeleton count={2} />
      </Stack>
    </Box>
  );
}

// Active workout skeleton
export function ActiveWorkoutSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Header */}
        <Skeleton variant="text" width="50%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        
        {/* Workout cards */}
        {[...Array(3)].map((_, index) => (
          <Card key={index} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="text" width="40%" height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              </Box>
              
              {/* Sets */}
              {[...Array(2)].map((_, setIndex) => (
                <Box key={setIndex} sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(255,255,255,0.02)', 
                  borderRadius: 1.5 
                }}>
                  <Stack spacing={1.5}>
                    <Skeleton variant="text" width="30%" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Skeleton variant="rounded" width="30%" height={32} sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
                      <Skeleton variant="rounded" width="30%" height={32} sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)' }} />
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Card>
        ))}
        
        {/* Button */}
        <Skeleton variant="rounded" width="100%" height={48} sx={{ borderRadius: 1.5, bgcolor: 'rgba(196, 255, 13, 0.15)' }} />
      </Stack>
    </Box>
  );
}
