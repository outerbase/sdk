import { OperationResponse } from "src/connections";
import { AiConversation, AiMessage, AiProvider } from "./index";

export class CloudflareAi implements AiProvider {
    model: string = "llama-3-8b-instruct";
    apiKey: string = "YOUR_CLOUDFLARE_API_KEY";

    constructor(_?: { model: string, apiKey: string }) {
        if (!_) return;
        this.model = _.model;
        this.apiKey = _.apiKey;
    }

    async startConversation(systemPrompt: string, message: string): Promise<OperationResponse> {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/68599e3cad89422e9c74bd9b829754bd/ai/run/@cf/meta/${this.model}`,
            {
                headers: { Authorization: `Bearer ${this.apiKey}` },
                method: "POST",
                body: JSON.stringify({
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
        console.log('Result: ', result);
        return {
            success: result.success,
            error: result.errors,
            data: result.result.response
        };
    }

    continueConversation(message: string): Promise<any> {
        return Promise.resolve();
    }
}