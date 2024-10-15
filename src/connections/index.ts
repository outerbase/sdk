import { Query } from '../query';
import { Database, TableColumn } from '../models/database';
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

export interface ConnectionSelectOptions {
    where?: { name: string; value: unknown; operator: string }[];
    orderBy?: (string | [string, 'ASC' | 'DESC'])[];
    offset: number;
    limit: number;
}
export abstract class Connection {
    // Handles logic for securely connecting and properly disposing of the connection.
    abstract connect(): Promise<any>;
    abstract disconnect(): Promise<any>;

    // Retrieve metadata about the database, useful for introspection.
    abstract fetchDatabaseSchema(): Promise<Database>;

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
}

export abstract class SqlConnection extends Connection {
    abstract dialect: AbstractDialect;

    abstract query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>>;

    async select(
        schemaName: string,
        tableName: string,
        options: ConnectionSelectOptions
    ): Promise<QueryResult> {
        const query = Outerbase(this)
            .select()
            .from(schemaName ? `${schemaName}.${tableName}` : tableName)
            .limit(options.limit)
            .offset(options.offset);

        if (options.where) {
            for (const where of options.where) {
                query.where(where.name, where.operator, where.value);
            }
        }

        if (options.orderBy) {
            for (const orderBy of options.orderBy) {
                if (Array.isArray(orderBy)) {
                    query.orderBy(orderBy[0], orderBy[1]);
                } else {
                    query.orderBy(orderBy);
                }
            }
        }

        return await this.query(query.toQuery());
    }

    async insert(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .insert(data)
                .into(schemaName ? `${schemaName}.${tableName}` : tableName)
                .toQuery()
        );
    }

    async insertMany(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>[]
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        for (const item of data) {
            await this.query(
                qb
                    .insert(item)
                    .into(schemaName ? `${schemaName}.${tableName}` : tableName)
                    .toQuery()
            );
        }

        return { data: [], error: null, query: '' };
    }

    async update(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>,
        where: Record<string, unknown>
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .update(data)
                .into(schemaName ? `${schemaName}.${tableName}` : tableName)
                .where(where)
                .toQuery()
        );
    }

    async delete(
        schemaName: string,
        tableName: string,
        where: Record<string, unknown>
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .delete()
                .from(schemaName ? `${schemaName}.${tableName}` : tableName)
                .where(where)
                .toQuery()
        );
    }

    createTable(
        schemaName: string | undefined,
        tableName: string,
        columns: Partial<TableColumn>[]
    ): Promise<QueryResult> {
        const qb = Outerbase(this).createTable(
            schemaName ? `${schemaName}.${tableName}` : tableName
        );

        for (const column of columns) {
            if (column.name && column.type) {
                qb.column(column.name, column.type);
            }
        }

        return this.query(qb.toQuery());
    }

    dropTable(
        schemaName: string | undefined,
        tableName: string
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return this.query(
            qb
                .dropTable(
                    schemaName ? `${schemaName}.${tableName}` : tableName
                )
                .toQuery()
        );
    }

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
