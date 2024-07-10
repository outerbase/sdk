import { Client } from '@neondatabase/serverless';
import ws from 'ws';
import { Connection } from './index';
import { Query, constructRawQuery } from '../query';
import { QueryParamsPositional, QueryType } from '../query-params';

export type NeonConnectionDetails = {
    databaseUrl: string
};

export class NeonHttpConnection implements Connection {
    databaseUrl: string;
    client: Client;
    
    // Default query type to named for Outerbase
    queryType = QueryType.positional

    /**
     * Creates a new NeonHttpConnection object with the provided API key,
     * account ID, and database ID.
     * 
     * @param databaseUrl - The URL to the database to be used for the connection.
     */
    constructor(private _: NeonConnectionDetails) {
        this.databaseUrl = _.databaseUrl;

        this.client = new Client(this.databaseUrl);
        this.client.neonConfig.webSocketConstructor = ws;
    }

    /**
     * Performs a connect action on the current Connection object.
     * 
     * @param details - Unused in the Neon scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return this.client.connect();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * 
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return this.client.end();
    }

    /**
     * Triggers a query action on the current Connection object. The query
     * is a SQL query that will be executed on a Neon database. Neon's driver
     * requires positional parameters to be used in the specific format of `$1`,
     * `$2`, etc. The query is sent to the Neon database and the response is returned.
     * 
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns Promise<{ data: any, error: Error | null }>
     */
    async query(query: Query): Promise<{ data: any; error: Error | null; query: string }> {
        let items = null
        let error = null

        // Replace all `?` with `$1`, `$2`, etc.
        let index = 0;
        const formattedQuery = query.query.replace(/\?/g, () => `$${++index}`);

        try {
            await this.client.query('BEGIN');
            const { rows } = await this.client.query(formattedQuery, query.parameters as QueryParamsPositional);
            items = rows;
            await this.client.query('COMMIT');
        } catch (error) {
            await this.client.query('ROLLBACK');
            throw error;
        }

        const rawSQL = constructRawQuery(query)

        return {
            data: items,
            error: error,
            query: rawSQL
        };
    }
};