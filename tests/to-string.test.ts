import { describe, expect, test } from '@jest/globals'

import { Query, constructRawQuery } from 'src/query'
import { OuterbaseConnection } from 'src/connections/outerbase'
import { Outerbase } from 'src/index'

describe('toString', () => {
    describe('constructRawQuery - INSERT INTO - Named Parameters', () => {
        test('toString - INSERT INTO - One named parameter', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (:name)',
                parameters: { name: 'John Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (name) VALUES ('John Doe')"
            )
        })

        test('toString - INSERT INTO - Three named parameters in order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (:id, :first_name, :last_name)',
                parameters: { id: 1, first_name: 'John', last_name: 'Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES (1, 'John', 'Doe')"
            )
        })

        test('toString - INSERT INTO - Three named parameters out of order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (:id, :first_name, :last_name)',
                parameters: { first_name: 'John', id: 1, last_name: 'Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES (1, 'John', 'Doe')"
            )
        })

        test('toString - INSERT INTO - One named property incorrect spelling', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (:incorrectParameterName)',
                parameters: { name: 'John Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (:incorrectParameterName)'
            )
        })

        test('toString - INSERT INTO - One named property with empty parameters', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (:incorrectParameterName)',
                parameters: {},
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (:incorrectParameterName)'
            )
        })
    })

    describe('constructRawQuery - INSERT INTO - Positional Parameters', () => {
        test('toString - INSERT INTO - One positional parameter', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (?)',
                parameters: ['John Doe'],
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (name) VALUES ('John Doe')"
            )
        })

        test('toString - INSERT INTO - Three positional parameters in order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (?, ?, ?)',
                parameters: [1, 'John', 'Doe'],
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES (1, 'John', 'Doe')"
            )
        })

        test('toString - INSERT INTO - Three positional parameters out of order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (?, ?, ?)',
                parameters: ['John', 1, 'Doe'],
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES ('John', 1, 'Doe')"
            )
        })

        test('toString - INSERT INTO - One positional property but empty array', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (?)',
                parameters: [],
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (?)'
            )
        })
    })

    describe('constructRawQuery - SELECT FROM - Named Parameters', () => {
        test('toString - SELECT FROM - One named parameter', () => {
            const query: Query = {
                query: 'SELECT name FROM person WHERE name = :name',
                parameters: { name: 'John Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "SELECT name FROM person WHERE name = 'John Doe'"
            )
        })
    })

    describe('queryBuilder toString', () => {
        const connection = new OuterbaseConnection('FAKE_API_KEY')
        const db = Outerbase(connection)

        test('toString – Simple INSERT INTO ', () => {
            const sql = db
                .selectFrom([{ table: 'person', columns: ['name'] }])
                .toString()
            expect(sql).toBe('SELECT person.name FROM person')
        })
    })
})

// With reserved keywords
// INSERT - with and without parameters, named & positional
// UPDATE - with and without parameters, named & positional
// SELECT
// DELETE
