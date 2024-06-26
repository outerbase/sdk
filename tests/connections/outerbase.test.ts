import { describe, expect, test } from '@jest/globals'

import { OuterbaseConnection } from 'src/connections/outerbase'
import { QueryType } from 'src/query-params'

describe('OuterbaseConnection', () => {
    describe('Query Type', () => {
        const connection = new OuterbaseConnection({
            apiKey: 'FAKE_API_KEY'
        })

        test('Query type is set to named', () => {
            expect(connection.queryType).toBe(QueryType.named)
        })

        test('Query type is set not positional', () => {
            expect(connection.queryType).not.toBe(QueryType.positional)
        })
    })
})
