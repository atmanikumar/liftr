'use client';

import { Box, Typography, Paper, Grid } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

export default function RecentWorkoutsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Recent Workouts
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Recent Workouts Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This section will show your recent workout sessions and activity history.
              Stay tuned!
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

