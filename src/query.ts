import { QueryParamsPositional } from './query-params';

export type Query = {
    query: string;
    parameters?: unknown[];
};

function rawQueryFromPositionalParams(query: Query): string {
    const params = query.parameters as QueryParamsPositional;
    let queryWithParams = query.query;

    for (let i = 0; i < params.length; i++) {
        const currentParam = params[i];

        if (typeof currentParam === 'string') {
            queryWithParams = queryWithParams.replace('?', `'${params[i]}'`);
        } else {
            queryWithParams = queryWithParams.replace('?', params[i]);
        }
    }

    return queryWithParams;
}

export function constructRawQuery(query: Query) {
    return rawQueryFromPositionalParams(query);
}
