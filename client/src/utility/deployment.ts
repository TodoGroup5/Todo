export function isProductionEnvironment(): boolean {
  return process.env.ENV === 'production';
}

export function baseUrl(): string {
  const isProduction = false;
  return isProduction ? `${window.location.origin}/api` : 'http://localhost:3000/api';
}