import { describe, expect, test } from '@jest/globals'

import { isQueryParamsNamed, isQueryParamsPositional } from 'src/query-params'

describe('Query Params', () => {
    describe('Named Parameters', () => {
        test('Is named parameter with no items', () => {
            expect(isQueryParamsNamed({})).toBeTruthy()
        })

        test('Is named parameter with one item', () => {
            expect(isQueryParamsNamed({ id: 1 })).toBeTruthy()
        })

        test('Is named parameter with multiple items', () => {
            expect(
                isQueryParamsNamed({
                    id: 1,
                    first_name: 'John',
                    last_name: 'Doe',
                })
            ).toBeTruthy()
        })

        test('Is not named parameter an empty array', () => {
            expect(isQueryParamsNamed([])).toBeFalsy()
        })

        test('Is not named parameter a populated array', () => {
            expect(isQueryParamsNamed([1, 'Two'])).toBeFalsy()
        })
    })

    describe('Positional Parameters', () => {
        test('Is positional parameter with no items', () => {
            expect(isQueryParamsPositional([])).toBeTruthy()
        })

        test('Is positional parameter with one item', () => {
            expect(isQueryParamsPositional([1])).toBeTruthy()
        })

        test('Is positional parameter with multiple items', () => {
            expect(isQueryParamsPositional([1, 'John', 'Doe'])).toBeTruthy()
        })

        test('Is not positional parameter an empty array', () => {
            expect(isQueryParamsPositional({})).toBeFalsy()
        })

        test('Is not positional parameter a populated array', () => {
            expect(
                isQueryParamsPositional({ id: 1, first_name: 'John' })
            ).toBeFalsy()
        })
    })
})
