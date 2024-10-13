import { Client as PgClient } from 'pg';
import { BigQuery } from '@google-cloud/bigquery';
import { createClient as createTursoConnection } from '@libsql/client';
import { createConnection as createMySqlConnection } from 'mysql2';
import {
    Connection,
    PostgreSQLConnection,
    MySQLConnection,
    BigQueryConnection,
    TursoConnection,
} from '../../src';

export default function createTestClient(): {
    client: Connection;
    defaultSchema: string;
} {
    if (process.env.CONNECTION_TYPE === 'postgres') {
        const client = new PostgreSQLConnection(
            new PgClient({
                host: process.env.POSTGRES_HOST,
                port: Number(process.env.POSTGRES_PORT),
                user: process.env.POSTGRES_USER,
                password: process.env.POSTGRES_PASSWORD,
                database: process.env.POSTGRES_DB,
            })
        );

        return {
            client,
            defaultSchema: process.env.POSTGRES_DEFAULT_SCHEMA || 'public',
        };
    } else if (process.env.CONNECTION_TYPE === 'mysql') {
        const client = new MySQLConnection(
            createMySqlConnection({
                host: process.env.MYSQL_HOST,
                port: Number(process.env.MYSQL_PORT),
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                database: process.env.MYSQL_DB,
            })
        );
        return {
            client,
            defaultSchema: process.env.MYSQL_DEFAULT_SCHEMA || 'public',
        };
    } else if (process.env.CONNECTION_TYPE === 'bigquery') {
        const client = new BigQueryConnection(
            new BigQuery({
                projectId: process.env.BIGQUERY_PROJECT_ID,
                credentials: {
                    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
                    private_key: process.env.BIGQUERY_PRIVATE_KEY,
                },
            })
        );

        return {
            client,
            defaultSchema: process.env.BIGQUERY_DEFAULT_SCHEMA || 'public',
        };
    } else if (process.env.CONNECTION_TYPE === 'turso') {
        const client = new TursoConnection(
            createTursoConnection({ url: ':memory:' })
        );
        return { client, defaultSchema: 'main' };
    }

    throw new Error('Invalid connection type');
}
