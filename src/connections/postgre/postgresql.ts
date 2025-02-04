import { Client } from 'pg';
import { QueryResult } from '..';
import { Query } from '../../query';
import { AbstractDialect } from './../../query-builder';
import { PostgresDialect } from './../../query-builder/dialects/postgres';
import {
    createErrorResult,
    transformFromSdkTransform,
} from './../../utils/transformer';
import { PostgreBaseConnection } from './base';
import { setPgParser, transformPgResult } from '@outerbase/sdk-transform';

export class PostgreSQLConnection extends PostgreBaseConnection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();
    protected numberedPlaceholder = true;

    constructor(pgClient: any) {
        super();
        this.client = pgClient;
        setPgParser(this.client);
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
            const result = await this.client.query({
                text: query.query,
                rowMode: 'array',
                values: query.parameters as unknown[],
            });

            return transformFromSdkTransform(transformPgResult(result));
        } catch (e) {
            if (e instanceof Error) {
                return createErrorResult<T>(e.message);
            }
            return createErrorResult<T>('Unknown error');
        }
    }
}
