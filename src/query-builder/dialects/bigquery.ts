import { QueryBuilder } from 'src/client';
import { Query } from 'src/query';
import { QueryType } from 'src/query-params';
import { AbstractDialect } from '../index';

export class BigQueryDialect extends AbstractDialect {
    escapeCharacter: string = '`'

    select(builder: QueryBuilder, type: QueryType, query: Query): Query {
        let selectColumns = ''
        let fromTable = ''
        const joinClauses = builder.joins?.join(' ') || ''

        builder.columnsWithTable?.forEach((set, index) => {
            if (index > 0) {
                selectColumns += ', '
            }

            const schema = set.schema ? `${set.schema}.` : ''
            let useTable = this.reservedKeywords.includes(set.table)
                ? `"${set.table}"`
                : set.table

            const columns = set.columns.map((column) => {
                let useColumn = column

                if (this.reservedKeywords.includes(column)) {
                    useColumn = `"${column}"`
                }

                return `\`${schema ?? ''}${useTable}\`.${useColumn}`
            })

            selectColumns += columns.join(', ')

            if (index === 0) {
                fromTable = `\`${schema}${useTable}\``
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
}