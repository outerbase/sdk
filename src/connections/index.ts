/**
 * Database queries are constructed either by named or positional parameters.
 * Named parameters are used to identify the parameter by name in the query
 * and are replaced by the value of the parameter. Positional parameters are
 * used to identify the parameter by position in the query and are replaced
 * by the value of the parameter.
 */
export enum QueryType {
    named = 'named',
    positional = 'positional'
};

export interface Connection {
    queryType?: QueryType; // Default: `QueryType.named`

    connect: (details: Record<string, any>) => Promise<any>;
    disconnect: () => Promise<any>;
    query: (query: string, parameters?: Record<string, any>[]) => Promise<{ data: any, error: Error | null, query: string }>;
}
