import { Outerbase, SqlConnection } from '.';
import { MySQLDialect } from './query-builder/dialects/mysql';

function qb() {
    return Outerbase({
        dialect: new MySQLDialect(),
    } as SqlConnection);
}

const q = qb();

const r = q
    .select('id', 'name')
    .from('users')
    .where(
        q.or(
            q.where('age', '>', 18),
            q.and(
                q.where('gender', '=', 'female'),
                q.where('planet', '=', 'earth')
            )
        )
    )
    .toQuery();

console.log(r.query);
console.log(r.parameters);
