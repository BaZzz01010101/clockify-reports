import { beforeEach, describe, expect, it, vi } from 'vitest';

const keytarFns = vi.hoisted(() => ({
  getPassword: vi.fn(),
  setPassword: vi.fn(),
  deletePassword: vi.fn()
}));

vi.mock('keytar', () => ({
  default: {
    getPassword: keytarFns.getPassword,
    setPassword: keytarFns.setPassword,
    deletePassword: keytarFns.deletePassword
  }
}));

import { KeytarCredentialStore } from '@main/services/credentialStore';

describe('KeytarCredentialStore', () => {
  beforeEach(() => {
    keytarFns.getPassword.mockReset();
    keytarFns.setPassword.mockReset();
    keytarFns.deletePassword.mockReset();
  });

  it('falls back to the legacy service name when the renamed service has no stored key', async () => {
    keytarFns.getPassword
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('legacy-api-key');

    const store = new KeytarCredentialStore();

    await expect(store.getApiKey()).resolves.toBe('legacy-api-key');
    expect(keytarFns.getPassword).toHaveBeenNthCalledWith(1, 'clockify-reports', 'clockify-api-key');
    expect(keytarFns.getPassword).toHaveBeenNthCalledWith(2, 'clockify-exporter', 'clockify-api-key');
  });

  it('clears both the renamed and legacy service entries', async () => {
    const store = new KeytarCredentialStore();

    await store.clearApiKey();

    expect(keytarFns.deletePassword).toHaveBeenNthCalledWith(1, 'clockify-reports', 'clockify-api-key');
    expect(keytarFns.deletePassword).toHaveBeenNthCalledWith(2, 'clockify-exporter', 'clockify-api-key');
  });
});
