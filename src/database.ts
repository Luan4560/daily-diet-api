import {knex as setupKnex, Knex} from 'knex';
import { env } from './env';

if(!env.DATABASE_URL) {
  throw new Error('Database URL is not set');
}

export const config: Knex.Config = {
  client: env.DATABASE_CLIENT,
  connection: env.DATABASE_URL === 'sqlite' ? {filename: env.DATABASE_URL} : env.DATABASE_URL,

  useNullAsDefault: true,
  migrations: {
    extension: 'ts',
    directory: './db/migrations'
  }
}

export const knex = setupKnex(config);