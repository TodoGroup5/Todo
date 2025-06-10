export function isProductionEnvironment(): boolean {
  return process.env.ENV === 'production';
}
