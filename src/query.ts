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

export function constructRawQuery(query: Query) {
    if (isQueryParamsNamed(query.parameters)) {
        // Replace named parameters with the actual values
        let queryWithParams = query.query

        for (const [key, value] of Object.entries(query.parameters)) {
            if (typeof value === 'string') {
                queryWithParams = queryWithParams.replace(
                    `:${key}`,
                    `'${value}'`
                )
            } else {
                queryWithParams = queryWithParams.replace(`:${key}`, value)
            }
        }

        return queryWithParams
    } else if (isQueryParamsPositional(query.parameters)) {
        // Replace question marks with the actual values in order from the parameters array
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

    return ''
}
