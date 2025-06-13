export function isProductionEnvironment(): boolean {
  return process.env.ENV === 'production';
}

export function baseUrl(): string {
 // const isProduction = false;
  return `${window.location.origin}/api`;
}