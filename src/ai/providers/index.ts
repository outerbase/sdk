import { OperationResponse } from "../../connections"

export type AiConversation = {
    id: string
    messages: AiMessage[]
}

export type AiMessage = {
    id: string
    text: string
    from: 'user' | 'system' | 'role'
}

export interface AiProvider {
    startConversation: (systemPrompt: string, message: string) => Promise<OperationResponse>
    continueConversation?: (message: string) => Promise<OperationResponse>

    // Optional methods
    updateSystemPrompt?: (message: string) => Promise<OperationResponse>
    removeMessage?: (conversationId: string, messageId: string) => Promise<OperationResponse>
}
