export interface PersonType {
    firstName: string;
    lastName: string;
    position: string;
    avatar: number;
}

export class Person implements PersonType {
    firstName: string;
    lastName: string;
    position: string;
    avatar: number;
    
    constructor(data: any) {
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.position = data.position;
        this.avatar = data.avatar;
    }
}