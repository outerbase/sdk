import { QueryType } from '../../query-params';
import { Query, constructRawQuery } from '../../query';
import { DefaultDialect } from '../../query-builder/dialects/default';
import { SqliteBaseConnection } from './base';
import { QueryResult } from '..';

export type StarbaseConnectionDetails = {
    url: string;
    apiKey: string;
};

export class StarbaseConnection extends SqliteBaseConnection {
    // The Starbase API key with
    url: string | undefined;
    apiKey: string | undefined;

    // Default query type to positional for Starbase
    queryType = QueryType.positional;

    // Default dialect for Starbase
    dialect = new DefaultDialect();

    /**
     * Creates a new StarbaseConnection object with the provided API key,
     * account ID, and database ID.
     *
     * @param apiKey - The API key to be used for authentication.
     * @param accountId - The account ID to be used for authentication.
     * @param databaseId - The database ID to be used for querying.
     */
    constructor(private _: StarbaseConnectionDetails) {
        super();
        this.url = _.url;
        this.apiKey = _.apiKey;
    }

    /**
     * Performs a connect action on the current Connection object.
     * In this particular use case Starbase is a REST API and
     * requires an API key for authentication.
     *
     * @param details - Unused in the Starbase scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case Starbase is a REST API and does
     * not require a disconnect action.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Triggers a query action on the current Connection object. The query
     * is a SQL query that will be executed on a Starbase durable object
     * database. The query is sent to the Starbase API and the response
     * is returned.
     *
     * The parameters object is sent along with the query to be used in the
     * query. By default if the query has parameters the SQL statement will
     * produce a string with `:property` values that the parameters object
     * keys should map to, and will be replaced by.
     *
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns Promise<{ data: any, error: Error | null }>
     */
    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        if (!this.url) throw new Error('Starbase URL is not set');
        if (!this.apiKey) throw new Error('Starbase API key is not set');
        if (!query) throw new Error('A SQL query was not provided');

        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                sql: query.query,
                params: query.parameters,
            }),
        });

        const json = await response.json();
        const rawSQL = constructRawQuery(query);

        if (json.result) {
            const items = json.result;

            return {
                data: items,
                error: null,
                query: rawSQL,
                headers: [],
            };
        }

        return {
            data: [],
            error: Error('Unknown operation error'),
            query: rawSQL,
            headers: [],
        };
    }
}
