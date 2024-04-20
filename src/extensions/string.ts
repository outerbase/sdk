interface String {
    equals(value: string | null): string;
    equalsNumber(value: number): string;

    notEquals(value: string | null): string;
    notEqualsNumber(value: number): string;

    greaterThan(value: string | null): string;
    greaterThanNumber(value: number): string;

    lessThan(value: string | null): string;
    lessThanNumber(value: number): string;

    greaterThanOrEqual(value: string | null): string;
    greaterThanOrEqualNumber(value: number): string;

    lessThanOrEqual(value: string | null): string;
    lessThanOrEqualNumber(value: number): string;
    
    in(value: Array<string | null>): string;
    inNumbers(value: Array<number>): string;

    notIn(value: Array<string | null>): string;
    notInNumbers(value: Array<number>): string;

    is(value: string | null): string;
    isNumber(value: number): string;

    isNot(value: string | null): string;
    isNotNumber(value: number): string;

    like(value: string | null): string;
    ilike(value: string | null): string;
    notLike(value: string | null): string;

    between(value: string | null): string;
    betweenNumbers(value: number): string;

    notBetween(value: string | null): string;
    notBetweenNumbers(value: number): string;

    ascending(): string;
    descending(): string;
}

String.prototype.equals = function(this: string, value: string): string {
    return `${this} = '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.equalsNumber = function(this: string, value: number): string {
    return `${this} = ${value}`;
};

String.prototype.notEquals = function(this: string, value: string): string {
    return `${this} != '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.notEqualsNumber = function(this: string, value: number): string {
    return `${this} != ${value}`;
};

String.prototype.greaterThan = function(this: string, value: string): string {
    return `${this} > '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.greaterThanNumber = function(this: string, value: number): string {
    return `${this} > ${value}`;
};

String.prototype.lessThan = function(this: string, value: string): string {
    return `${this} < '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.lessThanNumber = function(this: string, value: number): string {
    return `${this} < ${value}`;
};

String.prototype.greaterThanOrEqual = function(this: string, value: string): string {
    return `${this} >= '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.greaterThanOrEqualNumber = function(this: string, value: number): string {
    return `${this} >= ${value}`;
};

String.prototype.lessThanOrEqual = function(this: string, value: string): string {
    return `${this} <= '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.lessThanOrEqualNumber = function(this: string, value: number): string {
    return `${this} <= ${value}`;
};

String.prototype.in = function(this: string, value: Array<string>): string {
    return `${this} IN ('${value.join("', '").replace(/'/g, "\\'")}')`;
};

String.prototype.inNumbers = function(this: string, value: Array<number>): string {
    return `${this} IN (${value.join(', ')})`;
};

String.prototype.notIn = function(this: string, value: Array<string>): string {
    return `${this} NOT IN ('${value.join("', '").replace(/'/g, "\\'")}')`;
};

String.prototype.notInNumbers = function(this: string, value: Array<number>): string {
    return `${this} NOT IN (${value.join(', ')})`;
};

String.prototype.is = function(this: string, value: string): string {
    return `${this} IS '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.isNumber = function(this: string, value: number): string {
    return `${this} IS ${value}`;
};

String.prototype.isNot = function(this: string, value: string | null): string {
    if (value === null) return `${this} IS NOT NULL`;
    return `${this} IS NOT '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.isNotNumber = function(this: string, value: number): string {
    return `${this} IS NOT ${value}`;
};

String.prototype.like = function(this: string, value: string): string {
    return `${this} LIKE '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.ilike = function(this: string, value: string): string {
    return `${this} ILIKE '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.notLike = function(this: string, value: string): string {
    return `${this} NOT LIKE '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.between = function(this: string, value: string): string {
    return `${this} BETWEEN '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.betweenNumbers = function(this: string, value: number): string {
    return `${this} BETWEEN ${value}`;
};

String.prototype.notBetween = function(this: string, value: string): string {
    return `${this} NOT BETWEEN '${value.replace(/'/g, "\\'")}'`;
};

String.prototype.notBetweenNumbers = function(this: string, value: number): string {
    return `${this} NOT BETWEEN ${value}`;
};

String.prototype.ascending = function(this: string): string {
    return `${this} ASC`;
};

String.prototype.descending = function(this: string): string {
    return `${this} DESC`;
};