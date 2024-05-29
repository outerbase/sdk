import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals'

import { CloudflareD1Connection } from '../../src/connections/cloudflare'
import { QueryType } from '../../src/query-params'

import fetchMock from 'fetch-mock'
describe('CloudflareD1Connection', () => {
    test('Can connect', async () => {
        const connection = new CloudflareD1Connection(
            'API_KEY',
            'ACCOUNT_ID',
            'DATABASE_ID'
        )
        const actual = await connection.connect()
        expect(actual).toBe(undefined)
    })
    test('Can disconnect', async () => {
        const connection = new CloudflareD1Connection(
            'API_KEY',
            'ACCOUNT_ID',
            'DATABASE_ID'
        )
        const actual = await connection.disconnect()
        expect(actual).toBe(undefined)
    })
    describe('Query', () => {
        const mockApiKey = 'API_KEY'
        const mockAccountId = 'ACCOUNT_ID'
        const mockDatabaseId = 'DATABASE_ID'
        let connection: CloudflareD1Connection

        beforeEach(() => {
            connection = new CloudflareD1Connection(
                mockApiKey,
                mockAccountId,
                mockDatabaseId
            )
            fetchMock.reset()
        })

        afterEach(() => {
            jest.clearAllMocks()
        })

        const TEST_QUERY = {
            query: 'SELECT * FROM FAKE_TABLE;',
        }
        test('Should throw error when missing apiKey', async () => {
            connection.apiKey = undefined
            await expect(connection.query(TEST_QUERY)).rejects.toThrow(
                'Cloudflare API key is not set'
            )
        })
        test('Should throw error when missing accountId', async () => {
            connection.accountId = undefined
            await expect(connection.query(TEST_QUERY)).rejects.toThrow(
                'Cloudflare account ID is not set'
            )
        })
        test('Should throw error when missing databaseId', async () => {
            connection.databaseId = undefined
            await expect(connection.query(TEST_QUERY)).rejects.toThrow(
                'Cloudflare database ID is not set'
            )
        })
        test('Should return on successful response', async () => {
            const connection = new CloudflareD1Connection(
                'API_KEY',
                'ACCOUNT_ID',
                'DATABASE_ID'
            )
            fetchMock.postOnce(`*`, {
                body: {
                    result: [
                        {
                            results: 'hello world',
                        },
                    ],
                },
            })
            const actual = await connection.query(TEST_QUERY)
            const expected = {
                data: 'hello world',
                error: null,
                query: TEST_QUERY.query,
            }
            // Need to type the actual so I can pass it around
            expect(expected).toMatchObject(actual as any)
        })
        test('Should return on return empty array on no results', async () => {
            const connection = new CloudflareD1Connection(
                'API_KEY',
                'ACCOUNT_ID',
                'DATABASE_ID'
            )
            fetchMock.postOnce(`*`, {
                body: {},
            })
            const actual = await connection.query(TEST_QUERY)
            const expected = {
                data: [],
                error: null,
                query: TEST_QUERY.query,
            }

            expect(actual.data).toEqual([])
            expect(actual.error).toBeNull()
            expect(actual.query).toEqual(TEST_QUERY.query)
        })
        test('Should return on return empty array on no results', async () => {
            const connection = new CloudflareD1Connection(
                'API_KEY',
                'ACCOUNT_ID',
                'DATABASE_ID'
            )
            fetchMock.postOnce(`*`, {
                body: null,
            })
            const actual = await connection.query(TEST_QUERY)

            expect(actual.data).toEqual([])
            expect(actual.error).toBeNull()
            expect(actual.query).toEqual(TEST_QUERY.query)
        })
        test('Should return on successful response hey', async () => {
            const connection = new CloudflareD1Connection(
                'API_KEY',
                'ACCOUNT_ID',
                'DATABASE_ID'
            )
            fetchMock.postOnce(`*`, {
                body: {
                    result: [],
                },
            })
            const actual = await connection.query(TEST_QUERY)
            const expected = {
                data: [],
                error: null,
                query: TEST_QUERY.query,
            }
            // Need to type the actual so I can pass it around
            expect(expected).toMatchObject(actual as any)
        })
    })

    describe('Query Type', () => {
        const connection = new CloudflareD1Connection(
            'API_KEY',
            'ACCOUNT_ID',
            'DATABASE_ID'
        )

        test('Query type is set to positional', () => {
            expect(connection.queryType).toBe(QueryType.positional)
        })

        test('Query type is set not named', () => {
            expect(connection.queryType).not.toBe(QueryType.named)
        })
    })
})
