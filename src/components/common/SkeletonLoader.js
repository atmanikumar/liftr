'use client';

import { Box, Skeleton, Card, CardContent, Grid, Stack } from '@mui/material';

// Card skeleton for workout plans
export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Stack>
              <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </>
  );
}

// List skeleton for recent workouts
export function ListSkeleton({ count = 3 }) {
  return (
    <Stack spacing={2}>
      {[...Array(count)].map((_, index) => (
        <Box key={index} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
      ))}
    </Stack>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <Stack spacing={1}>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2, p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={24} />
        ))}
      </Box>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, p: 2 }}>
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} height={20} />
          ))}
        </Box>
      ))}
    </Stack>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 300 }) {
  return (
    <Box sx={{ width: '100%', height, p: 2 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={height - 60} sx={{ borderRadius: 2 }} />
    </Box>
  );
}

// Achievement card skeleton
export function AchievementSkeleton({ count = 1 }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <Card key={index} sx={{ bgcolor: 'rgba(196, 255, 13, 0.05)' }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Skeleton variant="text" width={80} height={24} />
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={80} height={24} />
              <Skeleton variant="rounded" width={60} height={30} sx={{ ml: 'auto' }} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

