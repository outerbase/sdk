import { QueryType } from '../query-params'
import { Query, constructRawQuery } from '../query'
import { Connection } from './index'

export class CloudflareD1Connection implements Connection {
    // The Cloudflare API key with D1 access
    apiKey: string | undefined
    accountId: string | undefined
    databaseId: string | undefined

    // Default query type to positional for Cloudflare
    queryType = QueryType.positional

    /**
     * Creates a new CloudflareD1Connection object with the provided API key,
     * account ID, and database ID.
     *
     * @param apiKey - The API key to be used for authentication.
     */
    constructor(apiKey: string, accountId: string, databaseId: string) {
        this.apiKey = apiKey
        this.accountId = accountId
        this.databaseId = databaseId
    }

    /**
     * Performs a connect action on the current Connection object.
     * In this particular use case Cloudflare is a REST API and
     * requires an API key for authentication.
     */
    async connect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case Cloudflare is a REST API and does
     * not require a disconnect action.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Triggers a query action on the current Connection object. The query
     * is a SQL query that will be executed on a D1 database in the Cloudflare
     * account. The query is sent to the Cloudflare API and the response
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
    async query(
        query: Query
    ): Promise<{ data: any; error: Error | null; query: string }> {
        if (!this.apiKey) throw new Error('Cloudflare API key is not set')
        if (!this.accountId) throw new Error('Cloudflare account ID is not set')
        if (!this.databaseId)
            throw new Error('Cloudflare database ID is not set')

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    sql: query.query,
                    params: query.parameters,
                }),
            }
        )

        let json = await response.json()
        let error = null
        const resultArray = json?.result ?? []
        const items = resultArray[0]?.results ?? []
        const rawSQL = constructRawQuery(query)

        return {
            data: items,
            error: error,
            query: rawSQL,
        }
    }
}
