import { BaseTable } from 'src/models'
import { Connection } from './connections'
import { Query, constructRawQuery } from './query'
import { QueryParams, QueryType } from './query-params'
import { AbstractDialect, ColumnDataType } from './query-builder'
import { DefaultDialect } from './query-builder/dialects/default'

export enum QueryBuilderAction {
    SELECT = 'select',
    INSERT = 'insert',
    UPDATE = 'update',
    DELETE = 'delete',

    // Table operations
    CREATE_TABLE = 'createTable',
    UPDATE_TABLE = 'updateTable',
    DELETE_TABLE = 'deleteTable',
    TRUNCATE_TABLE = 'truncateTable',
    RENAME_TABLE = 'renameTable',
    ALTER_TABLE = 'alterTable',
    ADD_COLUMNS = 'addColumns',
    DROP_COLUMNS = 'dropColumns',
    RENAME_COLUMNS = 'renameColumns',
    UPDATE_COLUMNS = 'updateColumns',
}

export interface QueryBuilder {
    action: QueryBuilderAction
    // Sets the focused schema name, used for INSERT, UPDATE, DELETE
    schema?: string
    // Sets the focused table name, used for INSERT, UPDATE, DELETE
    table?: string
    // Used specifically for SELECT statements, useful when joining multiple tables
    columnsWithTable?: { schema?: string; table: string; columns: string[] }[]
    // Used when column names and type are required, such as CREATE TABLE
    columns?: {
        default?: string
        nullable?: boolean
        name?: string
        type?: ColumnDataType | string
        oldName?: string
        newName?: string
    }[]
    whereClauses?: string[]
    joins?: string[]
    data?: { [key: string]: any }
    limit?: number
    offset?: number | null
    orderBy?: string
    returning?: string[]
    asClass?: any
    groupBy?: string
    // In an alter state within the builder
    isAltering?: boolean

    selectRawValue?: string

    // General operation values, such as when renaming tables referencing the old and new name
    originalValue?: string
    newValue?: string
}

export interface OuterbaseType {
    queryBuilder: QueryBuilder
    selectFrom: (
        columnsArray: { schema?: string; table: string; columns: string[] }[]
    ) => OuterbaseType
    selectRaw: (statement: string) => OuterbaseType

    insert: (data: { [key: string]: any }) => OuterbaseType
    update: (data: { [key: string]: any }) => OuterbaseType
    deleteFrom: (table: string) => OuterbaseType
    where: (condition: any) => OuterbaseType
    limit: (limit: number) => OuterbaseType
    offset: (offset: number) => OuterbaseType
    orderBy: (column: string, direction?: 'ASC' | 'DESC') => OuterbaseType
    innerJoin: (
        table: string,
        condition: string,
        options?: any
    ) => OuterbaseType
    leftJoin: (table: string, condition: string, options?: any) => OuterbaseType
    rightJoin: (
        table: string,
        condition: string,
        options?: any
    ) => OuterbaseType
    outerJoin: (
        table: string,
        condition: string,
        options?: any
    ) => OuterbaseType
    into: (table: string) => OuterbaseType
    schema: (schema: string) => OuterbaseType
    returning: (columns: string[]) => OuterbaseType
    groupBy: (column: string) => OuterbaseType

    // WORK IN PROGRESS
    // WORK IN PROGRESS
    // Table operations
    createTable?: (table: string) => OuterbaseType
    renameTable?: (old: string, name: string) => OuterbaseType
    addColumns: (columns: { name: string; type: string }[]) => OuterbaseType
    dropColumns: (columns: string[]) => OuterbaseType
    updateColumn: (
        columns: {
            name: string
            type: ColumnDataType
            nullable?: boolean
            default?: string
        }[]
    ) => OuterbaseType
    dropTable?: (table: string) => OuterbaseType
    alterTable: (table: string) => OuterbaseType
    columns?: (
        columns: { name: string; type: ColumnDataType }[]
    ) => OuterbaseType

    renameColumns: (
        columns: { newName: string; oldName: string }[]
    ) => OuterbaseType
    // WORK IN PROGRESS
    // WORK IN PROGRESS
    // WORK IN PROGRESS

    // General purpose methods
    asClass: (classType: any) => OuterbaseType
    query: () => Promise<any>
    queryRaw: (query: string, parameters?: QueryParams) => Promise<any>
    toString: () => string
}

