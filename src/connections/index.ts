import { Query } from '../query'

/**
 * Database queries are constructed either by named or positional parameters.
 * Named parameters are used to identify the parameter by name in the query
 * and are replaced by the value of the parameter. Positional parameters are
 * used to identify the parameter by position in the query and are replaced
 * by the value of the parameter.
 */
export enum QueryType {
    named = 'named',
    positional = 'positional',
}

export interface Connection {
    queryType?: QueryType

    connect: (details: Record<string, any>) => Promise<any>
    disconnect: () => Promise<any>
    query: (
        query: Query
    ) => Promise<{ data: any; error: Error | null; query: string }>
}
