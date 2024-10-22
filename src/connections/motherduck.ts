import duckDB from 'duckdb';

import { Query } from '../query';
import { QueryResult } from './index';
import { PostgreBaseConnection } from './postgre/base';
import {
    createErrorResult,
    transformObjectBasedResultFirstRow,
} from './../utils/transformer';

export class DuckDBConnection extends PostgreBaseConnection {
    client: duckDB.Database;
    connection: duckDB.Connection;

    constructor(client: any) {
        super();
        this.client = client;
        this.connection = client.connect();
    }

    /**
     * Performs a connect action on the current Connection object.
     *
     * @param details - Unused in the Motherduck scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        if (this.connection) {
            return this.client.connect();
        }
    }

    /**
     * Performs a disconnect action on the current Connection object.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return this.client.close();
    }

    /**
     * Triggers a query action on the current Connection object.
     *
     * The parameters object is sent along with the query to be used in the
     * query. By default if the query has parameters the SQL statement will
     * produce a string with `?::[DataType]` values that the parameters object
     * keys should map to, and will be replaced by.
     *
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns Promise<{ data: any, error: Error | null }>
     */
    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        const connection = this.connection;
        if (!connection) throw new Error('No DuckDB connection was found.');

        const { res, err } = await this.runQuery(
            query.query,
            query.parameters ?? []
        );

        if (err) {
            return createErrorResult(err.message) as QueryResult<T>;
        }

        return transformObjectBasedResultFirstRow(res) as QueryResult<T>;
    }

    protected runQuery(
        query: string,
        values: unknown[]
    ): Promise<{ res: duckDB.TableData; err: duckDB.DuckDbError | null }> {
        return new Promise((resolve) => {
            const stmt = this.connection.prepare(query);
            stmt.all(...values, (err, res) => {
                resolve({ res, err });
            });
        });
    }
}
