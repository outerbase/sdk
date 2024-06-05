import { describe, expect, it } from '@jest/globals'
import { BaseTable } from '../../src/models/index' // Adjust the path as necessary

describe('BaseTable class', () => {
    it('should create an instance with a name and schema', () => {
        const name = 'testTable'
        const schema = 'testSchema'
        const baseTable = new BaseTable({ _name: name, _schema: schema })

        expect(baseTable).toBeInstanceOf(BaseTable)
        expect(baseTable._name).toBe(name)
        expect(baseTable._schema).toBe(schema)
    })

    it('should create an instance with only a name', () => {
        const name = 'testTable'
        const baseTable = new BaseTable({ _name: name })

        expect(baseTable).toBeInstanceOf(BaseTable)
        expect(baseTable._name).toBe(name)
        expect(baseTable._schema).toBeUndefined()
    })

    it('should handle missing schema parameter', () => {
        const name = 'testTable'
        const baseTable = new BaseTable({ _name: name })

        expect(baseTable._name).toBe(name)
        expect(baseTable._schema).toBeUndefined()
    })
})
