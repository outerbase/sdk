import { Connection, Outerbase } from '.';
import { DefaultDialect } from './query-builder/dialects/default';
import { MySQLDialect } from './query-builder/dialects/mysql';

function qb() {
    return Outerbase({
        dialect: new MySQLDialect(),
    } as Connection);
}

const q = qb();

const r = q
    .select('id', 'name')
    .from('users')
    .where(
        q.or(
            q.where('age', '>', 18),
            q.or(
                q.where('gender', '=', 'female'),
                q.where('planet', '=', 'earth')
            )
        )
    )
    .toQuery();

console.log(r.query);
console.log(r.parameters);
