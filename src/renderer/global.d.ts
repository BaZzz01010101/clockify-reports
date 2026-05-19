import type { ClockifyDesktopApi } from '@shared/ipc';

declare global {
  interface Window {
    clockifyExporter: ClockifyDesktopApi;
  }
}

export {};
