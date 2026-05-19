import { createTheme } from '@mantine/core';

export const appTheme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Segoe UI, Aptos, sans-serif',
  headings: {
    fontFamily: 'Segoe UI, Aptos, sans-serif',
    fontWeight: '600',
  },
  fontSizes: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '20px',
  },
  colors: {
    blue: [
      '#eef6ff',
      '#d8e9ff',
      '#afceff',
      '#83b2ff',
      '#5e9bff',
      '#478cfb',
      '#367ff0',
      '#246ccc',
      '#185fa8',
      '#0d4d85',
    ],
  },
});
