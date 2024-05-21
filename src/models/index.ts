export class BaseTable {
    _name: string;
    _schema?: string;

    constructor(_: {
        _name: string,
        _schema?: string
    }) {
        this._name = _._name;
        this._schema = _._schema;
    }
}
