import { Client, types } from 'pg';
import { QueryResult } from '..';
import { Query } from '../../query';
import { AbstractDialect } from './../../query-builder';
import { PostgresDialect } from './../../query-builder/dialects/postgres';
import {
    createErrorResult,
    transformArrayBasedResult,
} from './../../utils/transformer';
import { PostgreBaseConnection } from './base';

export class PostgreSQLConnection extends PostgreBaseConnection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();
    protected numberedPlaceholder = true;

    constructor(pgClient: any) {
        super();
        this.client = pgClient;

        this.client.setTypeParser(types.builtins.TIMESTAMP, str => str)
        this.client.setTypeParser(types.builtins.DATE, str => str)
        this.client.setTypeParser(types.builtins.TIMESTAMPTZ, str => str)
        this.client.setTypeParser(types.builtins.TIME, str => str)
        this.client.setTypeParser(types.builtins.TIMETZ, str => str)
        this.client.setTypeParser(types.builtins.JSON, str => str);
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.end();
    }

    async internalQuery<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const { rows, fields } = await this.client.query({
                text: query.query,
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
