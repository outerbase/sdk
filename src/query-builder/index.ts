import { QueryType } from "../query-params";
import { QueryBuilder } from "../client";
import { Query } from "../query";

interface Dialect {
    select(builder: QueryBuilder, type: QueryType, query: Query): Query;
    insert(builder: QueryBuilder, type: QueryType, query: Query): Query;
    update(builder: QueryBuilder, type: QueryType, query: Query): Query;
    delete(builder: QueryBuilder, type: QueryType, query: Query): Query;

    // Table operations
    createTable(builder: QueryBuilder, type: QueryType, query: Query): Query;
    dropTable(builder: QueryBuilder, type: QueryType, query: Query): Query;
    renameTable(builder: QueryBuilder, type: QueryType, query: Query): Query;

    equals(a: any, b: string): string;
    equalsNumber(a: any, b: any): string;
    equalsColumn(a: any, b: any): string;
    notEquals(a: any, b: string): string;
    notEqualsNumber(a: any, b: any): string;
    notEqualsColumn(a: any, b: any): string;
    greaterThan(a: any, b: string): string;
    greaterThanNumber(a: any, b: any): string;
    lessThan(a: any, b: string): string;
    lessThanNumber(a: any, b: any): string;
    greaterThanOrEqual(a: any, b: string): string;
    greaterThanOrEqualNumber(a: any, b: any): string;
    lessThanOrEqual(a: any, b: string): string;
    lessThanOrEqualNumber(a: any, b: any): string;
    inValues(a: any, b: any[]): string;
    inNumbers(a: any, b: any[]): string;
    notInValues(a: any, b: any[]): string;
    notInNumbers(a: any, b: any[]): string;
    is(current: any, a: any, b: string | null): string;
    isNumber(a: any, b: any): string;
    isNot(current: any, a: any, b: null): string;
    isNotNumber(a: any, b: any): string;
    like(a: any, b: string): string;
    notLike(a: any, b: string): string;
    ilike(a: any, b: string): string;
    notILike(a: any, b: string): string;
    isNull(a: any): string;
    isNotNull(a: any): string;
    between(a: any, b: string, c: string): string;
    betweenNumbers(a: any, b: any, c: any): string;
    notBetween(a: any, b: string, c: string): string;
    notBetweenNumbers(a: any, b: any, c: any): string;
    ascending(a: any): string;
    descending(a: any): string;

    // Column operations
    // addColumn?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    // dropColumn?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    // renameColumn?: (name: string, original: string, table: string, schema?: string) => Promise<OperationResponse>
    // updateColumn?: (name: string, column: TableColumn, table: string, schema?: string) => Promise<OperationResponse>

    // // Index operations
    // createIndex?: (index: TableIndex, table: string, schema?: string) => Promise<OperationResponse>
    // dropIndex?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    // renameIndex?: (name: string, original: string, table: string, schema?: string) => Promise<OperationResponse>

    // // Schema operations
    // createSchema?: (name: string) => Promise<OperationResponse>
    // dropSchema?: (name: string) => Promise<OperationResponse>
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
    protected sqlFunctions: { [key: string]: (...args: string[]) => string } = {
        now: () => 'NOW()',
        concat: (...args: string[]) => `CONCAT(${args.join(', ')})`,
        coalesce: (...args: string[]) => `COALESCE(${args.join(', ')})`,
        abs: (value: string) => `ABS(${value})`,
    };

    getFunction(funcName: string): (...args: string[]) => string {
        if (this.sqlFunctions[funcName]) {
            return this.sqlFunctions[funcName];
        }
        throw new Error(`SQL function '${funcName}' not supported in this dialect.`);
    }

    // Allow specific dialects to add or override functions
    protected addFunction(funcName: string, implementation: (...args: string[]) => string) {
        this.sqlFunctions[funcName] = implementation;
    }

    // Maps generic data types to database-specific data types
    mapDataType(dataType: ColumnDataType | string): string {
        switch (dataType) {
            case ColumnDataType.STRING:
                return 'VARCHAR';
            case ColumnDataType.NUMBER:
                return 'INTEGER';
            case ColumnDataType.BOOLEAN:
                return 'BOOLEAN';
            case ColumnDataType.DATE:
                return 'DATE';
            default:
                return dataType;
        }
    }

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
    ];

    select(builder: QueryBuilder, type: QueryType, query: Query): Query {
        let selectColumns = ''
        let fromTable = ''
        const joinClauses = builder.joins?.join(' ') || ''

        builder.columnsWithTable?.forEach((set, index) => {
            if (index > 0) {
                selectColumns += ', '
            }

            const schema = set.schema ? `"${set.schema}".` : ''
            let useTable = this.reservedKeywords.includes(set.table)
                ? `"${set.table}"`
                : set.table

            const columns = set.columns.map((column) => {
                let useColumn = column

                if (this.reservedKeywords.includes(column)) {
                    useColumn = `"${column}"`
                }

                return `${schema ?? ''}${useTable}.${useColumn}`
            })

            selectColumns += columns.join(', ')

            if (index === 0) {
                fromTable = `${schema}${useTable}`
            }
        })

        query.query = `SELECT ${selectColumns} FROM ${fromTable}`

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

        query.query = `INSERT INTO ${builder.schema ? `"${builder.schema}".` : ''}${builder.table || ''} (${columns.join(
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

        const columnsToUpdate = Object.keys(builder.data || {})
        const setClauses =
            type === QueryType.named
                ? columnsToUpdate
                      .map((column) => `${column} = :${column}`)
                      .join(', ')
                : columnsToUpdate
                      .map((column) => `${column} = ?`)
                      .join(', ')

        query.query = `UPDATE ${builder.schema ? `"${builder.schema}".` : ''}${builder.table || ''} SET ${setClauses}`
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
        if (
            !builder.whereClauses ||
            builder.whereClauses?.length === 0
        ) {
            return query
        }

        query.query = `DELETE FROM ${builder.schema ? `"${builder.schema}".` : ''}${builder.table || ''}`
        if (builder.whereClauses?.length > 0) {
            query.query += ` WHERE ${builder.whereClauses.join(' AND ')}`
        }

        return query
    }

    createTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        // if (!builder.createTable?.columns) {
        //     return query
        // }

        const columns = builder?.columns?.map((column) => {
            const dataType = this.mapDataType(column.type)

            return `${column.name} ${dataType}`

            // const constraints = column.constraints
            //     ? column.constraints.join(' ')
            //     : ''

            // return `${column.name} ${dataType} ${constraints}`
        }) ?? []

        query.query = `
            CREATE TABLE IF NOT EXISTS 
            ${builder.schema ? `"${builder.schema}".` : ''}${builder.table} 
            (${columns.join(', ')})
        `

        return query
    }

    dropTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        query.query = `DROP TABLE IF EXISTS ${builder.schema ? `"${builder.schema}".` : ''}${builder.table}`
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
