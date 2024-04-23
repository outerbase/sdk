import { Connection } from '.';

export class OuterbaseConnection implements Connection {
    // The API key used for Outerbase authentication
    api_key: string | undefined;

    /**
     * Creates a new OuterbaseConnection object with the provided API key.
     * 
     * @param apiKey - The API key to be used for authentication.
     */
    constructor(private apiKey: string) {
        this.api_key = apiKey;
    }

    /**
     * Performs a connect action on the current Connection object. 
     * In this particular use case Outerbase is a REST API and
     * requires an API key for authentication.
     * 
     * @param details - Unused in the Outerbase scenario.
     * @returns Promise<any>
     */
    async connect(details: Record<string, any>): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case Outerbase is a REST API and does
     * not require a disconnect action.
     * 
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Triggers a query action on the current Connection object. The query
     * is a SQL query that will be executed on a source inside of the users
     * Outerbase account. The query is sent to the Outerbase API and the
     * response is returned.
     * 
     * The parameters object is sent along with the query to be used in the
     * query. By default if the query has parameters the SQL statement will
     * produce a string with `:property` values that the parameters object
     * keys should map to, and will be replaced by.
     * 
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns 
     */
    async query(query: string, parameters: Record<string, any>[]): Promise<{ data: any, error: Error | null }> {
        if (!this.api_key) throw new Error('Outerbase API key is not set');
        
        const response = await fetch('https://app.outerbase.com/api/v1/ezql/raw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Token': this.api_key
            },
            body: JSON.stringify({
                query: query,
                params: {
                    ...parameters
                },
                run: true
            })
        });

        
        let json = await response.json()
        let error = null
        let items = await json.response?.results?.items ?? []

        return {
            data: items,
            error: error
        };
    }

    async aiQuery(query: string): Promise<{ data: any, error: Error | null }> {
        if (!this.api_key) throw new Error('Outerbase API key is not set');

        return {
            data: [],
            error: null
        };
    }

    async runSavedQuery(queryId: string): Promise<{ data: any, error: Error | null }> {
        if (!this.api_key) throw new Error('Outerbase API key is not set');

        const response = await fetch(`https://app.outerbase.com/api/v1/ezql/query/${queryId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Token': this.api_key
            }
        });

        return {
            data: {},
            error: null
        }
    }
};