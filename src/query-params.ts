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

export type QueryParamsNamed = Record<string, any>
export type QueryParamsPositional = any[]
export type QueryParams = QueryParamsNamed | QueryParamsPositional

export function isQueryParamsNamed(
    params?: QueryParams
): params is QueryParamsNamed {
    return typeof params === 'object' && !Array.isArray(params)
}

export function isQueryParamsPositional(
    params?: QueryParams
): params is QueryParamsPositional {
    return Array.isArray(params)
}
