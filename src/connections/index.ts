import { Query } from '../query';
import {
    Database,
    TableColumn,
    TableColumnDefinition,
} from '../models/database';
import { AbstractDialect } from './../query-builder';
import { Outerbase } from './../client';

export interface QueryResultHeader {
    name: string;
    displayName: string;
    type?: string;
    tableName?: string;
}
export interface QueryResult<T = Record<string, unknown>> {
    data: T[];
    count?: number;
    headers: QueryResultHeader[];
    error: Error | null;
    query: string;
}

export interface ConnectionSelectOptions {
    where?: { name: string; value: unknown; operator: string }[];
    orderBy?: (string | [string, 'ASC' | 'DESC'])[];
    offset: number;
    limit: number;
    includeCounting?: boolean;
}
export abstract class Connection {
    // Handles logic for securely connecting and properly disposing of the connection.
    abstract connect(): Promise<any>;
    abstract disconnect(): Promise<any>;

    // Retrieve metadata about the database, useful for introspection.
    abstract fetchDatabaseSchema(): Promise<Database>;
    abstract raw(query: string): Promise<QueryResult>;
    abstract testConnection(): Promise<boolean>;

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
}

export abstract class SqlConnection extends Connection {
    abstract dialect: AbstractDialect;

    abstract query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>>;

    async raw(query: string): Promise<QueryResult> {
        return await this.query({ query });
    }

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

        return { data: [], error: null, query: '', headers: [] };
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
        columns: TableColumn[]
    ): Promise<QueryResult> {
        const qb = Outerbase(this).createTable(
            schemaName ? `${schemaName}.${tableName}` : tableName
        );

        for (const column of columns) {
            qb.column(column.name, column.definition);
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

    async renameTable(
        schemaName: string | undefined,
        tableName: string,
        newTableName: string
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .alterTable(
                    schemaName ? `${schemaName}.${tableName}` : tableName
                )
                .renameTable(newTableName)
                .toQuery()
        );
    }

    async alterColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        defintion: TableColumnDefinition
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .alterTable(
                    schemaName ? `${schemaName}.${tableName}` : tableName
                )
                .alterColumn(columnName, defintion)
                .toQuery()
        );
    }

    async addColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        defintion: TableColumnDefinition
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .alterTable(
                    schemaName ? `${schemaName}.${tableName}` : tableName
                )
                .addColumn(columnName, defintion)
                .toQuery()
        );
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.connect();
            const { error } = await this.raw('SELECT 1;');
            await this.disconnect();
            return !error;
        } catch (error) {
            return false;
        }
    }
}
