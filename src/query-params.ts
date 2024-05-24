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
