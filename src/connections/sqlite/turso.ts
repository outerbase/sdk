import { Client } from '@libsql/client';

import { AbstractDialect } from 'src/query-builder';
import { QueryResult } from '..';
import { Query } from '../../query';
import { PostgresDialect } from 'src/query-builder/dialects/postgres';
import { SqliteBaseConnection } from './base';

export class TursoConnection extends SqliteBaseConnection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();

    constructor(client: Client) {
        super();
        this.client = client;
    }

    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const result = await this.client.execute({
                sql: query.query,
                args: query.parameters ?? [],
            });

            return {
                data: result.rows.map((row) => {
                    return result.columns.reduce(
                        (acc, column) => {
                            acc[column] = row[column];
                            return acc;
                        },
                        {} as Record<string, unknown>
                    );
                }) as unknown as T[],
                error: null,
                query: query.query,
            };
        } catch {
            return {
                data: [],
                error: new Error('Failed to execute query'),
                query: query.query,
            };
        }
    }

    async connect() {}
    async disconnect() {}
}
