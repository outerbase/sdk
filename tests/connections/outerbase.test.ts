import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals'

import { OuterbaseConnection } from '../../src/connections/outerbase'
import { QueryType } from '../../src/query-params'

import fetchMock from 'fetch-mock'
describe('OuterbaseConnection', () => {
    test('Can connect', async () => {
        const connection = new OuterbaseConnection('API_KEY')
        const actual = await connection.connect({ more: 'details' })
        expect(actual).toBe(undefined)
    })
    test('Can disconnect', async () => {
        const connection = new OuterbaseConnection('API_KEY')
        const actual = await connection.disconnect()
        expect(actual).toBe(undefined)
    })
    describe('Query', () => {
        const mockApiKey = 'API_KEY'
        let connection: OuterbaseConnection

        beforeEach(() => {
            connection = new OuterbaseConnection(mockApiKey)
            fetchMock.reset()
        })

        afterEach(() => {
            jest.clearAllMocks()
        })

        const TEST_QUERY = {
            query: 'SELECT * FROM FAKE_TABLE;',
        }
        test('Should throw error when missing apiKey', async () => {
            connection.api_key = undefined
            await expect(connection.query(TEST_QUERY)).rejects.toThrow(
                'Outerbase API key is not set'
            )
        })
        test('Should return on successful response', async () => {
            const connection = new OuterbaseConnection('API_KEY')
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
                data: [],
                error: null,
                query: TEST_QUERY.query,
            }
            // Need to type the actual so I can pass it around
            expect(expected).toMatchObject(actual as any)
        })
        test('Should return on return empty array on no results', async () => {
            const connection = new OuterbaseConnection('API_KEY')
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
            const connection = new OuterbaseConnection('API_KEY')
            fetchMock.postOnce(`*`, {
                body: null,
            })
            const actual = await connection.query(TEST_QUERY)

            expect(actual.data).toEqual([])
            expect(actual.error).toBeNull()
            expect(actual.query).toEqual(TEST_QUERY.query)
        })
        test('Should return on successful response hey', async () => {
            const connection = new OuterbaseConnection('API_KEY')
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
    describe('Run Saved Query', () => {
        beforeEach(() => {
            fetchMock.reset()
        })
        const TEST_QUERY = 'SELECT * FROM FAKE_TABLE;'

        test('Should fail if the key isnt set', async () => {
            const connection = new OuterbaseConnection('API_KEY')
            connection.api_key = undefined
            await expect(connection.runSavedQuery(TEST_QUERY)).rejects.toThrow(
                'Outerbase API key is not set'
            )
        })
        test('Should run a saved query', async () => {
            const connection = new OuterbaseConnection('API_KEY')
            fetchMock.postOnce(`*`, {
                body: {
                    response: {
                        results: {
                            items: ['hello world'],
                        },
                    },
                },
            })
            const response = await connection.runSavedQuery('1234')
            expect(response.data).toEqual(['hello world'])
        })
        test('Should run a saved query and return no data if nothing responded', async () => {
            const connection = new OuterbaseConnection('API_KEY')
            fetchMock.postOnce(`*`, {
                body: undefined,
            })
            const response = await connection.runSavedQuery('1234')
            expect(response.data).toEqual([])
        })
    })
    describe('Query Type', () => {
        const connection = new OuterbaseConnection('API_KEY')

        test('Query type is set to named', () => {
            expect(connection.queryType).toBe(QueryType.named)
        })
    })
})
