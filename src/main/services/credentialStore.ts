import keytar from 'keytar';

const SERVICE_NAME = 'clockify-reports';
const LEGACY_SERVICE_NAME = 'clockify-exporter';
const ACCOUNT_NAME = 'clockify-api-key';

export interface CredentialStore {
  getApiKey(): Promise<string | null>;
  saveApiKey(apiKey: string): Promise<void>;
  clearApiKey(): Promise<void>;
}

export class KeytarCredentialStore implements CredentialStore {
  public async getApiKey(): Promise<string | null> {
    const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

    if (apiKey) {
      return apiKey;
    }

    return keytar.getPassword(LEGACY_SERVICE_NAME, ACCOUNT_NAME);
  }

  public async saveApiKey(apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
  }

  public async clearApiKey(): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    await keytar.deletePassword(LEGACY_SERVICE_NAME, ACCOUNT_NAME);
  }
}
