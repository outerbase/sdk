import { expect, test } from '@jest/globals'
import { describe } from 'node:test'
import {
    greaterThanNumber,
    lessThan,
    lessThanNumber,
    greaterThanOrEqual,
    greaterThanOrEqualNumber,
    lessThanOrEqual,
    lessThanOrEqualNumber,
    inValues,
    inNumbers,
    notInValues,
    notInNumbers,
    is,
    isNumber,
    isNot,
    isNotNumber,
    like,
    notLike,
    ilike,
    notILike,
    isNull,
    isNotNull,
    between,
    betweenNumbers,
    notBetween,
    notBetweenNumbers,
    ascending,
    descending
} from '../src/client'

describe('Helper Functions', () => {
    describe('greaterThanNumber', () => {
        test('Adds a greater than sign between the two values', () => {
            const actual = greaterThanNumber('test', 'data')
            const expected = "test > data"
            expect(actual).toBe(expected)
        })
    })
    
    describe('lessThan', () => {
        test('Adds a less than sign between the two values and single quotes around second parameter', () => {
            const actual = lessThan('test', 'data')
            const expected = "test < 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('lessThanNumber', () => {
        test('Adds a less than sign between the two values', () => {
            const actual = lessThanNumber('test', 'data')
            const expected = "test < data"
            expect(actual).toBe(expected)
        })
    })

    describe('greaterThanOrEqual', () => {
        test('Adds a greater than or equal sign between the two values and single quotes around second parameter', () => {
            const actual = greaterThanOrEqual('test', 'data')
            const expected = "test >= 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('greaterThanOrEqualNumber', () => {
        test('Adds a greater than or equal sign between the two values', () => {
            const actual = greaterThanOrEqualNumber('test', 'data')
            const expected = "test >= data"
            expect(actual).toBe(expected)
        })
    })

    describe('lessThanOrEqual', () => {
        test('Adds a less than or equal sign between the two values and single quotes around second parameter', () => {
            const actual = lessThanOrEqual('test', 'data')
            const expected = "test <= 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('lessThanOrEqualNumber', () => {
        test('Adds a less than or equal sign between the two values', () => {
            const actual = lessThanOrEqualNumber('test', 'data')
            const expected = "test <= data"
            expect(actual).toBe(expected)
        })
    })

    describe('inValues', () => {
        test('Formats an IN clause with single quotes around each value', () => {
            const actual = inValues('test', ['data1', 'data2'])
            const expected = "test IN ('data1', 'data2')"
            expect(actual).toBe(expected)
        })
    })

    describe('inNumbers', () => {
        test('Formats an IN clause without single quotes around each value', () => {
            const actual = inNumbers('test', [1, 2])
            const expected = "test IN (1, 2)"
            expect(actual).toBe(expected)
        })
    })

    describe('notInValues', () => {
        test('Formats a NOT IN clause with single quotes around each value', () => {
            const actual = notInValues('test', ['data1', 'data2'])
            const expected = "test NOT IN ('data1', 'data2')"
            expect(actual).toBe(expected)
        })
    })

    describe('notInNumbers', () => {
        test('Formats a NOT IN clause without single quotes around each value', () => {
            const actual = notInNumbers('test', [1, 2])
            const expected = "test NOT IN (1, 2)"
            expect(actual).toBe(expected)
        })
    })

    describe('is', () => {
        test('Formats an IS clause with single quotes around second parameter', () => {
            const actual = is('test', 'data')
            const expected = "test IS 'data'"
            expect(actual).toBe(expected)
        })
        test('Formats an IS clause for NULL values', () => {
            const actual = is.call('test', 'column', null)
            const expected = "test IS NULL"
            expect(actual).toBe(expected)
        })
    })

    describe('isNumber', () => {
        test('Formats an IS clause without single quotes around second parameter', () => {
            const actual = isNumber('test', 123)
            const expected = "test IS 123"
            expect(actual).toBe(expected)
        })
    })

    describe('isNot', () => {
        test('Formats an IS NOT clause with single quotes around second parameter', () => {
            const actual = isNot.call('banana', 'column', null)
            const expected = "banana IS NOT NULL"
            expect(actual).toBe(expected)
        })
        test('Formats an IS NOT clause for NULL values', () => {
            const actual = isNot.call('thing', 'column', 'banana')
            const expected = "column IS NOT banana"
            expect(actual).toBe(expected)
        })
    })

    describe('isNotNumber', () => {
        test('Formats an IS NOT clause without single quotes around second parameter', () => {
            const actual = isNotNumber('test', 123)
            const expected = "test IS NOT 123"
            expect(actual).toBe(expected)
        })
    })

    describe('like', () => {
        test('Formats a LIKE clause with single quotes around second parameter', () => {
            const actual = like('test', 'data')
            const expected = "test LIKE 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('notLike', () => {
        test('Formats a NOT LIKE clause with single quotes around second parameter', () => {
            const actual = notLike('test', 'data')
            const expected = "test NOT LIKE 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('ilike', () => {
        test('Formats an ILIKE clause with single quotes around second parameter', () => {
            const actual = ilike('test', 'data')
            const expected = "test ILIKE 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('notILike', () => {
        test('Formats a NOT ILIKE clause with single quotes around second parameter', () => {
            const actual = notILike('test', 'data')
            const expected = "test NOT ILIKE 'data'"
            expect(actual).toBe(expected)
        })
    })

    describe('isNull', () => {
        test('Formats an IS NULL clause', () => {
            const actual = isNull('test')
            const expected = "test IS NULL"
            expect(actual).toBe(expected)
        })
    })

    describe('isNotNull', () => {
        test('Formats an IS NOT NULL clause', () => {
            const actual = isNotNull('test')
            const expected = "test IS NOT NULL"
            expect(actual).toBe(expected)
        })
    })

    describe('between', () => {
        test('Formats a BETWEEN clause with single quotes around both bounds', () => {
            const actual = between('test', 'data1', 'data2')
            const expected = "test BETWEEN 'data1' AND 'data2'"
            expect(actual).toBe(expected)
        })
    })

    describe('betweenNumbers', () => {
        test('Formats a BETWEEN clause without single quotes around both bounds', () => {
            const actual = betweenNumbers('test', 1, 2)
            const expected = "test BETWEEN 1 AND 2"
            expect(actual).toBe(expected)
        })
    })

    describe('notBetween', () => {
        test('Formats a NOT BETWEEN clause with single quotes around both bounds', () => {
            const actual = notBetween('test', 'data1', 'data2')
            const expected = "test NOT BETWEEN 'data1' AND 'data2'"
            expect(actual).toBe(expected)
        })
    })

    describe('notBetweenNumbers', () => {
        test('Formats a NOT BETWEEN clause without single quotes around both bounds', () => {
            const actual = notBetweenNumbers('test', 1, 2)
            const expected = "test NOT BETWEEN 1 AND 2"
            expect(actual).toBe(expected)
        })
    })

    describe('ascending', () => {
        test('Formats an ASC clause', () => {
            const actual = ascending('test')
            const expected = "test ASC"
            expect(actual).toBe(expected)
        })
    })

    describe('descending', () => {
        test('Formats a DESC clause', () => {
            const actual = descending('test')
            const expected = "test DESC"
            expect(actual).toBe(expected)
        })
    })
})
