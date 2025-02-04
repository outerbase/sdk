import { QueryType } from '../../query-params';
import { Query } from '../../query';
import { DefaultDialect } from '../../query-builder/dialects/default';
import { SqliteBaseConnection } from './base';
import { Database } from './../../models/database';
import {
    createErrorResult,
    transformFromSdkTransform,
} from './../../utils/transformer';
import { QueryResult } from '..';
import { transformCloudflareD1 } from '@outerbase/sdk-transform';

interface CloudflareResult {
    results: {
        columns: string[];
        rows: unknown[][];
    };

    meta: {
        duration: number;
        changes: number;
        last_row_id: number;
        rows_read: number;
        rows_written: number;
    };
}

interface CloudflareResponse {
    success?: boolean;
    result: CloudflareResult[];
    error?: string;
    errors?: { code: number; message: string }[];
}

export type CloudflareD1ConnectionDetails = {
    apiKey: string;
    accountId: string;
    databaseId: string;
};

export class CloudflareD1Connection extends SqliteBaseConnection {
    // The Cloudflare API key with D1 access
    apiKey: string | undefined;
    accountId: string | undefined;
    databaseId: string | undefined;

    // Default query type to positional for Cloudflare
    queryType = QueryType.positional;

    // Default dialect for Cloudflare
    dialect = new DefaultDialect();

    /**
     * Creates a new CloudflareD1Connection object with the provided API key,
     * account ID, and database ID.
     *
     * @param apiKey - The API key to be used for authentication.
     * @param accountId - The account ID to be used for authentication.
     * @param databaseId - The database ID to be used for querying.
     */
    constructor(private _: CloudflareD1ConnectionDetails) {
        super();
        this.apiKey = _.apiKey;
        this.accountId = _.accountId;
        this.databaseId = _.databaseId;
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
    async internalQuery<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        if (!this.apiKey) throw new Error('Cloudflare API key is not set');
        if (!this.accountId)
            throw new Error('Cloudflare account ID is not set');
        if (!this.databaseId)
            throw new Error('Cloudflare database ID is not set');
        if (!query) throw new Error('A SQL query was not provided');

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/raw`,
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
        );

        const json: CloudflareResponse = await response.json();

        if (json.success) {
            return transformFromSdkTransform(
                transformCloudflareD1(json.result[0])
            );
        }

        return createErrorResult<T>(
            json.error ??
                json.errors?.map((e) => e.message).join(', ') ??
                'Unknown error'
        );
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        const result = await super.fetchDatabaseSchema();
        delete result.main['_cf_KV'];
        return result;
    }
}
