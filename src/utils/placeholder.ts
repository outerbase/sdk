const RE_PARAM = /(?:\?)|(?::(\d+|(?:[a-zA-Z][a-zA-Z0-9_]*)))/g,
    DQUOTE = 34,
    SQUOTE = 39,
    BSLASH = 92;

/**
 * This code is based on https://github.com/mscdex/node-mariasql/blob/master/lib/Client.js#L296-L420
 * License: https://github.com/mscdex/node-mariasql/blob/master/LICENSE
 *
 * @param query
 * @returns
 */
function parse(query: string): [string] | [string[], (string | number)[]] {
    let ppos = RE_PARAM.exec(query);
    let curpos = 0;
    let start = 0;
    let end;
    const parts = [];
    let inQuote = false;
    let escape = false;
    let qchr;
    const tokens = [];
    let qcnt = 0;
    let lastTokenEndPos = 0;
    let i;

    if (ppos) {
        do {
            for (i = curpos, end = ppos.index; i < end; ++i) {
                let chr = query.charCodeAt(i);
                if (chr === BSLASH) escape = !escape;
                else {
                    if (escape) {
                        escape = false;
                        continue;
                    }
                    if (inQuote && chr === qchr) {
                        if (query.charCodeAt(i + 1) === qchr) {
                            // quote escaped via "" or ''
                            ++i;
                            continue;
                        }
                        inQuote = false;
                    } else if (!inQuote && (chr === DQUOTE || chr === SQUOTE)) {
                        inQuote = true;
                        qchr = chr;
                    }
                }
            }
            if (!inQuote) {
                parts.push(query.substring(start, end));
                tokens.push(ppos[0].length === 1 ? qcnt++ : ppos[1]);
                start = end + ppos[0].length;
                lastTokenEndPos = start;
            }
            curpos = end + ppos[0].length;
        } while ((ppos = RE_PARAM.exec(query)));

        if (tokens.length) {
            if (curpos < query.length) {
                parts.push(query.substring(lastTokenEndPos));
            }
            return [parts, tokens];
        }
    }
    return [query];
}

export function namedPlaceholder(
    query: string,
    params: Record<string, unknown>,
    numbered = false
): { query: string; bindings: unknown[] } {
    const parts = parse(query);

    if (parts.length === 1) {
        return { query, bindings: [] };
    }

    const bindings = [];
    let newQuery = '';

    const [sqlFragments, placeholders] = parts;

    for (let i = 0; i < sqlFragments.length; i++) {
        newQuery += sqlFragments[i];

        if (i < placeholders.length) {
            const key = placeholders[i];

            if (numbered) {
                newQuery += `$${i + 1}`;
            } else {
                newQuery += `?`;
            }

            bindings.push(params[key]);
        }
    }

    return { query: newQuery, bindings };
}

export function toNumberedPlaceholders(
    query: string,
    params: unknown[]
): {
    query: string;
    bindings: unknown[];
} {
    const parts = parse(query);

    if (parts.length === 1) {
        return { query, bindings: [] };
    }

    const bindings = [];
    let newQuery = '';

    const [sqlFragments, placeholders] = parts;

    for (let i = 0; i < sqlFragments.length; i++) {
        newQuery += sqlFragments[i];

        if (i < placeholders.length) {
            newQuery += `$${i + 1}`;
            bindings.push(params[i]);
        }
    }

    return { query: newQuery, bindings };
}
