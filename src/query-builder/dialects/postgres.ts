import { AbstractDialect, ColumnDataType } from '../index';
import { Query } from '../../query';
import { QueryBuilderInternal } from '../../client';
import { QueryType } from '../../query-params';

export class PostgresDialect extends AbstractDialect {
    // insert(
    //     builder: QueryBuilderInternal,
    //     type: QueryType,
    //     query: Query
    // ): Query {
    //     query = super.insert(builder, type, query);
    //     if (builder.returning?.length ?? 0 > 0) {
    //         query.query += ` RETURNING ${builder.returning?.join(', ')}`;
    //     }
    //     return query;
    // }
}
