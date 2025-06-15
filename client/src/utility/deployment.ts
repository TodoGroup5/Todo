export function isProductionEnvironment(): boolean {
  return process.env.ENV === 'production';
}

export function baseUrl(): string {
 // const isProduction = true;
  return 'http://localhost:3000/api';
}