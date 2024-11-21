import { Query } from '../query';
import {
    Connection,
    ConnectionSelectOptions,
    Outerbase,
    QueryResult,
} from '..';
import { AbstractDialect, ColumnDataType } from './../query-builder';
import { TableColumn, TableColumnDefinition } from './../models/database';
import {
    namedPlaceholder,
    toNumberedPlaceholders,
} from './../utils/placeholder';

export abstract class SqlConnection extends Connection {
    abstract dialect: AbstractDialect;
    protected numberedPlaceholder = false;

    abstract query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>>;

    mapDataType(dataType: string): string {
        if (dataType === ColumnDataType.ID) return 'INTEGER';
        if (dataType === ColumnDataType.NUMBER) return 'INTEGER';
        return dataType;
    }

    async raw(
        query: string,
        params?: Record<string, unknown> | unknown[]
    ): Promise<QueryResult> {
        if (!params) return await this.query({ query });

        // Positional placeholder
        if (Array.isArray(params)) {
            if (this.numberedPlaceholder) {
                const { query: newQuery, bindings } = toNumberedPlaceholders(
                    query,
                    params
                );

                return await this.query({
                    query: newQuery,
                    parameters: bindings,
                });
            }

            return await this.query({ query, parameters: params });
        }

        // Named placeholder
        const { query: newQuery, bindings } = namedPlaceholder(query, params!);
        return await this.query({ query: newQuery, parameters: bindings });
    }

    async select(
        schemaName: string,
        tableName: string,
        options: ConnectionSelectOptions
    ): Promise<QueryResult> {
        const query = Outerbase(this)
            .select()
            .from(schemaName ? `${schemaName}.${tableName}` : tableName);

        if (options.limit) {
            query.limit(options.limit);
        }

        if (options.offset) {
            query.offset(options.offset);
        }

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

        let count: number | undefined = undefined;
        const result = await this.query(query.toQuery());

        if (options.includeCounting) {
            const { data: countResult } = await this.query<{
                total_rows: number;
            }>(query.count('total_rows').toQuery());

            if (countResult && countResult.length === 1) {
                count = Number(countResult[0].total_rows);
            }
        }

        return {
            ...result,
            count,
        };
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
            qb.column(column.name, {
                ...column.definition,
                type: this.mapDataType(column.definition.type),
            });
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
                .alterColumn(columnName, {
                    ...defintion,
                    type: this.mapDataType(defintion.type),
                })
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
                .addColumn(columnName, {
                    ...defintion,
                    type: this.mapDataType(defintion.type),
                })
                .toQuery()
        );
    }

    async dropColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string
    ): Promise<QueryResult> {
        const qb = Outerbase(this);

        return await this.query(
            qb
                .alterTable(
                    schemaName ? `${schemaName}.${tableName}` : tableName
                )
                .dropColumn(columnName)
                .toQuery()
        );
    }

    async testConnection(): Promise<{ error?: string }> {
        try {
            await this.connect();
            const { error } = await this.raw('SELECT 1;');
            await this.disconnect();
            return { error: error ? error.message : undefined };
        } catch (error) {
            return { error: 'Unexpected error' };
        }
    }
}