export function Outerbase(connection: Connection): OuterbaseType {
    const dialect = connection.dialect

    const outerbase: OuterbaseType = {
        queryBuilder: { action: QueryBuilderAction.SELECT },
        selectFrom(columnsArray) {
            this.queryBuilder = {
                action: QueryBuilderAction.SELECT,
                columnsWithTable: columnsArray,
                whereClauses: [],
                joins: [],
            }

            return this
        },
        selectRaw(statement) {
            this.queryBuilder.action = QueryBuilderAction.SELECT
            this.queryBuilder.selectRawValue = statement

            return this
        },
        where(condition) {
            // Check if `condition` is an array of conditions
            if (Array.isArray(condition)) {
                if (this.queryBuilder.whereClauses) {
                    this.queryBuilder.whereClauses.push(
                        `(${condition.join(' AND ')})`
                    )
                }
            } else {
                if (this.queryBuilder.whereClauses) {
                    this.queryBuilder.whereClauses.push(condition)
                }
            }
            return this
        },
        limit(limit) {
            this.queryBuilder.limit = limit
            return this
        },
        offset(offset) {
            this.queryBuilder.offset = offset
            return this
        },
        orderBy(value) {
            this.queryBuilder.orderBy = value
            return this
        },
        innerJoin(table, condition, options) {
            let skipEscape = false
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '')
            }

            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(
                    `INNER JOIN ${table} ON ${condition}`
                )
            return this
        },
        leftJoin(table, condition, options) {
            let skipEscape = false
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '')
            }

            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(
                    `LEFT JOIN ${table} ON ${condition}`
                )
            return this
        },
        rightJoin(table, condition, options) {
            let skipEscape = false
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '')
            }

            condition = condition.replace(/'/g, '')
            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(
                    `RIGHT JOIN ${table} ON ${condition}`
                )
            return this
        },
        outerJoin(table, condition, options) {
            let skipEscape = false
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '')
            }

            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(
                    `OUTER JOIN ${table} ON ${condition}`
                )
            return this
        },

        addColumns(columns) {
            this.queryBuilder = {
                ...this.queryBuilder,
                columns,
                action: QueryBuilderAction.ADD_COLUMNS,
            }
            return this
        },
        renameColumns(columns) {
            this.queryBuilder = {
                ...this.queryBuilder,
                columns,
                action: QueryBuilderAction.RENAME_COLUMNS,
            }
            return this
        },
        dropColumns(columns) {
            this.queryBuilder = {
                ...this.queryBuilder,
                columns: columns.map((column) => ({
                    name: column,
                    // We don't really care what the type is
                    type: ColumnDataType.STRING,
                })),
                action: QueryBuilderAction.DROP_COLUMNS,
            }
            return this
        },
        updateColumn(columns) {
            this.queryBuilder = {
                ...this.queryBuilder,
                columns,
                action: QueryBuilderAction.UPDATE_COLUMNS,
            }
            return this
        },
        insert(data) {
            this.queryBuilder = {
                action: QueryBuilderAction.INSERT,
                data: data,
            }
            return this
        },
        update(data) {
            this.queryBuilder = {
                action: QueryBuilderAction.UPDATE,
                data: data,
                whereClauses: [],
            }
            return this
        },
        into(table) {
            this.queryBuilder.table = table
            return this
        },
        schema(schema) {
            this.queryBuilder.schema = schema
            return this
        },
        deleteFrom(table) {
            this.queryBuilder = {
                action: QueryBuilderAction.DELETE,
                table: table,
                whereClauses: [],
            }
            return this
        },
        returning(columns: string[]) {
            this.queryBuilder.returning = columns
            return this
        },
        groupBy(column: string) {
            this.queryBuilder.groupBy = column
            return this
        },
        asClass(classType) {
            this.queryBuilder.asClass = classType
            return this
        },
        toString() {
            const query = buildQueryString(
                this.queryBuilder,
                connection.queryType,
                dialect
            )
            return constructRawQuery(query)
        },
        async query() {
            const query = buildQueryString(
                this.queryBuilder,
                connection.queryType,
                dialect
            )
            
            // If asClass is set, map the response to the class
            if (this.queryBuilder.asClass) {
                const response = await connection.query(query)
                let result = mapToClass(
                    response?.data,
                    this.queryBuilder.asClass,
                    connection
                )
                return {
                    data: result,
                    error: response.error,
                    query,
                }
            }

            // Otherwise, if asClass is not set, return the raw response
            let response = await connection.query(query)

            return {
                ...response,
                query,
            }
        },
        async queryRaw(query, parameters) {
            // If asClass is set, map the response to the class
            if (this.queryBuilder.asClass) {
                const response = await connection.query({ query, parameters })
                let result = mapToClass(
                    response?.data,
                    this.queryBuilder.asClass,
                    connection
                )
                return {
                    data: result,
                    error: response.error,
                    query,
                }
            }

            // Otherwise, if asClass is not set, return the raw response
            let response = await connection.query({ query, parameters })
            return {
                ...response,
                query,
            }
        },

        createTable(table) {
            this.queryBuilder = {
                action: QueryBuilderAction.CREATE_TABLE,
                table,
            }
            return this
        },

        alterTable(table) {
            this.queryBuilder.isAltering = true
            this.queryBuilder.table = table
            return this
        },

        dropTable(table) {
            this.queryBuilder = {
                action: QueryBuilderAction.DELETE_TABLE,
                table,
            }
            return this
        },
        renameTable(old, name) {
            this.queryBuilder = {
                action: QueryBuilderAction.RENAME_TABLE,
                originalValue: old,
                newValue: name,
            }
            return this
        },

        columns(columns) {
            this.queryBuilder.columns = columns
            return this
        },
    }

    return outerbase
}

