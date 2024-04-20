export interface UsersType {
    id: number;
    name: string;
    email: string;
}

export class Users implements UsersType {
    id: number;
    name: string;
    email: string;
    
    constructor(data: any) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
    }
}