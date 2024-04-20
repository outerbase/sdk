export interface PostsType {
    id: number;
    title: string;
    content: string;
    userId: number;
}

export class Posts implements PostsType {
    id: number;
    title: string;
    content: string;
    userId: number;
    
    constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.content = data.content;
        this.userId = data.userId;
    }
}