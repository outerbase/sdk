import { Client } from '@neondatabase/serverless';
import { Connection } from './index';
import ws from 'ws';

export class NeonHttpConnection implements Connection {
    databaseUrl: string;
    client: Client;

    /**
     * Creates a new NeonHttpConnection object with the provided API key,
     * account ID, and database ID.
     * 
     * @param databaseUrl - The URL to the database to be used for the connection.
     */
    constructor(databaseUrl: string) {
        this.databaseUrl = databaseUrl;

        this.client = new Client(this.databaseUrl);
        this.client.neonConfig.webSocketConstructor = ws;
    }

    /**
     * Performs a connect action on the current Connection object.
     * 
     * @param details - Unused in the Neon scenario.
     * @returns Promise<any>
     */
    async connect(details: Record<string, any>): Promise<any> {
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
     * is a SQL query that will be executed on a Neon database.
     * 
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns Promise<{ data: any, error: Error | null }>
     */
    async query(query: string, parameters: Record<string, any>[] | undefined): Promise<{ data: any, error: Error | null }> {
        let items = null
        let error = null

        // TODO:
        // - Support an array of query params as a secondary argument
        
        try {
            // Perform the query in a transaction block
            await this.client.query('BEGIN');
            const { rows } = await this.client.query(query, []);
            items = rows;
            await this.client.query('COMMIT');
        } catch (error) {
            // Rollback the transaction if an error occurs
            await this.client.query('ROLLBACK');
            throw error;
        }

        return {
            data: items,
            error: error
        };
    }
};