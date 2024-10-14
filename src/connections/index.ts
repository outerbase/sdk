import { QueryType } from '../query-params';
import { Query } from '../query';
import { Database } from '../models/database';
import { AbstractDialect } from 'src/query-builder';
import { Outerbase } from 'src/client';

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

export abstract class Connection {
    // Handles logic for securely connecting and properly disposing of the connection.
    abstract connect(): Promise<any>;
    abstract disconnect(): Promise<any>;

    // Retrieve metadata about the database, useful for introspection.
    abstract fetchDatabaseSchema(): Promise<Database>;

    abstract renameColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        newColumnName: string
    ): Promise<QueryResult>;
}

export abstract class SqlConnection extends Connection {
    abstract dialect: AbstractDialect;

    abstract query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>>;

    async renameColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        newColumnName: string
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .alterTable(
                    schemaName ? `${schemaName}.${tableName}` : tableName
                )
                .renameColumn(columnName, newColumnName)
                .toQuery()
        );
    }
}
