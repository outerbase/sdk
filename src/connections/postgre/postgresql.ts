import { Client } from 'pg';
import { QueryResult } from '..';
import { Query } from '../../query';
import { AbstractDialect } from 'src/query-builder';
import { PostgresDialect } from 'src/query-builder/dialects/postgres';
import { QueryType } from 'src/query-params';
import {
    createErrorResult,
    transformArrayBasedResult,
} from 'src/utils/transformer';
import { PostgreBaseConnection } from './base';

function replacePlaceholders(query: string): string {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
}

export class PostgreSQLConnection extends PostgreBaseConnection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();
    queryType: QueryType = QueryType.positional;

    constructor(pgClient: Client) {
        super();
        this.client = pgClient;
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.end();
    }

    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const { rows, fields } = await this.client.query({
                text:
                    query.parameters?.length === 0
                        ? query.query
                        : replacePlaceholders(query.query),
                rowMode: 'array',
                values: query.parameters as unknown[],
            });

            return transformArrayBasedResult(
                fields,
                (field) => ({
                    name: field.name,
                }),
                rows
            ) as QueryResult<T>;
        } catch (e) {
            if (e instanceof Error) {
                return createErrorResult(e.message) as QueryResult<T>;
            }
            return createErrorResult('Unknown error') as QueryResult<T>;
        }
    }
}
