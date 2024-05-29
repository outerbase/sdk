import {
    QueryParams,
    QueryParamsPositional,
    isQueryParamsNamed,
    isQueryParamsPositional,
} from './query-params'

export type Query = {
    query: string
    parameters?: QueryParams
}

function rawQueryFromNamedParams(query: Query): string {
    let queryWithParams = query.query

    for (const [key, value] of Object.entries(query.parameters ?? {})) {
        if (typeof value === 'string') {
            queryWithParams = queryWithParams.replace(`:${key}`, `'${value}'`)
        } else {
            queryWithParams = queryWithParams.replace(`:${key}`, value)
        }
    }

    return queryWithParams
}

function rawQueryFromPositionalParams(query: Query): string {
    const params = query.parameters as QueryParamsPositional
    let queryWithParams = query.query

    for (let i = 0; i < params.length; i++) {
        const currentParam = params[i]

        if (typeof currentParam === 'string') {
            queryWithParams = queryWithParams.replace('?', `'${params[i]}'`)
        } else {
            queryWithParams = queryWithParams.replace('?', params[i])
        }
    }

    return queryWithParams
}

export function constructRawQuery(query: Query) {
    if (isQueryParamsNamed(query.parameters) || !query.parameters) {
        return rawQueryFromNamedParams(query)
    }

    // This isnt needed. Keeping it for posterity in case something changes
    // if (isQueryParamsPositional(query.parameters)) {
    return rawQueryFromPositionalParams(query)
}