function buildQueryString(
    queryBuilder: QueryBuilder,
    queryType: QueryType,
    dialect: AbstractDialect
): Query {
    const query: Query = {
        query: '',
        parameters: queryType === QueryType.named ? {} : [],
    }

    switch (queryBuilder.action) {
        case QueryBuilderAction.SELECT:
            query.query = dialect.select(queryBuilder, queryType, query).query
            break
        case QueryBuilderAction.INSERT:
            query.query = dialect.insert(queryBuilder, queryType, query).query
            query.parameters = dialect.insert(
                queryBuilder,
                queryType,
                query
            ).parameters
            break
        case QueryBuilderAction.UPDATE:
            query.query = dialect.update(queryBuilder, queryType, query).query
            query.parameters = dialect.update(
                queryBuilder,
                queryType,
                query
            ).parameters
            break
        case QueryBuilderAction.DELETE:
            query.query = dialect.delete(queryBuilder, queryType, query).query
            query.parameters = dialect.delete(
                queryBuilder,
                queryType,
                query
            ).parameters
            break
        case QueryBuilderAction.CREATE_TABLE:
            query.query = dialect.createTable(
                queryBuilder,
                queryType,
                query
            ).query
            query.parameters = dialect.createTable(
                queryBuilder,
                queryType,
                query
            ).parameters
            break
        case QueryBuilderAction.DELETE_TABLE:
            query.query = dialect.dropTable(
                queryBuilder,
                queryType,
                query
            ).query
            break
        case QueryBuilderAction.RENAME_TABLE:
            query.query = dialect.renameTable(
                queryBuilder,
                queryType,
                query
            ).query
            break

        case QueryBuilderAction.ADD_COLUMNS:
            query.query = dialect.addColumn(
                queryBuilder,
                queryType,
                query
            ).query
            break
        case QueryBuilderAction.DROP_COLUMNS:
            query.query = dialect.dropColumn(
                queryBuilder,
                queryType,
                query
            ).query
            break
        case QueryBuilderAction.RENAME_COLUMNS:
            query.query = dialect.renameColumn(
                queryBuilder,
                queryType,
                query
            ).query
            break
        case QueryBuilderAction.UPDATE_COLUMNS:
            query.query = dialect.updateColumn(
                queryBuilder,
                queryType,
                query
            ).query
            break
        default:
            throw new Error('Invalid action')
    }

    return query
}

function mapToClass<T>(
    data: any | any[],
    ctor: new (data: any) => T,
    connection?: Connection
): T | T[] {
    if (Array.isArray(data)) {
        return data.map((item) => {
            const model = new ctor(item) as BaseTable
            model._connection = connection
            return model
        }) as T[]
    } else {
        const model = new ctor(data) as BaseTable
        model._connection = connection
        return new ctor(data)
    }
}

export function equals(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.equals(a, b)
}

export function equalsNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.equalsNumber(a, b)
}

export function equalsColumn(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.equalsColumn(a, b)
}

export function notEquals(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notEquals(a, b)
}

export function notEqualsNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notEqualsNumber(a, b)
}

export function notEqualsColumn(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notEqualsColumn(a, b)
}

export function greaterThan(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.greaterThan(a, b)
}

export function greaterThanNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.greaterThanNumber(a, b)
}

export function lessThan(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.lessThan(a, b)
}

export function lessThanNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.lessThanNumber(a, b)
}

export function greaterThanOrEqual(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.greaterThanOrEqual(a, b)
}

export function greaterThanOrEqualNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.greaterThanOrEqualNumber(a, b)
}

export function lessThanOrEqual(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.lessThanOrEqual(a, b)
}

export function lessThanOrEqualNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.lessThanOrEqualNumber(a, b)
}

export function inValues(
    a: any,
    b: any[],
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.inValues(a, b)
}

export function inNumbers(
    a: any,
    b: any[],
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.inNumbers(a, b)
}

export function notInValues(
    a: any,
    b: any[],
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notInValues(a, b)
}

export function notInNumbers(
    a: any,
    b: any[],
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notInNumbers(a, b)
}

export function is(
    this: any,
    a: any,
    b: string | null,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.is(this, a, b)
}

export function isNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.isNumber(a, b)
}

export function isNot(
    this: any,
    a: any,
    b: null,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.isNot(this, a, b)
}

export function isNotNumber(
    a: any,
    b: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.isNotNumber(a, b)
}

export function like(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.like(a, b)
}

export function notLike(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notLike(a, b)
}

export function ilike(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.ilike(a, b)
}

export function notILike(
    a: any,
    b: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notILike(a, b)
}

export function isNull(
    a: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.isNull(a)
}

export function isNotNull(
    a: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.isNotNull(a)
}

export function between(
    a: any,
    b: string,
    c: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.between(a, b, c)
}

export function betweenNumbers(
    a: any,
    b: any,
    c: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.betweenNumbers(a, b, c)
}

export function notBetween(
    a: any,
    b: string,
    c: string,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notBetween(a, b, c)
}

export function notBetweenNumbers(
    a: any,
    b: any,
    c: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.notBetweenNumbers(a, b, c)
}

export function ascending(
    a: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.ascending(a)
}

export function descending(
    a: any,
    dialect: AbstractDialect = new DefaultDialect()
) {
    return dialect.descending(a)
}
