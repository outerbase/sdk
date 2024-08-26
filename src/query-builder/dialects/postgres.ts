import { AbstractDialect, ColumnDataType } from '../index';
import { Query } from '../../query';
import { QueryBuilder } from '../../client';
import { QueryType } from '../../query-params';

export class PostgresDialect extends AbstractDialect {
    mapDataType(dataType: ColumnDataType): string {
        switch (dataType.toLowerCase()) {
            case ColumnDataType.STRING:
                return 'TEXT';
            default:
                return super.mapDataType(dataType);
        }
    }

    insert(builder: QueryBuilder, type: QueryType, query: Query): Query {
        query = super.insert(builder, type, query)

        if (builder.returning?.length ?? 0 > 0) {
            query.query += ` RETURNING ${builder.returning?.join(', ')}`
        }

        return query
    }
}