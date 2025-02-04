/**
 * Provides several functions to help transform common
 * database result format into our own query result formation
 */

import { ColumnHeader, ResultSet } from '@outerbase/sdk-transform';
import { QueryResult } from './../connections';

export function transformFromSdkTransform<T>(
    result: ResultSet
): QueryResult<T> {
    const { rows, ...rest } = result;

    return {
        data: rows as T[],
        error: null,
        query: '',
        ...rest,
    };
}

export function createErrorResult<T = unknown>(
    message: string
): QueryResult<T> {
    return {
        data: [],
        error: { message, name: 'Error' },
        query: '',
        headers: [],
        stat: {
            queryDurationMs: 0,
            rowsAffected: 0,
            rowsRead: 0,
            rowsWritten: 0,
        },
    };
}

export function transformObjectBasedResult(
    arr: Record<string, unknown>[]
): QueryResult {
    const usedColumnName = new Set();
    const columns: ColumnHeader[] = [];

    // Build the headers based on rows
    arr.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (!usedColumnName.has(key)) {
                usedColumnName.add(key);
                columns.push({
                    name: key,
                    displayName: key,
                    originalType: null,
                });
            }
        });
    });

    return {
        data: arr,
        headers: columns,
        error: null,
        query: '',
        stat: {
            queryDurationMs: 0,
            rowsAffected: 0,
            rowsRead: 0,
            rowsWritten: 0,
        },
    };
}

export function transformObjectBasedResultFirstRow(
    arr: Record<string, unknown>[]
): QueryResult {
    if (arr.length === 0) {
        return {
            data: [],
            headers: [],
            error: null,
            query: '',
            stat: {
                queryDurationMs: 0,
                rowsAffected: 0,
                rowsRead: 0,
                rowsWritten: 0,
            },
        };
    }

    const row = arr[0];
    const columns: ColumnHeader[] = [];

    return {
        data: arr,
        headers: Object.keys(row).map((key) => ({
            name: key,
            displayName: key,
            originalType: null,
        })),
        error: null,
        query: '',
        stat: {
            queryDurationMs: 0,
            rowsAffected: 0,
            rowsRead: 0,
            rowsWritten: 0,
        },
    };
}

export function createOkResult() {
    return {
        data: [],
        error: null,
        query: '',
        headers: [],
        stat: {
            queryDurationMs: 0,
            rowsAffected: 0,
            rowsRead: 0,
            rowsWritten: 0,
        },
    };
}
