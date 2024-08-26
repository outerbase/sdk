import { OperationResponse } from "src/connections";
import { AiConversation, AiMessage, AiProvider } from "./index";

export class ClaudeAi implements AiProvider {
    model: string = "claude-v1";
    apiKey: string = "YOUR_ANTHROPIC_API_KEY";

    constructor(_?: { model: string, apiKey: string }) {
        if (!_) return;
        this.model = _.model;
        this.apiKey = _.apiKey;
    }

    async startConversation(systemPrompt: string, message: string): Promise<OperationResponse> {
        const response = await fetch(
            `https://api.anthropic.com/v1/complete`,
            {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({
                    model: this.model, // Specify the Claude model version
                    prompt: `${systemPrompt}\n\nHuman: ${message}\n\nAssistant:`,
                    max_tokens_to_sample: 300,
                    stop_sequences: ["\n\nHuman:"]
                }),
            }
        );

        const result = await response.json();
        console.log('Result: ', result);
        return {
            success: response.ok,
            error: result.error ? result.error : undefined,
            data: result.completion || ""
        };
    }
}
