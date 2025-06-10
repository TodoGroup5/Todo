export function isProductionEnvironment(): boolean {
  console.log(process.env.ENV);
  return process.env.ENV === 'production';
}
