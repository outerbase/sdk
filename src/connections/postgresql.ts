import { Client } from 'pg';
import { Connection, QueryResult } from '.';
import { Query } from '../query';
import { AbstractDialect } from 'src/query-builder';
import { PostgresDialect } from 'src/query-builder/dialects/postgres';
import { QueryType } from 'src/query-params';

function replacePlaceholders(query: string): string {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
}

export class PostgreSQLConnection implements Connection {
    client: Client;
    dialect: AbstractDialect = new PostgresDialect();
    queryType: QueryType = QueryType.positional;

    constructor(pgClient: Client) {
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
        const { rows } = await this.client.query(
            replacePlaceholders(query.query),
            query.parameters as unknown[]
        );

        return {
            data: rows,
            error: null,
            query: query.query,
        };
    }
}
