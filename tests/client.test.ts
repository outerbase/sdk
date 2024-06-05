import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { CloudflareD1Connection } from '../src/connections/cloudflare'
import { OuterbaseConnection } from '../src/connections/outerbase'
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
    descending,
    Outerbase,
    equals,
    equalsNumber,
    equalsColumn,
    notEquals,
    notEqualsNumber,
    notEqualsColumn,
    greaterThan,
    OuterbaseType,
} from '../src/client'
import { Connection } from '../src/connections'
import fetchMock from 'fetch-mock'

describe('Query Builder', () => {
    let outerbaseD1: OuterbaseType
    let outerbase: OuterbaseType
    let mockCloudflareConnection: Connection
    let mockOuterbaseConnection: Connection

    beforeEach(() => {
        mockOuterbaseConnection = new OuterbaseConnection('API_KEY')
        mockCloudflareConnection = new CloudflareD1Connection(
            'API_KEY',
            'ACCOUNT_ID',
            'DATABASE_ID'
        )
        outerbaseD1 = Outerbase(mockCloudflareConnection)
        outerbase = Outerbase(mockOuterbaseConnection)
        fetchMock.reset()
    })
    test('Update a table', () => {
        const query = outerbaseD1
            .update({ crab: 'cake' })
            .where('cheese = thing')
            .into('testTable')
            .toString()
        expect(query).toBe(
            "UPDATE testTable SET crab = 'cake' WHERE cheese = thing"
        )
    })
    test('Update a table with named', () => {
        const query = outerbase
            .insert({ garbage: 'andy' })
            .update({ crab: 'cake', cake: 'crab' })
            .into('testTable')
            .toString()
        expect(query).toBe("UPDATE testTable SET crab = 'cake', cake = 'crab'")
    })

    test('Update a table without where', () => {
        const query = outerbaseD1
            .update({ test: 'insert' })
            .where('egg = nog')
            .into('testTable')
            .toString()
        expect(query).toBe(
            "UPDATE testTable SET test = 'insert' WHERE egg = nog"
        )
    })
    test('Update a table without where', () => {
        const query = outerbaseD1
            .update({ test: 'insert' })
            .where([])
            .into('testTable')
            .toString()
        expect(query).toBe("UPDATE testTable SET test = 'insert' WHERE ")
    })
    test('Select from a table', () => {
        const query = outerbaseD1
            .where('testWhere')
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
                {
                    table: 'testTable2',
                    columns: ['testColumn2'],
                },
            ])
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn, testTable2.testColumn2 FROM testTable'
        )
    })
    test('Select from a table with reserved word', () => {
        const query = outerbaseD1
            .where('testWhere')
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
                {
                    table: 'testTable2',
                    columns: ['ABORT'],
                },
            ])
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn, testTable2."ABORT" FROM testTable'
        )
    })
    test('Limit a select', () => {
        const query = outerbaseD1
            .where('testWhere')
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .limit(50)
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable LIMIT 50'
        )
    })
    test('Limit a select with offset', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .limit(50)
            .offset(5)
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable LIMIT 50 OFFSET 5'
        )
    })
    test('Order By Ascending', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .orderBy('testColumn', 'ASC')
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable ORDER BY testColumn'
        )
    })
    test('Inner join', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .innerJoin('testJoinTable', 'condition')
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable INNER JOIN testJoinTable ON condition'
        )
    })
    test('Inner join with escape option true', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .innerJoin('testJoinTable', "'condition'", {
                escape_single_quotes: true,
            })
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable INNER JOIN testJoinTable ON condition'
        )
    })
    test('Inner join with escape option false', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .innerJoin('testJoinTable', "'condition'", {
                escape_single_quotes: false,
            })
            .toString()

        expect(query).toBe(
            "SELECT testTable.testColumn FROM testTable INNER JOIN testJoinTable ON 'condition'"
        )
    })
    test('Left join with escape option false', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .leftJoin('testJoinTable', "'condition'", {
                escape_single_quotes: false,
            })
            .toString()

        expect(query).toBe(
            "SELECT testTable.testColumn FROM testTable LEFT JOIN testJoinTable ON 'condition'"
        )
    })
    test('Left join with escape option true', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .leftJoin('testJoinTable', "'condition'", {
                escape_single_quotes: true,
            })
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable LEFT JOIN testJoinTable ON condition'
        )
    })
    test('Right join with escape option true', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .rightJoin('testJoinTable', "'condition'", {
                escape_single_quotes: true,
            })
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable RIGHT JOIN testJoinTable ON condition'
        )
    })
    test('Right join with escape option false', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .rightJoin('testJoinTable', "'condition'", {
                escape_single_quotes: false,
            })
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable RIGHT JOIN testJoinTable ON condition'
        )
    })
    test('Outer join with escape option false', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .outerJoin('testJoinTable', "'condition'", {
                escape_single_quotes: false,
            })
            .toString()

        expect(query).toBe(
            "SELECT testTable.testColumn FROM testTable OUTER JOIN testJoinTable ON 'condition'"
        )
    })
    test('Outer join with escape option true', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .outerJoin('testJoinTable', "'condition'", {
                escape_single_quotes: true,
            })
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable OUTER JOIN testJoinTable ON condition'
        )
    })
    test('Insert', () => {
        const query = outerbaseD1
            .insert({ test: 'column' })
            .into('testTable')
            .toString()

        expect(query).toBe("INSERT INTO testTable (test) VALUES ('column')")
    })
    test('Insert with named', () => {
        const query = outerbase
            .insert({ test: 'column' })
            .into('testTable')
            .returning(['test', 'test1'])
            .toString()

        expect(query).toBe(
            "INSERT INTO testTable (test) VALUES ('column') RETURNING test, test1"
        )
    })

    test('Delete From', () => {
        const query = outerbaseD1
            .deleteFrom('testTable')
            .where('egg')
            .toString()

        expect(query).toBe('DELETE FROM testTable WHERE egg')
    })
    test('Where before deletefrom', () => {
        const query = outerbaseD1
            .where('egg')
            .deleteFrom('testTable')
            .toString()

        expect(query).toBe('')
    })
    test('Returning', () => {
        const query = outerbaseD1
            .deleteFrom('testTable')
            .returning(['column1', 'column2'])

        expect(query).toBe(query)
    })
    test('GroupBy', () => {
        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .groupBy('testColumn')
            .toString()

        expect(query).toBe(
            'SELECT testTable.testColumn FROM testTable GROUP BY testColumn'
        )
    })
    test('AsClass', () => {
        class ExampleClass {
            value: any
            constructor(data: any) {
                this.value = data
            }
        }

        const query = outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .asClass(new ExampleClass('cheeses'))
            .toString()

        expect(query).toBe('SELECT testTable.testColumn FROM testTable')
    })
    test('query', async () => {
        class ExampleClass {
            value: any
            constructor(data: any) {
                this.value = data
            }
        }
        fetchMock.postOnce(`*`, {
            body: {
                result: [
                    {
                        results: 'hello world',
                    },
                ],
            },
        })

        const query = await outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .asClass(ExampleClass)
            .query()

        expect(query.data).toEqual({ value: 'hello world' })
        expect(query.error).toBeNull()
        expect(query.query).toMatchObject({
            parameters: [],
            query: 'SELECT testTable.testColumn FROM testTable',
        })
    })
    test('query', async () => {
        class ExampleClass {
            value: any
            constructor(data: any) {
                this.value = data
            }
        }
        fetchMock.postOnce(`*`, {
            body: {
                result: [
                    {
                        results: ['hello world', 'hello brayden'],
                    },
                ],
            },
        })

        const query = await outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .asClass(ExampleClass)
            .query()

        expect(query.data).toEqual([
            { value: 'hello world' },
            { value: 'hello brayden' },
        ])
        expect(query.error).toBeNull()
        expect(query.query).toMatchObject({
            parameters: [],
            query: 'SELECT testTable.testColumn FROM testTable',
        })
    })
    test('query', async () => {
        const query = await outerbaseD1
            .selectFrom([
                {
                    table: 'testTable',
                    columns: ['testColumn'],
                },
            ])
            .query()
        expect(query.data).toEqual([])
        expect(query.error).toBeNull()
        expect(query.query).toMatchObject({
            parameters: [],
            query: 'SELECT testTable.testColumn FROM testTable',
        })
    })
    test('queryRaw', async () => {
        const thing = new (class cheese {})()

        const query = await outerbaseD1
            .asClass(thing)
            .queryRaw('select * from testTable', {
                test: 'params',
            })
        expect(query.data).toEqual([])
        expect(query.error).toBeNull()
        expect(query.query).toBe('select * from testTable')
    })
    test('queryRaw with parameters', async () => {
        const query = await outerbaseD1.queryRaw('select * from testTable')
        expect(query.data).toEqual([])
        expect(query.error).toBeNull()
        expect(query.query).toBe('select * from testTable')
    })
})
describe('Helper Functions', () => {
    describe('equals', () => {
        test('Adds a equal sign between the two values', () => {
            const actual = equals('test', 'data')
            const expected = "test = 'data'"
            expect(actual).toBe(expected)
        })
    })
    describe('equalsNumber', () => {
        test('Adds a equal sign between the two values', () => {
            const actual = equalsNumber('test', 'data')
            const expected = 'test = data'
            expect(actual).toBe(expected)
        })
    })
    describe('notEquals', () => {
        test('Adds a equal sign between the two values', () => {
            const actual = notEquals('test', 'data')
            const expected = "test != 'data'"
            expect(actual).toBe(expected)
        })
    })
    describe('notEqualsNumber', () => {
        test('Adds a equal sign between the two values', () => {
            const actual = notEqualsNumber('test', 'data')
            const expected = 'test != data'
            expect(actual).toBe(expected)
        })
    })
    describe('greaterThan', () => {
        test('Adds a greater than sign between the two values', () => {
            const actual = greaterThan('test', 'data')
            const expected = "test > 'data'"
            expect(actual).toBe(expected)
        })
    })
    describe('notEqualsColumn', () => {
        test('Adds a equal sign between the two values', () => {
            const actual = notEqualsColumn('test', 'data')
            const expected = 'test != data'
            expect(actual).toBe(expected)
        })
    })
    describe('equalsColumn', () => {
        test('Adds a equal sign between the two values', () => {
            const actual = equalsColumn('test', 'data')
            const expected = 'test = data'
            expect(actual).toBe(expected)
        })
    })
    describe('greaterThanNumber', () => {
        test('Adds a greater than sign between the two values', () => {
            const actual = greaterThanNumber('test', 'data')
            const expected = 'test > data'
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
            const expected = 'test < data'
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
            const expected = 'test >= data'
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
            const expected = 'test <= data'
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
            const expected = 'test IN (1, 2)'
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
            const expected = 'test NOT IN (1, 2)'
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
            const expected = 'test IS NULL'
            expect(actual).toBe(expected)
        })
    })

    describe('isNumber', () => {
        test('Formats an IS clause without single quotes around second parameter', () => {
            const actual = isNumber('test', 123)
            const expected = 'test IS 123'
            expect(actual).toBe(expected)
        })
    })

    describe('isNot', () => {
        test('Formats an IS NOT clause with single quotes around second parameter', () => {
            const actual = isNot.call('banana', 'column', null)
            const expected = 'banana IS NOT NULL'
            expect(actual).toBe(expected)
        })
        test('Formats an IS NOT clause for NULL values', () => {
            const actual = isNot.call('thing', 'column', 'banana')
            const expected = 'column IS NOT banana'
            expect(actual).toBe(expected)
        })
    })

    describe('isNotNumber', () => {
        test('Formats an IS NOT clause without single quotes around second parameter', () => {
            const actual = isNotNumber('test', 123)
            const expected = 'test IS NOT 123'
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
            const expected = 'test IS NULL'
            expect(actual).toBe(expected)
        })
    })

    describe('isNotNull', () => {
        test('Formats an IS NOT NULL clause', () => {
            const actual = isNotNull('test')
            const expected = 'test IS NOT NULL'
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
            const expected = 'test BETWEEN 1 AND 2'
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
            const expected = 'test NOT BETWEEN 1 AND 2'
            expect(actual).toBe(expected)
        })
    })

    describe('ascending', () => {
        test('Formats an ASC clause', () => {
            const actual = ascending('test')
            const expected = 'test ASC'
            expect(actual).toBe(expected)
        })
    })

    describe('descending', () => {
        test('Formats a DESC clause', () => {
            const actual = descending('test')
            const expected = 'test DESC'
            expect(actual).toBe(expected)
        })
    })
})
