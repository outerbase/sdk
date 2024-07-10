import { describe, expect, test } from '@jest/globals'

import { NeonHttpConnection } from 'src/connections/neon-http'
import { QueryType } from 'src/query-params'

describe('NeonHttpConnection', () => {
    describe('Query Type', () => {
        const connection = new NeonHttpConnection({
            databaseUrl: 'postgresql://USER:PASSWORD@some-random-string0g.us-east-2.aws.neon.tech/neondb?sslmode=require'
        })

        test('Query type is set to positional', () => {
            expect(connection.queryType).toBe(QueryType.positional)
        })

        test('Query type is set not named', () => {
            expect(connection.queryType).not.toBe(QueryType.named)
        })
    })
})
