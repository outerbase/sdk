import { Client, InValue } from '@libsql/client';

import { AbstractDialect } from './../../query-builder';
import { QueryResult } from '..';
import { Query } from '../../query';
import { PostgresDialect } from './../../query-builder/dialects/postgres';
import { SqliteBaseConnection } from './base';
import { transformArrayBasedResult } from './../../utils/transformer';

export class TursoConnection extends SqliteBaseConnection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();

    constructor(client: any) {
        super();
        this.client = client;
    }

    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const result = await this.client.execute({
                sql: query.query,
                args: (query.parameters ?? []) as InValue[],
            });

            return transformArrayBasedResult(
                result.columns,
                (header) => ({ name: header }),
                result.rows as unknown as unknown[][]
            ) as QueryResult<T>;
        } catch (e) {
            if (e instanceof Error) {
                return {
                    data: [],
                    error: { message: e.message, name: e.name },
                    query: query.query,
                    headers: [],
                };
            } else {
                return {
                    data: [],
                    error: { message: 'Unknown error', name: 'Unknown' },
                    query: query.query,
                    headers: [],
                };
            }
        }
    }

    async connect() {}
    async disconnect() {}
}
