import { describe, expect, test } from '@jest/globals'

import { OuterbaseConnection } from 'src/connections/outerbase'
import { Outerbase, equals, equalsNumber } from 'src/index'

describe('toString', () => {
    describe('SELECT statements', () => {
        const connection = new OuterbaseConnection({
            apiKey: 'FAKE_API_KEY'
        })
        const db = Outerbase(connection)

        test('Select from one table, one column', () => {
            const sql = db
                .selectFrom([{ table: 'person', columns: ['name'] }])
                .toString()
            expect(sql).toBe('SELECT person.name FROM person')
        })

        test('Select from one table, multiple columns', () => {
            const sql = db
                .selectFrom([
                    {
                        table: 'person',
                        columns: ['id', 'first_name', 'last_name'],
                    },
                ])
                .toString()
            expect(sql).toBe(
                'SELECT person.id, person.first_name, person.last_name FROM person'
            )
        })

        test('Select from one table, multiple columns with where clause', () => {
            const sql = db
                .selectFrom([
                    {
                        table: 'person',
                        columns: ['id', 'first_name', 'last_name'],
                    },
                ])
                .where(equalsNumber('id', 1))
                .toString()
            expect(sql).toBe(
                'SELECT person.id, person.first_name, person.last_name FROM person WHERE id = 1'
            )
        })

        test('Select from one table, multiple columns with multiple where clauses', () => {
            const sql = db
                .selectFrom([
                    {
                        table: 'person',
                        columns: ['id', 'first_name', 'last_name'],
                    },
                ])
                .where(equalsNumber('id', 1))
                .where(equals('first_name', 'John'))
                .toString()
            expect(sql).toBe(
                `SELECT person.id, person.first_name, person.last_name FROM person WHERE id = 1 AND first_name = 'John'`
            )
        })
    })

    describe('queryBuilder - Reserved keywords get quotes', () => {
        const connection = new OuterbaseConnection({
            apiKey: 'FAKE_API_KEY'
        })
        const db = Outerbase(connection)

        test.skip('toString – Not reserved keyword "users" is not wrapped in quotes', () => {
            const sql = db
                .selectFrom([{ table: 'users', columns: ['name'] }])
                .toString()
            expect(sql).toBe('SELECT users.name FROM users')
        })

        test.skip('toString – Reserved keyword "user" wrapped in quotes', () => {
            const sql = db
                .selectFrom([{ table: 'user', columns: ['name'] }])
                .toString()
            expect(sql).toBe('SELECT "user".name FROM "user"')
        })
    })
})
