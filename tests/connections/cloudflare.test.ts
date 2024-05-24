import { describe, expect, test } from '@jest/globals'

import { CloudflareD1Connection } from 'src/connections/cloudflare'
import { QueryType } from 'src/index'

describe('CloudflareD1Connection', () => {
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
