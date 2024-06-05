import { QueryType } from '../query-params'
import { Query } from '../query'

export interface Connection {
    queryType: QueryType

    connect: () => Promise<any>
    disconnect: () => Promise<any>
    query: (
        query: Query
    ) => Promise<{ data: any; error: Error | null; query: string }>
}
