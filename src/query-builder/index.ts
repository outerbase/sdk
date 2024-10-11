import { QueryType } from '../query-params';
import {
    OrderByClause,
    QueryBuilderInternal,
    QueryPart,
    WhereClaues,
    WhereCondition,
} from '../client';
import { Query } from '../query';

interface Dialect {
    escapeId(identifier: string): string;
    select(builder: QueryBuilderInternal): Query;
    insert(builder: QueryBuilderInternal): Query;
    update(builder: QueryBuilderInternal): Query;
    // delete(builder: QueryBuilderInternal): Query;
    createTable(builder: QueryBuilderInternal): Query;
    dropTable(builder: QueryBuilderInternal): Query;
}

export enum ColumnDataType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    DATE = 'date',
    JSON = 'json',
    ARRAY = 'array',
    OBJECT = 'object',
    BLOB = 'blob',
    UUID = 'uuid',
}

export abstract class AbstractDialect implements Dialect {
    escapeId(identifier: string): string {
        return identifier
            .split('.')
            .map((str) => {
                if (str === '*') return '*';
                return '"' + str.replace(/"/g, '""') + '"';
            })
            .join('.');
    }

    protected removeEmptyValues(
        data: Record<string, unknown>
    ): Record<string, unknown> {
        return Object.keys(data).reduce(
            (acc, key) => {
                if (data[key] !== undefined) {
                    acc[key] = data[key];
                }
                return acc;
            },
            {} as Record<string, unknown>
        );
    }

    protected mergePart(parts: QueryPart[], separator: string): QueryPart {
        const finalParts = parts.filter((part) => part[0] !== '');
        const query = finalParts.map((part) => part[0]).join(separator);
        const binding = finalParts.map((part) => part[1]).flat();
        return [query, binding];
    }

    protected flattenWhereClause(
        where: WhereClaues | WhereCondition
    ): WhereClaues | WhereCondition {
        // This is normal condition, we cannot flatten it
        if (!where.joinType) return where;

        // If there is only one condition, we can promote it to parent
        if (where.conditions.length === 1) {
            return this.flattenWhereClause(where.conditions[0]);
        }

        // If there are multiple conditions, we need to check if they are of same join type
        if (where.conditions.length > 1) {
            const conditions = where.conditions
                .map((condition) => this.flattenWhereClause(condition))
                .map((condition) => {
                    if (condition.joinType === where.joinType)
                        return condition.conditions;
                    return condition;
                })
                .flat();

            return {
                joinType: where.joinType,
                conditions,
            };
        }

        return where;
    }

    protected buildWhereClause(
        where: WhereClaues | WhereCondition,
        depth: number = 0
    ): QueryPart {
        if (where.joinType) {
            const joinConditions = where.conditions.map((condition) => {
                return this.buildWhereClause(condition, depth + 1);
            });

            const merged = this.mergePart(
                joinConditions,
                ` ${where.joinType} `
            );
            if (depth > 0) {
                return [`(${merged[0]})`, merged[1]];
            }
            return merged;
        } else {
            return [
                `${this.escapeId(where.column)} ${where.operator} ?`,
                [where.value],
            ];
        }
    }

    protected buildWherePart(where: WhereClaues): QueryPart {
        if (!where) return ['', []];
        const part = this.buildWhereClause(this.flattenWhereClause(where));

        if (part[0]) {
            return ['WHERE ' + part[0], part[1]];
        }

        return part;
    }

    protected buildLimitPart(
        limit: number | undefined,
        offset: number | undefined
    ): QueryPart {
        if (limit !== undefined && offset !== undefined) {
            return [`LIMIT ? OFFSET ?`, [limit, offset]];
        } else if (limit !== undefined) {
            return ['LIMIT ?', [limit]];
        }
        return ['', []];
    }

    protected buildSelectPart(selectedColumns?: string[]): QueryPart {
        if (!selectedColumns) return ['*', []];
        if (selectedColumns.length === 0) return ['*', []];

        const columns = selectedColumns.map((column) => this.escapeId(column));
        return [columns.join(', '), []];
    }

    protected buildSetPart(data: Record<string, unknown>): QueryPart {
        const columns = Object.keys(data);
        const bindings: unknown[] = [];

        const setClauses = columns.map((column) => {
            bindings.push(data[column]);
            return `${this.escapeId(column)} = ?`;
        });

        return ['SET ' + setClauses.join(', '), bindings];
    }

    protected buildOrderPart(orderBy: OrderByClause[]): QueryPart {
        if (orderBy.length === 0) return ['', []];

        const orderClauses = orderBy.map((clause) => {
            return `${this.escapeId(clause.columnName)}${clause.direction === 'ASC' ? '' : ' DESC'}`;
        });

        return ['ORDER BY ' + orderClauses.join(', '), []];
    }

    protected buildInsertValuesPart(data: Record<string, unknown>): QueryPart {
        const columns = Object.keys(data);
        const bindings: unknown[] = [];

        const columnNames = columns.map((column) => {
            bindings.push(data[column]);
            return this.escapeId(column);
        });

        const placeholders = columns.map(() => '?').join(', ');

        return [
            `(${columnNames.join(', ')}) VALUES(${placeholders})`,
            bindings,
        ];
    }

    select(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error('Table name is required to build a SELECT query.');
        }

        const combinedParts = this.mergePart(
            [
                ['SELECT', []],
                this.buildSelectPart(builder.selectColumns),
                [`FROM ${this.escapeId(tableName)}`, []],
                this.buildWherePart(builder.whereClauses),
                this.buildOrderPart(builder.orderBy),
                this.buildLimitPart(builder.limit, builder.offset),
            ],
            ' '
        );

        return {
            query: combinedParts[0],
            parameters: combinedParts[1],
        };
    }

