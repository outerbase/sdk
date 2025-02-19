import { TableColumnDefinition } from './../models/database';
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
    escapeValue(value: unknown): string;

    select(builder: QueryBuilderInternal): Query;
    insert(builder: QueryBuilderInternal): Query;
    update(builder: QueryBuilderInternal): Query;
    delete(builder: QueryBuilderInternal): Query;
    createTable(builder: QueryBuilderInternal): Query;
    dropTable(builder: QueryBuilderInternal): Query;
    renameTable(builder: QueryBuilderInternal): Query;
    renameColumn(builder: QueryBuilderInternal): Query;
    alterColumn(builder: QueryBuilderInternal): Query;
    dropColumn(builder: QueryBuilderInternal): Query;
    addColumn(builder: QueryBuilderInternal): Query;
}

export enum ColumnDataType {
    ID = 'id',
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
    // Various flags to help customize the dialect
    protected AUTO_INCREMENT_KEYWORD = 'AUTO_INCREMENT';
    protected SUPPORT_COLUMN_COMMENT = true;

    // BigQuery does not support enforced constraint
    // This flag is primary for BigQuery only.
    protected ALWAY_NO_ENFORCED_CONSTRAINT = false;

    escapeId(identifier: string): string {
        return identifier
            .split('.')
            .map((str) => {
                if (str === '*') return '*';
                return '"' + str.replace(/"/g, '""') + '"';
            })
            .join('.');
    }

    escapeValue(value: unknown): string {
        if (value === undefined) return 'DEFAULT';
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, `''`)}'`;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'bigint') return value.toString();

        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        throw new Error(value.toString() + ' is unrecongize type of value');
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
            // BigQuery does not provide easy way to bind NULL value,
            // so we will skip binding NULL values and use raw NULL in query
            if (where.value === null) {
                return [
                    `${this.escapeId(where.column)} ${where.operator} NULL`,
                    [],
                ];
            }

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
            // BigQuery does not provide easy way to bind NULL value,
            // so we will skip binding NULL values and use raw NULL in query
            if (data[column] === null) return `${this.escapeId(column)} = NULL`;

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
            // BigQuery does not provide easy way to bind NULL value,
            // so we will skip binding NULL values and use raw NULL in query
            if (data[column] !== null) bindings.push(data[column]);
            return this.escapeId(column);
        });

        const placeholders = columns
            .map((column) => {
                // BigQuery does not provide easy way to bind NULL value,
                // so we will skip binding NULL values and use raw NULL in query
                if (data[column] === null) return 'NULL';
                return '?';
            })
            .join(', ');

        return [
            `(${columnNames.join(', ')}) VALUES(${placeholders})`,
            bindings,
        ];
    }

    // This is generic implementation of column definition,
    protected buildColumnDefinition(def: TableColumnDefinition): string {
        return [
            def.type,
            def.nullable === false ? 'NOT NULL' : '',
            def.invisible ? 'INVISIBLE' : '', // This is for MySQL case
            def.primaryKey ? 'PRIMARY KEY' : '',
            def.primaryKey && this.ALWAY_NO_ENFORCED_CONSTRAINT
                ? 'NOT ENFORCED'
                : '',
            def.unique ? 'UNIQUE' : '',
            def.default ? `DEFAULT ${this.escapeValue(def.default)}` : '',
            def.defaultExpression ? `DEFAULT (${def.defaultExpression})` : '',
            def.autoIncrement ? this.AUTO_INCREMENT_KEYWORD : '',
            def.collate ? `COLLATE ${def.collate}` : '',
            def.generatedExpression
                ? `GENERATED ALWAYS AS (${def.generatedExpression})`
                : '',
            def.generatedExpression && def.generatedType
                ? def.generatedType
                : '',
            def.checkExpression ? `CHECK (${def.checkExpression})` : '',
            def.comment && this.SUPPORT_COLUMN_COMMENT
                ? `COMMENT '${def.comment}'`
                : '',
        ]
            .filter(Boolean)
            .join(' ');
    }

    select(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error('Table name is required to build a SELECT query.');
        }

        const selectPart: QueryPart = builder.countingAllColumnName
            ? [
                  `COUNT(*) AS ${this.escapeId(builder.countingAllColumnName)}`,
                  [],
              ]
            : this.buildSelectPart(builder.selectColumns);

        const limitPart: QueryPart = builder.countingAllColumnName
            ? ['', []]
            : this.buildLimitPart(builder.limit, builder.offset);

        const combinedParts = this.mergePart(
            [
                ['SELECT', []],
                selectPart,
                [`FROM ${this.escapeId(tableName)}`, []],
                this.buildWherePart(builder.whereClauses),
                this.buildOrderPart(builder.orderBy),
                limitPart,
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
            throw new Error('Table name is required to build a INSERT query.');
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
                if (!column.definition)
                    throw new Error(
                        'Column definition is required to create table.'
                    );

                if (!column.name)
                    throw new Error('Column name is required to create table.');

                return [
                    this.escapeId(column.name),
                    this.buildColumnDefinition(column.definition),
                ]
                    .filter(Boolean)
                    .join(' ');
            }) ?? [];

        const references = builder?.columns?.filter(
            (c) => c.definition?.references
        );

        // Construct references part
        const referenceParts = references.map((column) => {
            const ref = column.definition?.references!;

            return [
                `FOREIGN KEY (${this.escapeId(column.name)}) REFERENCES ${this.escapeId(ref.table)}(${ref.column.map((c) => this.escapeId(c)).join(', ')})`,
                ref.match ? `MATCH ${ref.match}` : '',
                ref.onDelete ? `ON DELETE ${ref.onDelete}` : '',
                ref.onUpdate ? `ON UPDATE ${ref.onUpdate}` : '',
                this.ALWAY_NO_ENFORCED_CONSTRAINT ? 'NOT ENFORCED' : '',
            ]
                .filter(Boolean)
                .join(' ');
        });

        const query = [
            'CREATE TABLE IF NOT EXISTS',
            this.escapeId(tableName),
            `(${[...columns, ...referenceParts].join(', ')})`,
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

    dropColumn(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;
        const columnName = builder.dropColumn;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a DROP COLUMN query.'
            );
        }

        if (!columnName) {
            throw new Error('Column name is required to drop.');
        }

        return {
            query: `ALTER TABLE ${this.escapeId(tableName)} DROP COLUMN ${this.escapeId(columnName)}`,
            parameters: [],
        };
    }

    renameColumn(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a RENAME COLUMN query.'
            );
        }

        if (builder.columns.length !== 1) {
            throw new Error('Exactly one column is required to rename.');
        }

        const column = builder.columns[0];

        if (!column.name) {
            throw new Error('Old column name is required to rename.');
        }

        if (!column.newName) {
            throw new Error('New column name is required to rename.');
        }

        return {
            query: `ALTER TABLE ${this.escapeId(tableName)} RENAME COLUMN ${this.escapeId(column.name)} TO ${this.escapeId(column.newName)}`,
            parameters: [],
        };
    }

    renameTable(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;
        const newTableName = builder.newTableName;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a RENAME TABLE query.'
            );
        }

        if (!newTableName) {
            throw new Error('New table name is required to rename.');
        }

        return {
            query: `ALTER TABLE ${this.escapeId(tableName)} RENAME TO ${this.escapeId(newTableName)}`,
            parameters: [],
        };
    }

    alterColumn(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a ALTER COLUMN query.'
            );
        }

        if (builder.columns.length !== 1) {
            throw new Error('Exactly one column is required to alter.');
        }

        const column = builder.columns[0];

        if (!column.name) {
            throw new Error('Column name is required to alter.');
        }

        if (!column.definition) {
            throw new Error('Column definition is required to alter.');
        }

        return {
            query: `ALTER TABLE ${this.escapeId(tableName)} ALTER COLUMN ${this.escapeId(column.name)} ${this.buildColumnDefinition(column.definition)}`,
            parameters: [],
        };
    }

    addColumn(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error(
                'Table name is required to build a ADD COLUMN query.'
            );
        }

        if (builder.columns.length !== 1) {
            throw new Error('Exactly one column is required to add.');
        }

        const column = builder.columns[0];

        if (!column.name) {
            throw new Error('Column name is required to add.');
        }

        if (!column.definition) {
            throw new Error('Column definition is required to add.');
        }

        return {
            query: `ALTER TABLE ${this.escapeId(tableName)} ADD COLUMN ${this.escapeId(column.name)} ${this.buildColumnDefinition(column.definition)}`,
            parameters: [],
        };
    }

    delete(builder: QueryBuilderInternal): Query {
        const tableName = builder.table;

        if (!tableName) {
            throw new Error('Table name is required to build a DELETE query.');
        }

        const combinedParts = this.mergePart(
            [
                [`DELETE FROM ${this.escapeId(tableName)}`, []],
                this.buildWherePart(builder.whereClauses),
            ],
            ' '
        );

        return {
            query: combinedParts[0],
            parameters: combinedParts[1],
        };
    }
}
