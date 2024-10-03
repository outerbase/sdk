import { QueryType } from '../../query-params'
import { QueryBuilder } from '../../client'
import { Query } from '../../query'
import { MongoClient, Collection, ObjectId } from 'mongodb'
import { AbstractDialect, ColumnDataType } from '../index'

export class MongoDialect extends AbstractDialect {
    reservedKeywords: string[] = []
    // protected sqlFunctions: { [key: string]: (...args: string[]) => string }

    getFunction(funcName: string): (...args: string[]) => string {
        throw new Error('Method not implemented.')
    }
    protected addFunction(
        funcName: string,
        implementation: (...args: string[]) => string
    ): void {
        throw new Error('Method not implemented.')
    }
    mapDataType(dataType: ColumnDataType | string): string {
        throw new Error('Method not implemented.')
    }

    formatSchemaAndTable(schema: string | undefined, table: string): string {
        throw new Error('Method not implemented.')
    }

    formatFromSchemaAndTable(
        schema: string | undefined,
        table: string
    ): string {
        throw new Error('Method not implemented.')
    }
    select(builder: QueryBuilder, type: QueryType, query: Query): Query {
        let selectColumns = ''
        let fromTable = ''

        const joinClauses = builder.joins?.join(' ') || ''

        builder.columnsWithTable?.forEach((set, index) => {
            // Some people who use sql might want to use *,
            // By passing no value into projection it selects all.
            selectColumns += set.columns
                .filter((x) => x && x !== '*')
                .map((columnName) => `"${columnName}": 1,`)
            // Remove last ,
            selectColumns = selectColumns.slice(0, -1)
            fromTable += set.table
        })

        query.query = `db.${fromTable}.find({}, {"projection": {${selectColumns}}})`

        if (builder.limit !== undefined) {
            query.query += `.limit(${builder.limit})`
        }

        if (builder.offset) {
            query.query += `.skip(${builder.offset})`
        }

        return query
    }

    insert(builder: QueryBuilder, type: QueryType, query: Query): Query {
        const columns = Object.keys(builder.data || {})
        const placeholders =
            type === QueryType.named
                ? columns.map((column) => `:${column}`).join(', ')
                : columns.map(() => '?').join(', ')

        query.query = `db.${builder.table}.insertOne(${JSON.stringify(builder.data)})`

        if (type === QueryType.named) {
            query.parameters = builder.data ?? {}
        } else {
            query.parameters = Object.values(builder.data ?? {})
        }

        return query
    }

    update(builder: QueryBuilder, type: QueryType, query: Query): Query {
        if (!builder.whereClauses || builder.whereClauses.length === 0) {
            throw new Error('Update operation requires a condition');
        }
    
        if (!builder.data || Object.keys(builder.data).length === 0) {
            throw new Error('Update operation requires data to update');
        }
    
        const whereObject = {} as any;
        builder.whereClauses.forEach((obj) => {
            const t = obj as any;
            const key = Object.keys(obj)[0];
            const value = t[key];
            whereObject[key] = value;
        });
    
        const updateObject = {
            $set: builder.data
        };
    
        query.query = `db.${builder.table}.updateOne(${JSON.stringify(whereObject)}, ${JSON.stringify(updateObject)})`;
    
        return query;
    }
    

    delete(builder: QueryBuilder, type: QueryType, query: Query): Query {
        if (!builder.whereClauses || builder.whereClauses.length === 0) {
            throw new Error('Delete operation requires a condition')
        }

        // Pass in ObjectId as a string
        // We will parse the actual function in the connection
        const whereObject = {} as any
        builder.whereClauses.forEach((obj) => {
            const t = obj as any
            const key = Object.keys(obj)[0]
            const value = t[key]
            whereObject[key] = value
        })

        query.query = `db.${builder.table}.deleteOne(${JSON.stringify(whereObject)})`

        return query
    }
    createTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    dropTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    addColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    dropColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    renameColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    updateColumn(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    renameTable(builder: QueryBuilder, type: QueryType, query: Query): Query {
        throw new Error('Method not implemented.')
    }
    // MongoDB query operator mappings
    equals(a: any, b: string): any {
        return { [a]: { $eq: b } }
    }

    equalsNumber(a: any, b: any): any {
        return { [a]: { $eq: b } }
    }

    equalsColumn(a: any, b: any): any {
        return { [a]: { $eq: b } }
    }

    notEquals(a: any, b: string): any {
        return { [a]: { $ne: b } }
    }

    notEqualsNumber(a: any, b: any): any {
        return { [a]: { $ne: b } }
    }

    notEqualsColumn(a: any, b: any): any {
        return { [a]: { $ne: b } }
    }

    greaterThan(a: any, b: string): any {
        return { [a]: { $gt: b } }
    }

    greaterThanNumber(a: any, b: any): any {
        return { [a]: { $gt: b } }
    }

    lessThan(a: any, b: string): any {
        return { [a]: { $lt: b } }
    }

    lessThanNumber(a: any, b: any): any {
        return { [a]: { $lt: b } }
    }

    greaterThanOrEqual(a: any, b: string): any {
        return { [a]: { $gte: b } }
    }

    greaterThanOrEqualNumber(a: any, b: any): any {
        return { [a]: { $gte: b } }
    }

    lessThanOrEqual(a: any, b: string): any {
        return { [a]: { $lte: b } }
    }

    lessThanOrEqualNumber(a: any, b: any): any {
        return { [a]: { $lte: b } }
    }

    inValues(a: any, b: any[]): any {
        return { [a]: { $in: b } }
    }

    inNumbers(a: any, b: any[]): any {
        return { [a]: { $in: b } }
    }

    notInValues(a: any, b: any[]): any {
        return { [a]: { $nin: b } }
    }

    notInNumbers(a: any, b: any[]): any {
        return { [a]: { $nin: b } }
    }

    is(current: any, a: any, b: string | null): any {
        return b === null ? { [a]: { $exists: false } } : { [a]: b }
    }

    isNumber(a: any, b: any): any {
        return { [a]: b }
    }

    isNot(current: any, a: any, b: null): any {
        return b === null ? { [a]: { $exists: true } } : { [a]: { $ne: b } }
    }

    isNotNumber(a: any, b: any): any {
        return { [a]: { $ne: b } }
    }

    like(a: any, b: string): any {
        return { [a]: { $regex: b, $options: 'i' } }
    }

    notLike(a: any, b: string): any {
        return { [a]: { $not: { $regex: b, $options: 'i' } } }
    }

    ilike(a: any, b: string): any {
        return { [a]: { $regex: b, $options: 'i' } }
    }

    notILike(a: any, b: string): any {
        return { [a]: { $not: { $regex: b, $options: 'i' } } }
    }

    isNull(a: any): any {
        return { [a]: { $exists: false } }
    }

    isNotNull(a: any): any {
        return { [a]: { $exists: true } }
    }

    between(a: any, b: string, c: string): any {
        return { [a]: { $gte: b, $lte: c } }
    }

    betweenNumbers(a: any, b: any, c: any): any {
        return { [a]: { $gte: b, $lte: c } }
    }

    notBetween(a: any, b: string, c: string): any {
        return { [a]: { $not: { $gte: b, $lte: c } } }
    }

    notBetweenNumbers(a: any, b: any, c: any): any {
        return { [a]: { $not: { $gte: b, $lte: c } } }
    }

    ascending(a: any): any {
        return { [a]: 1 }
    }

    descending(a: any): any {
        return { [a]: -1 }
    }
}
