'use client';

import { Box, Typography, Paper, Grid } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function ProgressPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Progress
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Progress Tracking Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This section will show your workout history, progress charts, and personal records.
              Stay tuned!
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

