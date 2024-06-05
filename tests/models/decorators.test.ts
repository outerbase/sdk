import { describe, expect, it } from '@jest/globals'
import {
    metadataRegistry,
    Column,
    isColumn,
    isPropertyUnique,
    isColumnNullable,
    getPrimaryKey,
} from '../../src/models/decorators' // Adjust the path as necessary

class TestEntity {
    @Column({ primary: true })
    id: number

    @Column({ unique: true, nullable: false })
    uniqueColumn: string

    @Column({ nullable: true })
    nullableColumn: string

    @Column()
    regularColumn: string
}

describe('metadataRegistry', () => {
    it('should register primary key column', () => {
        expect(getPrimaryKey(TestEntity)).toBe('id')
    })

    it('should register columns with correct metadata', () => {
        const metadata = metadataRegistry.get(TestEntity)
        expect(metadata).toBeDefined()
        expect(metadata.columns).toHaveProperty('id')
        expect(metadata.columns.id).toHaveProperty('primary', true)
        expect(metadata.columns.id).toHaveProperty('name', 'id')
        expect(metadata.columns).toHaveProperty('uniqueColumn')
        expect(metadata.columns.uniqueColumn).toHaveProperty('unique', true)
        expect(metadata.columns.uniqueColumn).toHaveProperty('nullable', false)
        expect(metadata.columns).toHaveProperty('nullableColumn')
        expect(metadata.columns.nullableColumn).toHaveProperty('nullable', true)
        expect(metadata.columns).toHaveProperty('regularColumn')
    })

    it('should detect if a property is a column', () => {
        expect(isColumn(TestEntity, 'id')).toBe(true)
        expect(isColumn(TestEntity, 'uniqueColumn')).toBe(true)
        expect(isColumn(TestEntity, 'nullableColumn')).toBe(true)
        expect(isColumn(TestEntity, 'regularColumn')).toBe(true)
        expect(isColumn(TestEntity, 'nonExistentColumn')).toBe(false)
    })

    it('should detect if a column is unique', () => {
        expect(isPropertyUnique(TestEntity, 'uniqueColumn')).toBe(true)
        expect(isPropertyUnique(TestEntity, 'nullableColumn')).toBe(false)
        expect(isPropertyUnique(TestEntity, 'regularColumn')).toBe(false)
    })

    it('should detect if a column is nullable', () => {
        expect(isColumnNullable(TestEntity, 'nullableColumn')).toBe(true)
        expect(isColumnNullable(TestEntity, 'uniqueColumn')).toBe(false)
        expect(isColumnNullable(TestEntity, 'regularColumn')).toBe(false)
    })
})
