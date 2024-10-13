import { QueryType } from '../query-params';
import { Query } from '../query';
import { Database } from '../models/database';
import { AbstractDialect } from 'src/query-builder';

export type OperationResponse = {
    success: boolean;
    data: any;
    error: Error | null;
};

export interface QueryResult<T = Record<string, unknown>> {
    data: T[];
    error: Error | null;
    query: string;
}

export interface Connection {
    dialect: AbstractDialect;

    // Handles logic for securely connecting and properly disposing of the connection.
    connect: () => Promise<any>;
    disconnect: () => Promise<any>;

    // Raw query execution method that can be used to execute any query.
    query: <T = Record<string, unknown>>(
        query: Query
    ) => Promise<QueryResult<T>>;

    // Retrieve metadata about the database, useful for introspection.
    fetchDatabaseSchema?: () => Promise<Database>;
}
