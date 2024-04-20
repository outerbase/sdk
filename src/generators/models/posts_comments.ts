export interface PostsCommentsType {
    id: number;
    title: string;
    content: string;
    usersId: number;
}

export class PostsComments implements PostsCommentsType {
    id: number;
    title: string;
    content: string;
    usersId: number;
    
    constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.content = data.content;
        this.usersId = data.users_id;
    }
}