import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from './logger';

export async function loadSecrets(): Promise<void> {
  if (process.env.USE_SECRETS_MANAGER !== 'true') {
    return;
  }

  try {
    const config: { region?: string; endpoint?: string } = {
      region: process.env.AWS_REGION || 'ap-southeast-1',
    };

    if (process.env.AWS_ENDPOINT_URL) {
      config.endpoint = process.env.AWS_ENDPOINT_URL;
    }

    const client = new SecretsManagerClient(config);
    const secretId = process.env.APP_SECRETS_ID || 'quillo/app-secrets';

    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`SecretString is empty for secret ${secretId}`);
    }

    const secrets = JSON.parse(response.SecretString);
    const keys = Object.keys(secrets);

    for (const key of keys) {
      process.env[key] = secrets[key];
    }

    logger.info(`Secrets loaded từ Secrets Manager (${keys.length} keys)`);
  } catch (err) {
    logger.error('Failed to load secrets from Secrets Manager:', err);
    throw err;
  }
}
