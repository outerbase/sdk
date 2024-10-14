import { describe, expect, test } from '@jest/globals';
import { Outerbase, SqlConnection } from '../../../src';
import { DefaultDialect } from '../../../src/query-builder/dialects/default';

function qb() {
    return Outerbase({
        dialect: new DefaultDialect(),
    } as SqlConnection);
}

describe('Query Builder - Postgre Dialect', () => {
    test('Select query without any filter', () => {
        const { query, parameters } = qb()
            .select()
            .from('public.users')
            .toQuery();

        expect(query).toBe('SELECT * FROM "public"."users"');
        expect(parameters).toEqual([]);
    });

    test('Select with where equals conditions', () => {
        const { query, parameters } = qb()
            .select()
            .from('public.users')
            .where({ id: 'visal' })
            .toQuery();

        expect(query).toBe('SELECT * FROM "public"."users" WHERE "id" = ?');
        expect(parameters).toEqual(['visal']);
    });

    test('Select with limit and offset', () => {
        const { query, parameters } = qb()
            .select()
            .from('public.users')
            .where({ id: 'visal' })
            .offset(10)
            .limit(20)
            .toQuery();

        expect(query).toBe(
            'SELECT * FROM "public"."users" WHERE "id" = ? LIMIT ? OFFSET ?'
        );
        expect(parameters).toEqual(['visal', 20, 10]);
    });

    test('Select with where with custom condition', () => {
        const { query, parameters } = qb()
            .select('id', 'name')
            .from('users')
            .where('age', '>', 18)
            .toQuery();

        expect(query).toBe('SELECT "id", "name" FROM "users" WHERE "age" > ?');
        expect(parameters).toEqual([18]);
    });

    test('Select with where with OR', () => {
        const q = qb();
        const { query, parameters } = q
            .select('id', 'name')
            .from('users')
            .where(
                q.or(q.where('age', '>', 18), q.where('gender', '=', 'female'))
            )
            .toQuery();

        expect(query).toBe(
            'SELECT "id", "name" FROM "users" WHERE "age" > ? OR "gender" = ?'
        );
        expect(parameters).toEqual([18, 'female']);
    });

    test('Select with where with OR and AND', () => {
        const q = qb();
        const { query, parameters } = q
            .select('id', 'name')
            .from('users')
            .where(
                q.or(
                    q.where('age', '>', 18),
                    q.where('gender', '=', 'female'),
                    q.and(q.where('active', '=', 1), q.where('deleted', '=', 0))
                )
            )
            .toQuery();

        expect(query).toBe(
            'SELECT "id", "name" FROM "users" WHERE "age" > ? OR "gender" = ? OR ("active" = ? AND "deleted" = ?)'
        );
        expect(parameters).toEqual([18, 'female', 1, 0]);
    });

    test('Select with where simplify nested OR', () => {
        const q = qb();
        const { query, parameters } = q
            .select('id', 'name')
            .from('users')
            .where(
                q.or(
                    q.where('age', '>', 18),
                    q.and(
                        q.where('active', '=', 1),
                        q.where('deleted', '=', 0)
                    ),
                    q.or(
                        q.where('gender', '=', 'female'),
                        q.where('planet', '=', 'earth')
                    )
                )
            )
            .toQuery();

        expect(query).toBe(
            'SELECT "id", "name" FROM "users" WHERE "age" > ? OR ("active" = ? AND "deleted" = ?) OR "gender" = ? OR "planet" = ?'
        );
        expect(parameters).toEqual([18, 1, 0, 'female', 'earth']);
    });

    test('Select with where simplify nested AND', () => {
        const q = qb();
        const { query, parameters } = q
            .select('id', 'name')
            .from('users')
            .where(
                q.and(
                    q.where('active', '=', 1),
                    q.and(
                        q.where('deleted', '=', 0),
                        q.and(q.where('age', '=', 18))
                    )
                )
            )
            .toQuery();

        expect(query).toBe(
            'SELECT "id", "name" FROM "users" WHERE "active" = ? AND "deleted" = ? AND "age" = ?'
        );
        expect(parameters).toEqual([1, 0, 18]);
    });

    test('Select with where simplify OR and AND', () => {
        const q = qb();
        const { query, parameters } = q
            .select('id', 'name')
            .from('users')
            .where(q.or(q.where('age', '>', 18)))
            .where(q.or(q.where('gender', '=', 'female')))
            .toQuery();

        expect(query).toBe(
            'SELECT "id", "name" FROM "users" WHERE "age" > ? AND "gender" = ?'
        );
        expect(parameters).toEqual([18, 'female']);
    });

    test('Select with where, order by and limit', () => {
        const { query, parameters } = qb()
            .select('id', 'name')
            .from('users')
            .where('age', '>', 18)
            .orderBy('age', 'DESC')
            .limit(10)
            .toQuery();

        expect(query).toBe(
            `SELECT "id", "name" FROM "users" WHERE "age" > ? ORDER BY "age" DESC LIMIT ?`
        );
        expect(parameters).toEqual([18, 10]);
    });

    test('Update query without where condition', () => {
        const { query, parameters } = qb()
            .update({ last_name: 'Visal', first_name: 'In' })
            .into('persons')
            .toQuery();

        expect(query).toBe(
            'UPDATE "persons" SET "last_name" = ?, "first_name" = ?'
        );
        expect(parameters).toEqual(['Visal', 'In']);
    });

    test('Update query where condition', () => {
        const { query, parameters } = qb()
            .update({ last_name: 'Visal', first_name: 'In' })
            .into('persons')
            .where({
                id: 123,
                active: 1,
            })
            .toQuery();

        expect(query).toBe(
            'UPDATE "persons" SET "last_name" = ?, "first_name" = ? WHERE "id" = ? AND "active" = ?'
        );
        expect(parameters).toEqual(['Visal', 'In', 123, 1]);
    });

    test('Update without data SHOULD throw error', () => {
        expect(() => {
            qb().update({}).into('persons').toQuery();
        }).toThrowError();

        expect(() => {
            qb().update({ first_name: undefined }).into('persons').toQuery();
        }).toThrowError();
    });

    test('Insert data', () => {
        const { query, parameters } = qb()
            .insert({ last_name: 'Visal', first_name: 'In' })
            .into('persons')
            .toQuery();

        expect(query).toBe(
            'INSERT INTO "persons"("last_name", "first_name") VALUES(?, ?)'
        );
        expect(parameters).toEqual(['Visal', 'In']);
    });

    test('Insert data empty data SHOULD throw error', () => {
        expect(() => {
            qb().insert({}).into('persons').toQuery();
        }).toThrowError();

        expect(() => {
            qb().insert({ first_name: undefined }).into('persons').toQuery();
        }).toThrowError();
    });

    test('Create table', () => {
        // Create table test for postgresql
        const { query } = qb()
            .createTable('persons')
            .column('id', 'SERIAL', { primaryKey: true })
            .column('first_name', 'VARCHAR(50)')
            .column('last_name', 'VARCHAR(50)')
            .toQuery();

        expect(query).toBe(
            'CREATE TABLE IF NOT EXISTS "persons" ("id" SERIAL PRIMARY KEY, "first_name" VARCHAR(50), "last_name" VARCHAR(50))'
        );
    });

    test('Drop table', () => {
        const { query } = qb().dropTable('persons').toQuery();
        expect(query).toBe('DROP TABLE IF EXISTS "persons"');
    });

    test('Rename column', () => {
        const { query } = qb()
            .alterTable('persons')
            .renameColumn('first_name', 'full_name')
            .toQuery();

        expect(query).toBe(
            'ALTER TABLE "persons" RENAME COLUMN "first_name" TO "full_name"'
        );
    });
});
