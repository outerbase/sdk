import { QueryType } from '../query-params'
import { QueryBuilder } from '../client'
import { Query } from '../query'

interface Dialect {
    formatSchemaAndTable(schema: string | undefined, table: string): string

    select(builder: QueryBuilder, type: QueryType, query: Query): Query
    insert(builder: QueryBuilder, type: QueryType, query: Query): Query
    update(builder: QueryBuilder, type: QueryType, query: Query): Query
    delete(builder: QueryBuilder, type: QueryType, query: Query): Query

    // Table operations
    createTable(builder: QueryBuilder, type: QueryType, query: Query): Query
    dropTable(builder: QueryBuilder, type: QueryType, query: Query): Query
    renameTable(builder: QueryBuilder, type: QueryType, query: Query): Query

    // Column operations
    addColumn(builder: QueryBuilder, type: QueryType, query: Query): Query
    dropColumn(builder: QueryBuilder, type: QueryType, query: Query): Query
    renameColumn(builder: QueryBuilder, type: QueryType, query: Query): Query
    updateColumn(builder: QueryBuilder, type: QueryType, query: Query): Query

    // // // Index operations
    // createIndex?: (index: TableIndex, table: string, schema?: string) => Promise<OperationResponse>
    // dropIndex?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    // renameIndex?: (name: string, original: string, table: string, schema?: string) => Promise<OperationResponse>

    // // // Schema operations
    // createSchema?: (name: string) => Promise<OperationResponse>
    // dropSchema?: (name: string) => Promise<OperationResponse>

    equals(a: any, b: string): string
    equalsNumber(a: any, b: any): string
    equalsColumn(a: any, b: any): string
    notEquals(a: any, b: string): string
    notEqualsNumber(a: any, b: any): string
    notEqualsColumn(a: any, b: any): string
    greaterThan(a: any, b: string): string
    greaterThanNumber(a: any, b: any): string
    lessThan(a: any, b: string): string
    lessThanNumber(a: any, b: any): string
    greaterThanOrEqual(a: any, b: string): string
    greaterThanOrEqualNumber(a: any, b: any): string
    lessThanOrEqual(a: any, b: string): string
    lessThanOrEqualNumber(a: any, b: any): string
    inValues(a: any, b: any[]): string
    inNumbers(a: any, b: any[]): string
    notInValues(a: any, b: any[]): string
    notInNumbers(a: any, b: any[]): string
    is(current: any, a: any, b: string | null): string
    isNumber(a: any, b: any): string
    isNot(current: any, a: any, b: null): string
    isNotNumber(a: any, b: any): string
    like(a: any, b: string): string
    notLike(a: any, b: string): string
    ilike(a: any, b: string): string
    notILike(a: any, b: string): string
    isNull(a: any): string
    isNotNull(a: any): string
    between(a: any, b: string, c: string): string
    betweenNumbers(a: any, b: any, c: any): string
    notBetween(a: any, b: string, c: string): string
    notBetweenNumbers(a: any, b: any, c: any): string
    ascending(a: any): string
    descending(a: any): string
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
    /**
     * WORK IN PROGRESS!
     * This code is not used anywhere in the SDK at the moment. It is a work in progress to add support for SQL functions
     * in the query builder. The idea is to allow users to use SQL functions in their queries, and the query builder will
     * automatically format the query to use the correct SQL function for the specific database dialect.
     *
     * The `sqlFunctions` object is a map of SQL function names to their implementations. The `getFunction` method is used
     * to get the implementation of a specific SQL function. The `addFunction` method is used to add a new SQL function
     * to the `sqlFunctions` object.
     */
    protected sqlFunctions: { [key: string]: (...args: string[]) => string } = {
        now: () => 'NOW()',
        concat: (...args: string[]) => `CONCAT(${args.join(', ')})`,
        coalesce: (...args: string[]) => `COALESCE(${args.join(', ')})`,
        abs: (value: string) => `ABS(${value})`,
    }

