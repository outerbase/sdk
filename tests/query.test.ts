import { describe, expect, test } from '@jest/globals'

import { Query, constructRawQuery } from '../src/query'

describe('Query', () => {
    describe('INSERT INTO - Named Parameters', () => {
        test('One named parameter', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (:name)',
                parameters: { name: 'John Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (name) VALUES ('John Doe')"
            )
        })

        test('Three named parameters in order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (:id, :first_name, :last_name)',
                parameters: { id: 1, first_name: 'John', last_name: 'Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES (1, 'John', 'Doe')"
            )
        })

        test('Three named parameters out of order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (:id, :first_name, :last_name)',
                parameters: { first_name: 'John', id: 1, last_name: 'Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES (1, 'John', 'Doe')"
            )
        })

        test('One named property incorrect spelling', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (:incorrectParameterName)',
                parameters: { name: 'John Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (:incorrectParameterName)'
            )
        })

        test('One named property with empty parameters', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (:incorrectParameterName)',
                parameters: {},
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (:incorrectParameterName)'
            )
        })
    })

    describe('INSERT INTO - Positional Parameters', () => {
        test('No positional parameter', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (?)',
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (?)'
            )
        })
        test('One positional parameter', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (?)',
                parameters: ['John Doe'],
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (name) VALUES ('John Doe')"
            )
        })

        test('Three positional parameters in order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (?, ?, ?)',
                parameters: [1, 'John', 'Doe'],
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES (1, 'John', 'Doe')"
            )
        })

        test('Three positional parameters out of order', () => {
            const query: Query = {
                query: 'INSERT INTO person (id, first_name, last_name) VALUES (?, ?, ?)',
                parameters: ['John', 1, 'Doe'],
            }

            expect(constructRawQuery(query)).toBe(
                "INSERT INTO person (id, first_name, last_name) VALUES ('John', 1, 'Doe')"
            )
        })

        test('One positional property but empty array', () => {
            const query: Query = {
                query: 'INSERT INTO person (name) VALUES (?)',
                parameters: [],
            }

            expect(constructRawQuery(query)).toBe(
                'INSERT INTO person (name) VALUES (?)'
            )
        })
    })

    describe('SELECT FROM - Named Parameters', () => {
        test('One named parameter', () => {
            const query: Query = {
                query: 'SELECT name FROM person WHERE name = :name',
                parameters: { name: 'John Doe' },
            }

            expect(constructRawQuery(query)).toBe(
                "SELECT name FROM person WHERE name = 'John Doe'"
            )
        })
    })
})
