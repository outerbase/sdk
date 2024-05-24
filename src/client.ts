import { Connection, QueryType } from './connections'

type QueryParamsNamed = Record<string, any>
type QueryParamsPositional = any[]

interface QueryBuilder {
    action: 'select' | 'insert' | 'update' | 'delete'
    table?: string // Used for INSERT, UPDATE, DELETE
    columnsWithTable?: { schema?: string; table: string; columns: string[] }[] // Used for SELECT
    whereClauses?: string[]
    joins?: string[]
    data?: { [key: string]: any }
    limit?: number
    offset?: number | null
    orderBy?: string
    returning?: string[]
    asClass?: any
    groupBy?: string
}

export interface OuterbaseType {
    queryBuilder: QueryBuilder
    selectFrom: (
        columnsArray: { schema?: string; table: string; columns: string[] }[]
    ) => OuterbaseType
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
    returning: (columns: string[]) => OuterbaseType
    asClass: (classType: any) => OuterbaseType
    query: () => Promise<any>
    queryRaw: (
        query: string,
        parameters?: Record<string, any>[]
    ) => Promise<any>
    groupBy: (column: string) => OuterbaseType
    toString: () => string
}

export function Outerbase(connection: Connection): OuterbaseType {
    const outerbase: OuterbaseType = {
        queryBuilder: { action: 'select' },
        selectFrom(columnsArray) {
            this.queryBuilder = {
                action: 'select',
                columnsWithTable: [],
                whereClauses: [],
                joins: [],
            }

            this.queryBuilder.columnsWithTable = columnsArray

            return this
        },
        where(condition) {
            if (this.queryBuilder.whereClauses)
                this.queryBuilder.whereClauses.push(condition)
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
        insert(data) {
            this.queryBuilder = {
                action: 'insert',
                data: data,
            }
            return this
        },
        update(data) {
            this.queryBuilder = {
                action: 'update',
                data: data,
                whereClauses: [],
            }
            return this
        },
        into(table) {
            this.queryBuilder.table = table
            return this
        },
        deleteFrom(table) {
            this.queryBuilder = {
                action: 'delete',
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
            const { query, queryParams } = buildQueryString(this.queryBuilder)
            return constructRawQuery(query, queryParams[0], QueryType.named)
        },
        async query() {
            const { query, queryParams } = buildQueryString(this.queryBuilder)

            // If asClass is set, map the response to the class
            if (this.queryBuilder.asClass) {
                const response = await connection.query(query, queryParams)
                let result = mapToClass(
                    response?.data,
                    this.queryBuilder.asClass
                )
                return {
                    data: result,
                    error: response.error,
                    query,
                }
            }

            // Otherwise, if asClass is not set, return the raw response
            let response = await connection.query(query, queryParams)
            return {
                ...response,
                query,
            }
        },
        async queryRaw(query, parameters) {
            // If asClass is set, map the response to the class
            if (this.queryBuilder.asClass) {
                const response = await connection.query(query, parameters)
                let result = mapToClass(
                    response?.data,
                    this.queryBuilder.asClass
                )
                return {
                    data: result,
                    error: response.error,
                    query,
                }
            }

            // Otherwise, if asClass is not set, return the raw response
            let response = await connection.query(query, parameters)
            return {
                ...response,
                query,
            }
        },
    }

    return outerbase
}

export function constructPositionalQuery(
    query: string,
    parameters?: Record<string, any>[]
): { query: string; params: QueryParamsPositional } {
    let queryParameters = query.match(/:[\w]+/g) ?? []
    query = query.replace(/:[\w]+/g, '?')
    let params = queryParameters

    params.forEach((param, index) => {
        let key = param.replace(':', '')

        if (
            parameters &&
            parameters.length > 0 &&
            parameters[0].hasOwnProperty(key)
        ) {
            params[index] = parameters[0][key]
        }
    })

    return { query, params }
}

export function constructRawQuery(
    query: string,
    parameters: QueryParamsNamed | QueryParamsPositional,
    method: QueryType
) {
    if (method === QueryType.named) {
        // Replace named parameters with the actual values
        let queryWithParams = query
        for (const [key, value] of Object.entries(parameters)) {
            if (typeof value === 'string') {
                queryWithParams = queryWithParams.replace(
                    `:${key}`,
                    `'${value}'`
                )
            } else {
                queryWithParams = queryWithParams.replace(`:${key}`, value)
            }
        }

        return queryWithParams
    } else if (method === QueryType.positional) {
        // Replace question marks with the actual values in order from the parameters array
        const params = parameters as QueryParamsPositional
        let queryWithParams = query
        for (let i = 0; i < params.length; i++) {
            const currentParam = params[i]

            if (typeof currentParam === 'string') {
                queryWithParams = queryWithParams.replace('?', `'${params[i]}'`)
            } else {
                queryWithParams = queryWithParams.replace('?', params[i])
            }
        }

        return queryWithParams
    }

    return ''
}

function buildQueryString(queryBuilder: QueryBuilder): {
    query: string
    queryParams: any[]
} {
    let query = ''
    let queryParams: any[] = []

    switch (queryBuilder.action) {
        case 'select':
            const joinClauses = queryBuilder.joins?.join(' ') || ''
            let selectColumns = ''
            let fromTable = ''

            queryBuilder.columnsWithTable?.forEach((set, index) => {
                if (index > 0) {
                    selectColumns += ', '
                }

                const schema = set.schema ? `"${set.schema}".` : ''
                let useTable = isReservedKeyword(set.table)
                    ? `"${set.table}"`
                    : set.table

                const columns = set.columns.map((column) => {
                    let useColumn = column

                    if (isReservedKeyword(column)) {
                        useColumn = `"${column}"`
                    }

                    return `${schema ?? ''}${useTable}.${useColumn}`
                })

                selectColumns += columns.join(', ')

                if (index === 0) {
                    fromTable = `${schema}${useTable}`
                }
            })

            query = `SELECT ${selectColumns} FROM ${fromTable} ${joinClauses}`

            if (queryBuilder.whereClauses?.length ?? 0 > 0) {
                query += ` WHERE ${queryBuilder?.whereClauses?.join(' AND ')}`
            }

            if (queryBuilder.orderBy !== undefined) {
                query += ` ORDER BY ${queryBuilder.orderBy}`
            }

            if (queryBuilder.limit !== undefined) {
                query += ` LIMIT ${queryBuilder.limit}`
                if (queryBuilder.offset) {
                    query += ` OFFSET ${queryBuilder.offset}`
                }
            }

            if (queryBuilder.groupBy !== undefined) {
                query += ` GROUP BY ${queryBuilder.groupBy}`
            }

            break
        case 'insert':
            const columns = Object.keys(queryBuilder.data || {})
            const placeholders = columns
                .map((column) => `:${column}`)
                .join(', ')
            query = `INSERT INTO ${queryBuilder.table || ''} (${columns.join(
                ', '
            )}) VALUES (${placeholders})`
            queryParams.push(queryBuilder.data)

            if (queryBuilder.returning?.length ?? 0 > 0) {
                query += ` RETURNING ${queryBuilder.returning?.join(', ')}`
            }

            break
        case 'update':
            if (!queryBuilder || !queryBuilder.whereClauses) {
                break
            }

            const columnsToUpdate = Object.keys(queryBuilder.data || {})
            const setClauses = columnsToUpdate
                .map((column) => `${column} = :${column}`)
                .join(', ')
            query = `UPDATE ${queryBuilder.table || ''} SET ${setClauses}`
            if (queryBuilder.whereClauses?.length > 0) {
                query += ` WHERE ${queryBuilder.whereClauses.join(' AND ')}`
            }
            queryParams.push(queryBuilder.data)
            break
        case 'delete':
            // For `DELETE` operations we want to enforce a `WHERE` clause to ensure
            // that we are not deleting all records in a table.
            if (!queryBuilder.whereClauses) {
                break
            }

            query = `DELETE FROM ${queryBuilder.table || ''}`
            if (queryBuilder.whereClauses?.length > 0) {
                query += ` WHERE ${queryBuilder.whereClauses.join(' AND ')}`
            }
            break
        default:
            throw new Error('Invalid action')
    }

    return { query, queryParams }
}

function mapToClass<T>(data: any | any[], ctor: new (data: any) => T): T | T[] {
    if (Array.isArray(data)) {
        let array = data.map((item) => new ctor(item))
        return array
    } else {
        return new ctor(data)
    }
}

function isReservedKeyword(keyword: string) {
    const reservedWords = [
        'ABORT',
        'DECIMAL',
        'INTERVAL',
        'PRESERVE',
        'ALL',
        'DECODE',
        'INTO',
        'PRIMARY',
        'ALLOCATE',
        'DEFAULT',
        'LEADING',
        'RESET',
        'ANALYSE',
        'DESC',
        'LEFT',
        'REUSE',
        'ANALYZE',
        'DISTINCT',
        'LIKE',
        'RIGHT',
        'AND',
        'DISTRIBUTE',
        'LIMIT',
        'ROWS',
        'ANY',
        'DO',
        'LOAD',
        'SELECT',
        'AS',
        'ELSE',
        'LOCAL',
        'SESSION_USER',
        'ASC',
        'END',
        'LOCK',
        'SETOF',
        'BETWEEN',
        'EXCEPT',
        'MINUS',
        'SHOW',
        'BINARY',
        'EXCLUDE',
        'MOVE',
        'SOME',
        'BIT',
        'EXISTS',
        'NATURAL',
        'TABLE',
        'BOTH',
        'EXPLAIN',
        'NCHAR',
        'THEN',
        'CASE',
        'EXPRESS',
        'NEW',
        'TIES',
        'CAST',
        'EXTEND',
        'NOT',
        'TIME',
        'CHAR',
        'EXTERNAL',
        'NOTNULL',
        'TIMESTAMP',
        'CHARACTER',
        'EXTRACT',
        'NULL',
        'TO',
        'CHECK',
        'FALSE',
        'NULLS',
        'TRAILING',
        'CLUSTER',
        'FIRST',
        'NUMERIC',
        'TRANSACTION',
        'COALESCE',
        'FLOAT',
        'NVL',
        'TRIGGER',
        'COLLATE',
        'FOLLOWING',
        'NVL2',
        'TRIM',
        'COLLATION',
        'FOR',
        'OFF',
        'TRUE',
        'COLUMN',
        'FOREIGN',
        'OFFSET',
        'UNBOUNDED',
        'CONSTRAINT',
        'FROM',
        'OLD',
        'UNION',
        'COPY',
        'FULL',
        'ON',
        'UNIQUE',
        'CROSS',
        'FUNCTION',
        'ONLINE',
        'USER',
        'CURRENT',
        'GENSTATS',
        'ONLY',
        'USING',
        'CURRENT_CATALOG',
        'GLOBAL',
        'OR',
        'VACUUM',
        'CURRENT_DATE',
        'GROUP',
        'ORDER',
        'VARCHAR',
        'CURRENT_DB',
        'HAVING',
        'OTHERS',
        'VERBOSE',
        'CURRENT_SCHEMA',
        'IDENTIFIER_CASE',
        'OUT',
        'VERSION',
        'CURRENT_SID',
        'ILIKE',
        'OUTER',
        'VIEW',
        'CURRENT_TIME',
        'IN',
        'OVER',
        'WHEN',
        'CURRENT_TIMESTAMP',
        'INDEX',
        'OVERLAPS',
        'WHERE',
        'CURRENT_USER',
        'INITIALLY',
        'PARTITION',
        'WITH',
        'CURRENT_USERID',
        'INNER',
        'POSITION',
        'WRITE',
        'CURRENT_USEROID',
        'INOUT',
        'PRECEDING',
        'RESET',
        'DEALLOCATE',
        'INTERSECT',
        'PRECISION',
        'REUSE',
        'DEC',
    ]

    return reservedWords.includes(keyword?.toUpperCase())
}

export function equals(a: any, b: string) {
    return `${a} = '${b.replace(/'/g, "\\'")}'`
}

export function equalsNumber(a: any, b: any) {
    return `${a} = ${b}`
}

export function equalsColumn(a: any, b: any) {
    return `${a} = ${b}`
}

export function notEquals(a: any, b: string) {
    return `${a} != '${b.replace(/'/g, "\\'")}'`
}

export function notEqualsNumber(a: any, b: any) {
    return `${a} != ${b}`
}

export function notEqualsColumn(a: any, b: any) {
    return `${a} != ${b}`
}

export function greaterThan(a: any, b: string) {
    return `${a} > '${b.replace(/'/g, "\\'")}'`
}

export function greaterThanNumber(a: any, b: any) {
    return `${a} > ${b}`
}

export function lessThan(a: any, b: string) {
    return `${a} < '${b.replace(/'/g, "\\'")}'`
}

export function lessThanNumber(a: any, b: any) {
    return `${a} < ${b}`
}

export function greaterThanOrEqual(a: any, b: string) {
    return `${a} >= '${b.replace(/'/g, "\\'")}'`
}

export function greaterThanOrEqualNumber(a: any, b: any) {
    return `${a} >= ${b}`
}

export function lessThanOrEqual(a: any, b: string) {
    return `${a} <= '${b.replace(/'/g, "\\'")}'`
}

export function lessThanOrEqualNumber(a: any, b: any) {
    return `${a} <= ${b}`
}

export function inValues(a: any, b: any[]) {
    return `${a} IN ('${b.join("', '").replace(/'/g, "\\'")}')`
}

export function inNumbers(a: any, b: any[]) {
    return `${a} IN (${b.join(', ')})`
}

export function notInValues(a: any, b: any[]) {
    return `${a} NOT IN ('${b.join("', '").replace(/'/g, "\\'")}')`
}

export function notInNumbers(a: any, b: any[]) {
    return `${a} NOT IN (${b.join(', ')})`
}

export function is(this: any, a: any, b: string | null) {
    if (b === null) return `${this} IS NULL`
    return `${a} IS '${b.replace(/'/g, "\\'")}'`
}

export function isNumber(a: any, b: any) {
    return `${a} IS ${b}`
}

export function isNot(this: any, a: any, b: null) {
    if (b === null) return `${this} IS NOT NULL`
    return `${a} IS NOT ${b}`
}

export function isNotNumber(a: any, b: any) {
    return `${a} IS NOT ${b}`
}

export function like(a: any, b: string) {
    return `${a} LIKE '${b.replace(/'/g, "\\'")}'`
}

export function notLike(a: any, b: string) {
    return `${a} NOT LIKE '${b.replace(/'/g, "\\'")}'`
}

export function ilike(a: any, b: string) {
    return `${a} ILIKE '${b.replace(/'/g, "\\'")}'`
}

export function notILike(a: any, b: string) {
    return `${a} NOT ILIKE '${b.replace(/'/g, "\\'")}'`
}

export function isNull(a: any) {
    return `${a} IS NULL`
}

export function isNotNull(a: any) {
    return `${a} IS NOT NULL`
}

export function between(a: any, b: string, c: string) {
    return `${a} BETWEEN '${b.replace(/'/g, "\\'")}' AND '${c.replace(
        /'/g,
        "\\'"
    )}'`
}

export function betweenNumbers(a: any, b: any, c: any) {
    return `${a} BETWEEN ${b} AND ${c}`
}

export function notBetween(a: any, b: string, c: string) {
    return `${a} NOT BETWEEN '${b.replace(/'/g, "\\'")}' AND '${c.replace(
        /'/g,
        "\\'"
    )}'`
}

export function notBetweenNumbers(a: any, b: any, c: any) {
    return `${a} NOT BETWEEN ${b} AND ${c}`
}

export function ascending(a: any) {
    return `${a} ASC`
}

export function descending(a: any) {
    return `${a} DESC`
}
