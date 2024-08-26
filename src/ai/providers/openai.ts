import { OperationResponse } from "src/connections";
import { AiConversation, AiMessage, AiProvider } from "./index";

export class OpenAi implements AiProvider {
    model: string = "gpt-3.5-turbo";
    apiKey: string = "YOUR_OPENAI_API_KEY";

    constructor(_?: { model: string, apiKey: string }) {
        if (!_) return;
        this.model = _.model;
        this.apiKey = _.apiKey;
    }

    async startConversation(systemPrompt: string, message: string): Promise<OperationResponse> {
        const response = await fetch(
            `https://api.openai.com/v1/chat/completions`,
            {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                }),
            }
        );

        const result = await response.json();
        
        return {
            success: response.ok,
            error: result.error ? result.error : null,
            data: result.choices?.[0]?.message?.content || ""
        };
    }
}