    /**
     * Retrieves the implementation of the SQL function with the given name.
     *
     * @param funcName
     * @returns Returns the implementation of the SQL function with the given name.
     */
    getFunction(funcName: string): (...args: string[]) => string {
        if (this.sqlFunctions[funcName]) {
            return this.sqlFunctions[funcName]
        }
        throw new Error(
            `SQL function '${funcName}' not supported in this dialect.`
        )
    }

    /**
     * Adds a new SQL function to the `sqlFunctions` object. If a function with the same name already exists, it will be
     * overwritten with the new implementation.
     *
     * @param funcName
     * @param implementation
     */
    protected addFunction(
        funcName: string,
        implementation: (...args: string[]) => string
    ) {
        this.sqlFunctions[funcName] = implementation
    }

    /**
     * Maps the data type from the SDK to the equivalent data type for the specific database dialect.
     *
     * @param dataType
     * @returns Returns the equivalent data type for the specific database dialect.
     */
    mapDataType(dataType: ColumnDataType | string): string {
        switch (dataType) {
            case ColumnDataType.STRING:
                return 'VARCHAR'
            case ColumnDataType.NUMBER:
                return 'INTEGER'
            case ColumnDataType.BOOLEAN:
                return 'BOOLEAN'
            case ColumnDataType.DATE:
                return 'DATE'
            default:
                return dataType
        }
    }

    /**
     * Words that are reserved in the query language and may require special character wrapping to prevent
     * collisions with the database engine executing the query. Each dialect may need to override this property
     * with the reserved keywords for the specific database engine.
     */
    reservedKeywords: string[] = [
        'ADD',
        'ALL',
        'ALTER',
        'AND',
        'AS',
        'ASC',
        'BETWEEN',
        'BY',
        'CASE',
        'CHECK',
        'COLUMN',
        'CONSTRAINT',
        'CREATE',
        'DATABASE',
        'DEFAULT',
        'DELETE',
        'DESC',
        'DISTINCT',
        'DROP',
        'ELSE',
        'END',
        'EXISTS',
        'FOREIGN',
        'FROM',
        'FULL',
        'GROUP',
        'HAVING',
        'IF',
        'IN',
        'INDEX',
        'INNER',
        'INSERT',
        'INTO',
        'IS',
        'JOIN',
        'KEY',
        'LEFT',
        'LIKE',
        'LIMIT',
        'NOT',
        'NULL',
        'ON',
        'OR',
        'ORDER',
        'OUTER',
        'PRIMARY',
        'REFERENCES',
        'RIGHT',
        'SELECT',
        'SET',
        'TABLE',
        'THEN',
        'TO',
        'TOP',
        'UNION',
        'UNIQUE',
        'UPDATE',
        'VALUES',
        'VIEW',
        'WHERE',
        'USER'
    ]

    /**
     * Formats how the schema and table name should be used in the SELECT statement.
     *
     * @why When implementing support for BigQuery, the SELECT statement takes only a table name, where the FROM
     * statement takes the schema and table name. It also requires both the schema and name to be wrapped in
     * backticks together, and not separately. This method allows for formatting the schema and table name in a way
     * that is compatible with the specific database dialect.
     * See also - `formatFromSchemaAndTable`
     * @param schema The schema name (optional).
     * @param table The table name.
     * @returns The formatted schema and table combination.
     */
    formatSchemaAndTable(schema: string | undefined, table: string): string {
        table = this.reservedKeywords.includes(table.toUpperCase()) ? `"${table}"` : table

        if (schema) {
            return `"${schema}".${table}`
        }
        
        return table
    }

    /**
     * Formats how the schema and table name should be used in the FROM statement.
     *
     * @why When implementing support for BigQuery, the FROM statement takes a fully qualified schema and table name,
     * where the SELECT statement only takes the table name. It also requires both the schema and name to be wrapped
     * in backticks together, and not separately. This method allows for formatting the schema and table name in a way
     * that is compatible with the specific database dialect.
     * See also - `formatSchemaAndTable`
     * @param schema
     * @param table
     * @returns The formatted schema and table combination.
     */
    formatFromSchemaAndTable(
        schema: string | undefined,
        table: string
    ): string {
        table = this.reservedKeywords.includes(table.toUpperCase()) ? `"${table}"` : table
        if (schema) {
            return `"${schema}".${table}`
        }
        return table
    }

