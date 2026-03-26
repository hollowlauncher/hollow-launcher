import React from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';

interface LoadingScreenProps {
  title: string;
  message: string;
  progress?: number;
}

export default function LoadingScreen({ title, message, progress }: LoadingScreenProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 560,
          p: 4,
          borderRadius: 3,
          backgroundColor: 'background.paper',
          boxShadow: 3,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="overline" color="primary.main">
            Minecraft Launcher
          </Typography>
          <Typography variant="h4">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          <LinearProgress
            variant={typeof progress === 'number' ? 'determinate' : 'indeterminate'}
            value={progress}
            sx={{ height: 10, borderRadius: 999 }}
          />
        </Stack>
      </Box>
    </Box>
  );
}
