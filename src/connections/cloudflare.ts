import { Connection } from './index';

export class CloudflareD1Connection implements Connection {
    // The Cloudflare API key with D1 access
    apiKey: string | undefined;
    accountId: string | undefined;
    databaseId: string | undefined;

    /**
     * Creates a new CloudflareD1Connection object with the provided API key,
     * account ID, and database ID.
     * 
     * @param apiKey - The API key to be used for authentication.
     */
    constructor(apiKey: string, accountId: string, databaseId: string) {
        this.apiKey = apiKey;
        this.accountId = accountId;
        this.databaseId = databaseId;
    }

    /**
     * Performs a connect action on the current Connection object. 
     * In this particular use case Cloudflare is a REST API and
     * requires an API key for authentication.
     * 
     * @param details - Unused in the Cloudflare scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case Cloudflare is a REST API and does
     * not require a disconnect action.
     * 
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve();
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
    async query(query: string, parameters?: Record<string, any>[]): Promise<{ data: any, error: Error | null }> {
        if (!this.apiKey) throw new Error('Cloudflare API key is not set');
        if (!this.accountId) throw new Error('Cloudflare account ID is not set');
        if (!this.databaseId) throw new Error('Cloudflare database ID is not set');
        if (!query) throw new Error('A SQL query was not provided');

        /**
         * The Cloudflare API requires the query to be in the following format:
         * SELECT * FROM table WHERE property = ?
         * 
         * The parameters object should be an array of values that will replace
         * the `?` in the query in the order they appear. We need to manipulate
         * the query string to replace `:property` with `?` and extract the
         * property names to be used as keys in the parameters object.
         */
        let queryParameters = query.match(/:[a-zA-Z0-9]+/g) ?? []
        query = query.replace(/:[a-zA-Z0-9]+/g, '?')
        let params = queryParameters

        params.forEach((param, index) => {
            let key = param.replace(':', '')

            if (parameters && parameters.length > 0 && parameters[0].hasOwnProperty(key)) {
                params[index] = parameters[0][key]
            }
        })

        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                sql: query,
                params: params
            })
        });
        
        let json = await response.json()  
        
        let error = null
        const resultArray = await json?.result ?? []
        const items = await resultArray[0]?.results ?? []

        return {
            data: items,
            error: error
        };
    }
};