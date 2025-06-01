import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import pg from "pg";

const region = process.env.AWS_REGION || "af-south-1";
const ssm = new SSMClient({ region });

async function getParam(name: string, withDecryption = true): Promise<string> {
  const command = new GetParameterCommand({ Name: name, WithDecryption: withDecryption });
  const response = await ssm.send(command);
  if (!response.Parameter || !response.Parameter.Value) {
    throw new Error(`Parameter ${name} not found`);
  }
  return response.Parameter.Value;
}

async function getDbPool(): Promise<pg.Pool> {
  const [host, database, user, password] = await Promise.all([
    getParam("/myapp/DB_HOST"),
    getParam("/myapp/DB_NAME"),
    getParam("/myapp/DB_USER"),
    getParam("/myapp/DB_PASSWORD")
  ]);

  return new pg.Pool({
    host,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false }
  });
}

export default getDbPool;
