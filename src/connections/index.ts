import { ColumnHeader, ResultSet } from '@outerbase/sdk-transform';
import {
    Database,
    TableColumn,
    TableColumnDefinition,
} from '../models/database';

export interface QueryResult<T = Record<string, unknown>>
    extends Omit<ResultSet, 'rows'> {
    data: T[];
    count?: number;
    error: Error | null;
    query: string;
}
export interface ConnectionSelectOptions {
    where?: { name: string; value: unknown; operator: string }[];
    orderBy?: (string | [string, 'ASC' | 'DESC'])[];
    offset?: number;
    limit?: number;
    includeCounting?: boolean;
}
export abstract class Connection {
    // Handles logic for securely connecting and properly disposing of the connection.
    abstract connect(): Promise<any>;
    abstract disconnect(): Promise<any>;

    // Retrieve metadata about the database, useful for introspection.
    abstract fetchDatabaseSchema(): Promise<Database>;
    abstract raw(
        query: string,
        params?: Record<string, unknown> | unknown[]
    ): Promise<QueryResult>;
    abstract testConnection(): Promise<{ error?: string }>;

    // Connection common operations that will be used by Outerbase
    abstract insert(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>
    ): Promise<QueryResult>;

    abstract insertMany(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>[]
    ): Promise<QueryResult>;

    abstract update(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>,
        where: Record<string, unknown>
    ): Promise<QueryResult>;

    abstract delete(
        schemaName: string,
        tableName: string,
        where: Record<string, unknown>
    ): Promise<QueryResult>;

    abstract select(
        schemaName: string,
        tableName: string,
        options: ConnectionSelectOptions
    ): Promise<QueryResult>;

    // Changing schema operations
    abstract dropTable(
        schemaName: string | undefined,
        tableName: string
    ): Promise<QueryResult>;

    abstract createTable(
        schemaName: string | undefined,
        tableName: string,
        columns: Partial<TableColumn>[]
    ): Promise<QueryResult>;

    abstract renameColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        newColumnName: string
    ): Promise<QueryResult>;

    abstract renameTable(
        schemaName: string | undefined,
        tableName: string,
        newTableName: string
    ): Promise<QueryResult>;

    abstract alterColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        defintion: TableColumnDefinition
    ): Promise<QueryResult>;

    abstract addColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        defintion: TableColumnDefinition
    ): Promise<QueryResult>;

    abstract dropColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string
    ): Promise<QueryResult>;
}