    insert(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error('Table name is required to build a UPDATE query.');
        }

        // Remove all empty value from object and check if there is any data to update
        const data = this.removeEmptyValues({ ...builder.data });
        if (Object.keys(data).length === 0) {
            throw new Error('Data is required to update the table.');
        }

        const combinedParts = this.mergePart(
            [
                [`INSERT INTO ${this.escapeId(tableName)}`, []],
                this.buildInsertValuesPart(data),
            ],
            ''
        );

        return {
            query: combinedParts[0],
            parameters: combinedParts[1],
        };
    }

    update(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error('Table name is required to build a UPDATE query.');
        }

        // Remove all empty value from object and check if there is any data to update
        const data = this.removeEmptyValues({ ...builder.data });
        if (Object.keys(data).length === 0) {
            throw new Error('Data is required to update the table.');
        }

        const combinedParts = this.mergePart(
            [
                [`UPDATE ${this.escapeId(tableName)}`, []],
                this.buildSetPart(data),
                this.buildWherePart(builder.whereClauses),
            ],
            ' '
        );

        return {
            query: combinedParts[0],
            parameters: combinedParts[1],
        };
    }

    createTable(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a CREATE TABLE query.'
            );
        }

        const columns =
            builder?.columns?.map((column) => {
                if (!column.type)
                    throw new Error('Column type is required to create table.');

                if (!column.name)
                    throw new Error('Column name is required to create table.');

                return [
                    this.escapeId(column.name),
                    column.type,
                    !column.nullable ? 'NOT NULL' : '',
                    column.primaryKey ? 'PRIMARY KEY' : '',
                    column.default ? `DEFAULT ${column.default}` : '',
                ]
                    .filter(Boolean)
                    .join(' ');
            }) ?? [];

        const query = [
            'CREATE TABLE IF NOT EXISTS',
            this.escapeId(tableName),
            `(${columns.join(', ')})`,
        ].join(' ');

        return { query, parameters: [] };
    }

    dropTable(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a CREATE TABLE query.'
            );
        }

        return {
            query: `DROP TABLE IF EXISTS ${this.escapeId(tableName)}`,
            parameters: [],
        };
    }

    // delete(
    //     builder: QueryBuilderInternal,
    // ): Query {
    //     // if (!builder.whereClauses || builder.whereClauses?.length === 0) {
    //     //     return query
    //     // }

    //     // const formattedTable = this.formatFromSchemaAndTable(
    //     //     builder.schema,
    //     //     builder.table || ''
    //     // )
    //     // query.query = `DELETE FROM ${formattedTable}`
    //     // if (builder.whereClauses?.length > 0) {
    //     //     query.query += ` WHERE ${builder.whereClauses.join(' AND ')}`
    //     // }

    //     return ;
    // }
}
