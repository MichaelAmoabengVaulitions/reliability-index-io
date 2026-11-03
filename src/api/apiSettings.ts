export const apiSettings = {
  baseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    'https://wydokyegph.execute-api.eu-central-1.amazonaws.com',
  transactionPageLimit: 500,
  requestTimeoutMs: 20_000,
  // Used when the discovery response has no usable list, so the picker is never empty.
  fallbackUserIds: ['user_1001'],
} as const;
