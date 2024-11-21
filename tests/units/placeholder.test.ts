import {
    namedPlaceholder,
    toNumberedPlaceholders,
} from './../../src/utils/placeholder';

test('Positional placeholder', () => {
    expect(
        namedPlaceholder('SELECT * FROM users WHERE id = :id AND age > :age', {
            id: 1,
            age: 50,
        })
    ).toEqual({
        query: 'SELECT * FROM users WHERE id = ? AND age > ?',
        bindings: [1, 50],
    });
});

test('Positional placeholder inside the string should be ignored', () => {
    expect(
        namedPlaceholder(
            'SELECT * FROM users WHERE name = :name AND email = ":email"',
            {
                name: 'John',
            }
        )
    ).toEqual({
        query: 'SELECT * FROM users WHERE name = ? AND email = ":email"',
        bindings: ['John'],
    });
});

test('Named placeholder to number placeholder', () => {
    expect(
        namedPlaceholder(
            'SELECT * FROM users WHERE id = :id AND age > :age',
            {
                id: 1,
                age: 30,
            },
            true
        )
    ).toEqual({
        query: 'SELECT * FROM users WHERE id = $1 AND age > $2',
        bindings: [1, 30],
    });
});

test('Named placeholder to number placeholder with string', () => {
    expect(
        namedPlaceholder(
            'SELECT * FROM users WHERE id = :id AND email = ":email"',
            {
                id: 1,
            },
            true
        )
    ).toEqual({
        query: 'SELECT * FROM users WHERE id = $1 AND email = ":email"',
        bindings: [1],
    });
});

test('Convert positional placeholder to numbered placeholder', () => {
    expect(
        toNumberedPlaceholders(
            `SELECT * FROM users WHERE id = ? AND email = '?' AND name = 'Outer""base' AND age > ?`,
            [1, 30]
        )
    ).toEqual({
        query: `SELECT * FROM users WHERE id = $1 AND email = '?' AND name = 'Outer""base' AND age > $2`,
        bindings: [1, 30],
    });
});