    select(builder: QueryBuilder, type: QueryType, query: Query): Query {
        let selectColumns = ''
        let fromTable = ''
        const joinClauses = builder.joins?.join(' ') || ''

        builder.columnsWithTable?.forEach((set, index) => {
            if (index > 0) {
                selectColumns += ', '
            }

            const formattedTable = this.formatSchemaAndTable(
                set.schema,
                set.table
            )
            const formattedFromTable = this.formatFromSchemaAndTable(
                set.schema,
                set.table
            )
            const columns = set.columns.map((column) => {
                let useColumn = column

                if (this.reservedKeywords.includes(column.toUpperCase())) {
                    useColumn = `"${column}"`
                }

                return `${formattedTable}.${useColumn}`
            })

            selectColumns += columns.join(', ')

            if (index === 0) {
                fromTable = formattedFromTable
            }
        })

        query.query = `SELECT ${selectColumns} ${builder.selectRawValue ? builder.selectRawValue : ''}FROM ${fromTable}`
        
        if (joinClauses) {
            query.query += ` ${joinClauses}`
        }

        if (builder.whereClauses?.length ?? 0 > 0) {
            query.query += ` WHERE ${builder?.whereClauses?.join(' AND ')}`
        }

        if (builder.orderBy !== undefined) {
            query.query += ` ORDER BY ${builder.orderBy}`
        }

        if (builder.limit !== undefined) {
            query.query += ` LIMIT ${builder.limit}`
            if (builder.offset) {
                query.query += ` OFFSET ${builder.offset}`
            }
        }

        if (builder.groupBy !== undefined) {
            query.query += ` GROUP BY ${builder.groupBy}`
        }

        return query
    }

    insert(builder: QueryBuilder, type: QueryType, query: Query): Query {
        const columns = Object.keys(builder.data || {})
        const placeholders =
            type === QueryType.named
                ? columns.map((column) => `:${column}`).join(', ')
                : columns.map(() => '?').join(', ')

        const formattedTable = this.formatSchemaAndTable(
            builder.schema,
            builder.table || ''
        )
        query.query = `INSERT INTO ${formattedTable} (${columns.join(
            ', '
        )}) VALUES (${placeholders})`

        if (type === QueryType.named) {
            query.parameters = builder.data ?? {}
        } else {
            query.parameters = Object.values(builder.data ?? {})
        }

        return query
    }

    update(builder: QueryBuilder, type: QueryType, query: Query): Query {
        if (!builder || !builder.whereClauses) {
            return query
        }

        const formattedTable = this.formatSchemaAndTable(
            builder.schema,
            builder.table || ''
        )
        const columnsToUpdate = Object.keys(builder.data || {})
        const setClauses =
            type === QueryType.named
                ? columnsToUpdate
                      .map((column) => `${column} = :${column}`)
                      .join(', ')
                : columnsToUpdate.map((column) => `${column} = ?`).join(', ')

        query.query = `UPDATE ${formattedTable} SET ${setClauses}`
        if (builder.whereClauses?.length > 0) {
            query.query += ` WHERE ${builder.whereClauses.join(' AND ')}`
        }

        if (type === QueryType.named) {
            query.parameters = builder.data ?? {}
        } else {
            query.parameters = Object.values(builder.data ?? {})
        }

        return query
    }

    delete(builder: QueryBuilder, type: QueryType, query: Query): Query {
        if (!builder.whereClauses || builder.whereClauses?.length === 0) {
            return query
        }

        const formattedTable = this.formatFromSchemaAndTable(
            builder.schema,
            builder.table || ''
        )
        query.query = `DELETE FROM ${formattedTable}`
        if (builder.whereClauses?.length > 0) {
            query.query += ` WHERE ${builder.whereClauses.join(' AND ')}`
        }

        return query
    }

    createTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        // if (!builder.createTable?.columns) {
        //     return query
        // }

        const formattedTable = this.formatSchemaAndTable(
            builder.schema,
            builder.table || ''
        )
        const columns =
            builder?.columns?.map((column) => {
                if (!column.type)
                    throw new Error('Column type is required to create table.')
                const dataType = this.mapDataType(column.type)

                return `${column.name} ${dataType}`

                // const constraints = column.constraints
                //     ? column.constraints.join(' ')
                //     : ''

                // return `${column.name} ${dataType} ${constraints}`
            }) ?? []

        query.query = `
            CREATE TABLE IF NOT EXISTS 
            ${formattedTable}
            (${columns.join(', ')})
        `

        return query
    }

    dropTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        query.query = `DROP TABLE IF EXISTS ${builder.schema ? `"${builder.schema}".` : ''}${builder.table}`
        return query
    }

    addColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        const { schema, table, columns } = builder

        if (!table || !columns || columns.length === 0) {
            throw new Error('Table and columns are required to add columns')
        }

        const formattedTable = this.formatSchemaAndTable(schema, table)

        const columnQueries = columns.map((col) => {
            if (!col.type)
                throw new Error('Column type is required to add a column.')
            const dataType = this.mapDataType(col.type)
            return `ALTER TABLE ${formattedTable} ADD ${col.name} ${dataType}`
        })

        query.query = columnQueries.join('; ')

        return query
    }

    dropColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        const { schema, table, columns } = builder

        if (!table || !columns || columns.length === 0) {
            throw new Error('Table and columns are required to drop columns')
        }

        const formattedTable = this.formatSchemaAndTable(schema, table)

        const columnQueries = columns.map((col) => {
            return `ALTER TABLE ${formattedTable} DROP COLUMN ${col.name}`
        })

        query.query = columnQueries.join('; ')

        return query
    }

    renameColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        const { schema, table, columns } = builder

        if (!table || !columns || columns.length === 0) {
            throw new Error('Table and columns are required to rename columns')
        }

        const formattedTable = this.formatSchemaAndTable(schema, table)

        const columnQueries = columns.map((col) => {
            if (!col.oldName || !col.newName) {
                throw new Error(
                    'Both old and new column names are required to rename columns'
                )
            }
            return `ALTER TABLE ${formattedTable} RENAME COLUMN ${col.oldName} TO ${col.newName}`
        })

        query.query = columnQueries.join('; ')

        return query
    }
    updateColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        const { schema, table, columns } = builder

        if (!table || !columns || columns.length === 0) {
            throw new Error('Table and columns are required to update columns')
        }

        const formattedTable = this.formatSchemaAndTable(schema, table)

        const columnQueries = columns.map((col) => {
            if (!col.name) {
                throw new Error('Column name is required to update a column.')
            }

            const columnUpdateParts: string[] = []

            if (col.type) {
                const dataType = this.mapDataType(col.type)
                columnUpdateParts.push(
                    `ALTER COLUMN ${col.name} TYPE ${dataType}`
                )
            }

            if (col.nullable) {
                columnUpdateParts.push(
                    `ALTER COLUMN ${col.name} ${col.nullable ? 'DROP' : 'SET'} NOT NULL`
                )
            }

            if (col.default) {
                columnUpdateParts.push(
                    `ALTER COLUMN ${col.name} SET DEFAULT ${col.default}`
                )
            }

            if (columnUpdateParts.length === 0) {
                throw new Error(
                    'No valid attributes provided to update the column.'
                )
            }

            return `ALTER TABLE ${formattedTable} ${columnUpdateParts.join(', ')}`
        })

        query.query = columnQueries.join('; ')

        return query
    }

    renameTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        query.query = `ALTER TABLE ${builder.schema ? `"${builder.schema}".` : ''}${builder.originalValue} RENAME TO ${builder.newValue}`
        return query
    }

    equals(a: any, b: string): string {
        return `${a} = '${b.replace(/'/g, "\\'")}'`
    }

    equalsNumber(a: any, b: any) {
        return `${a} = ${b}`
    }

    equalsColumn(a: any, b: any) {
        return `${a} = ${b}`
    }

    notEquals(a: any, b: string) {
        return `${a} != '${b.replace(/'/g, "\\'")}'`
    }

    notEqualsNumber(a: any, b: any) {
        return `${a} != ${b}`
    }

    notEqualsColumn(a: any, b: any) {
        return `${a} != ${b}`
    }

    greaterThan(a: any, b: string) {
        return `${a} > '${b.replace(/'/g, "\\'")}'`
    }

    greaterThanNumber(a: any, b: any) {
        return `${a} > ${b}`
    }

    lessThan(a: any, b: string) {
        return `${a} < '${b.replace(/'/g, "\\'")}'`
    }

    lessThanNumber(a: any, b: any) {
        return `${a} < ${b}`
    }

    greaterThanOrEqual(a: any, b: string) {
        return `${a} >= '${b.replace(/'/g, "\\'")}'`
    }

    greaterThanOrEqualNumber(a: any, b: any) {
        return `${a} >= ${b}`
    }

    lessThanOrEqual(a: any, b: string) {
        return `${a} <= '${b.replace(/'/g, "\\'")}'`
    }

    lessThanOrEqualNumber(a: any, b: any) {
        return `${a} <= ${b}`
    }

    inValues(a: any, b: any[]) {
        return `${a} IN ('${b.join("', '").replace(/'/g, "\\'")}')`
    }

    inNumbers(a: any, b: any[]) {
        return `${a} IN (${b.join(', ')})`
    }

    notInValues(a: any, b: any[]) {
        return `${a} NOT IN ('${b.join("', '").replace(/'/g, "\\'")}')`
    }

    notInNumbers(a: any, b: any[]) {
        return `${a} NOT IN (${b.join(', ')})`
    }

    is(current: any, a: any, b: string | null) {
        if (b === null) return `${current} IS NULL`
        return `${a} IS '${b.replace(/'/g, "\\'")}'`
    }

    isNumber(a: any, b: any) {
        return `${a} IS ${b}`
    }

    isNot(current: any, a: any, b: null) {
        if (b === null) return `${current} IS NOT NULL`
        return `${a} IS NOT ${b}`
    }

    isNotNumber(a: any, b: any) {
        return `${a} IS NOT ${b}`
    }

    like(a: any, b: string) {
        return `${a} LIKE '${b.replace(/'/g, "\\'")}'`
    }

    notLike(a: any, b: string) {
        return `${a} NOT LIKE '${b.replace(/'/g, "\\'")}'`
    }

    ilike(a: any, b: string) {
        return `${a} ILIKE '${b.replace(/'/g, "\\'")}'`
    }

    notILike(a: any, b: string) {
        return `${a} NOT ILIKE '${b.replace(/'/g, "\\'")}'`
    }

    isNull(a: any) {
        return `${a} IS NULL`
    }

    isNotNull(a: any) {
        return `${a} IS NOT NULL`
    }

    between(a: any, b: string, c: string) {
        return `${a} BETWEEN '${b.replace(/'/g, "\\'")}' AND '${c.replace(
            /'/g,
            "\\'"
        )}'`
    }

    betweenNumbers(a: any, b: any, c: any) {
        return `${a} BETWEEN ${b} AND ${c}`
    }

    notBetween(a: any, b: string, c: string) {
        return `${a} NOT BETWEEN '${b.replace(/'/g, "\\'")}' AND '${c.replace(
            /'/g,
            "\\'"
        )}'`
    }

    notBetweenNumbers(a: any, b: any, c: any) {
        return `${a} NOT BETWEEN ${b} AND ${c}`
    }

    ascending(a: any) {
        return `${a} ASC`
    }

    descending(a: any) {
        return `${a} DESC`
    }
}
