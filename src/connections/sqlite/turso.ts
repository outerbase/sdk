import { Client, InValue } from '@libsql/client';

import { AbstractDialect } from './../../query-builder';
import { QueryResult } from '..';
import { Query } from '../../query';
import { PostgresDialect } from './../../query-builder/dialects/postgres';
import { SqliteBaseConnection } from './base';
import {
    createErrorResult,
    transformFromSdkTransform,
} from './../../utils/transformer';
import { transformTursoResult } from '@outerbase/sdk-transform';

export class TursoConnection extends SqliteBaseConnection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();

    constructor(client: any) {
        super();
        this.client = client;
    }

    async internalQuery<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const result = await this.client.execute({
                sql: query.query,
                args: (query.parameters ?? []) as InValue[],
            });

            return transformFromSdkTransform(transformTursoResult(result));
        } catch (e) {
            if (e instanceof Error) {
                return createErrorResult(e.message) as QueryResult<T>;
            } else {
                return createErrorResult('Unknown error') as QueryResult<T>;
            }
        }
    }

    async connect() {}
    async disconnect() {}
}
