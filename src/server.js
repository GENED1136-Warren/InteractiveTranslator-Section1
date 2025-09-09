import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-code';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// Serve static files from src directory
app.use(express.static(__dirname));
// Serve sample text files
app.use('/sample_text', express.static(join(__dirname, 'sample_text')));
// Also serve test files from tests directory
app.use('/tests', express.static(join(__dirname, '..', 'tests')));

// Helper function to create translation prompts based on language combinations
function createTranslationPrompt(text, inputLanguage, outputLanguages) {
    const languageDescriptions = {
        ancient: 'Classical/Ancient Chinese',
        modern: 'Modern Simplified Chinese',
        english: 'English'
    };
    
    let prompt = `You are an expert translator. Translate the following ${languageDescriptions[inputLanguage]} text.

IMPORTANT RULES:
1. Split the text into logical sentences or phrases (use punctuation as guide)
2. Mark each sentence with XML tags: <s1>, <s2>, <s3>, etc.
3. Maintain the SAME sentence numbers across all versions
4. Translate with full context awareness - consider the whole text's meaning
5. For Modern Chinese, use simplified characters
6. For Ancient/Classical Chinese, use traditional characters and classical grammar (文言文)
7. Preserve the meaning and style appropriate to each target language

Your output must be EXACTLY in this format:

${inputLanguage.toUpperCase()}${inputLanguage === 'ancient' ? ' (文言文)' : ''}:
<s1>first sentence in original ${languageDescriptions[inputLanguage]}</s1><s2>second sentence</s2>...
`;

    // Add output sections based on selected languages
    outputLanguages.forEach(lang => {
        const langName = lang.toUpperCase();
        if (lang === 'ancient') {
            prompt += `\nANCIENT (文言文):
<s1>first sentence in Classical/Ancient Chinese with particles like 之乎者也</s1><s2>second sentence in Classical Chinese</s2>...`;
        } else if (lang === 'modern') {
            prompt += `\nMODERN:
<s1>first sentence in Modern Chinese</s1><s2>second sentence in Modern Chinese</s2>...`;
        } else if (lang === 'english') {
            prompt += `\nENGLISH:
<s1>first sentence in English</s1><s2>second sentence in English</s2>...`;
        }
    });

    prompt += `\n\nText to translate:\n${text}`;
    
    return prompt;
}

// Parse translation response based on language types
function parseTranslationResponse(response, inputLanguage, outputLanguages) {
    const result = {
        original: {
            language: inputLanguage,
            text: ''
        },
        translations: {}
    };
    
    // Check if response is valid
    if (!response || typeof response !== 'string') {
        console.error('Invalid response format:', response);
        return result;
    }
    
    // Extract input text based on input language
    let inputPattern;
    if (inputLanguage === 'ancient') {
        inputPattern = /ANCIENT(?:\s*\(文言文\))?:\s*(.*?)(?=\n\n[A-Z]+|\n[A-Z]+(?:\s*\(|:)|$)/s;
    } else if (inputLanguage === 'modern') {
        inputPattern = /MODERN:\s*(.*?)(?=\n\n[A-Z]+|\n[A-Z]+(?:\s*\(|:)|$)/s;
    } else if (inputLanguage === 'english') {
        inputPattern = /ENGLISH:\s*(.*?)(?=\n\n[A-Z]+|\n[A-Z]+(?:\s*\(|:)|$)/s;
    }
    
    const inputMatch = response.match(inputPattern);
    if (inputMatch) {
        result.original.text = inputMatch[1].trim();
    }
    
    // Extract each output language
    outputLanguages.forEach(lang => {
        let pattern;
        if (lang === 'ancient') {
            pattern = /ANCIENT(?:\s*\(文言文\))?:\s*(.*?)(?=\n[A-Z]+:|$)/s;
        } else if (lang === 'modern') {
            pattern = /MODERN:\s*(.*?)(?=\n[A-Z]+:|$)/s;
        } else if (lang === 'english') {
            pattern = /ENGLISH:\s*(.*?)(?=\n[A-Z]+:|$)/s;
        }
        
        const match = response.match(pattern);
        if (match) {
            result.translations[lang] = match[1].trim();
        }
    });
    
    return result;
}

// Helper function to perform translation with retry logic
async function performTranslationWithRetry(translationPrompt, systemPrompt, model, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Translation attempt ${attempt}/${maxRetries}`);
            let translationResult = '';
            let messageCount = 0;
            
            // Map model selection to Claude Code SDK format
            const modelOption = model === 'sonnet' ? 'sonnet' : undefined;
            
            // Add timeout handling
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Translation timeout after 30 seconds')), 30000);
            });
            
            const translationPromise = (async () => {
                for await (const message of query({
                    prompt: translationPrompt,
                    options: {
                        ...(modelOption && { model: modelOption }),
                        maxTurns: 3,
                        systemPrompt: systemPrompt,
                        allowedTools: [],
                        disallowedTools: ['TodoWrite', 'Task', 'WebSearch']
                    }
                })) {
                    messageCount++;
                    console.log(`Message ${messageCount} - Type: ${message.type}`);
                    
                    if (message.type === "result" && message.result) {
                        translationResult = message.result;
                        console.log('Got translation result from result message');
                    } else if (message.type === "assistant" && message.message && message.message.content) {
                        const content = message.message.content;
                        if (Array.isArray(content)) {
                            for (const item of content) {
                                if (item.type === 'text' && item.text && !translationResult) {
                                    translationResult = item.text;
                                    console.log('Got translation from assistant message');
                                }
                            }
                        } else if (typeof content === 'string' && !translationResult) {
                            translationResult = content;
                            console.log('Got translation from assistant string content');
                        }
                    }
                }
                return translationResult;
            })();
            
            // Race between translation and timeout
            translationResult = await Promise.race([translationPromise, timeoutPromise]);
            
            if (!translationResult) {
                throw new Error('No translation result received from Claude');
            }
            
            console.log(`Translation succeeded on attempt ${attempt}`);
            return translationResult;
            
        } catch (error) {
            console.error(`Translation attempt ${attempt} failed:`, error.message);
            lastError = error;
            
            if (attempt < maxRetries) {
                // Wait before retrying (exponential backoff)
                const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    throw lastError || new Error('Translation failed after all retries');
}

// Endpoint to segment and translate text with XML markers
app.post('/api/segment-and-translate', async (req, res) => {
    const { text, inputLanguage, outputLanguages, model } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    
    if (!inputLanguage) {
        return res.status(400).json({ error: 'Input language is required' });
    }
    
    if (!outputLanguages || outputLanguages.length === 0) {
        return res.status(400).json({ error: 'At least one output language is required' });
    }

    try {
        console.log('Translation request:', { 
            textLength: text.length, 
            preview: text.substring(0, 100), 
            inputLanguage, 
            outputLanguages,
            model 
        });
        
        const translationPrompt = createTranslationPrompt(text, inputLanguage, outputLanguages);
        
        let systemPrompt = '';
        if (inputLanguage === 'ancient') {
            systemPrompt = "You are an expert in Classical Chinese (文言文) literature and translation. Provide accurate translations that preserve cultural and historical context. When translating TO Ancient Chinese, use authentic classical grammar with particles like 之, 乎, 者, 也, 矣, 焉, 哉, 而, 於, 為, etc.";
        } else if (inputLanguage === 'modern') {
            systemPrompt = "You are an expert translator specializing in Modern Chinese. Provide natural, fluent translations. When translating TO Ancient Chinese (文言文), use authentic classical grammar and vocabulary with appropriate particles.";
        } else {
            systemPrompt = "You are an expert translator from English. Provide accurate, culturally appropriate translations. When translating TO Ancient Chinese (文言文), use authentic classical grammar with particles like 之, 乎, 者, 也, etc.";
        }
        
        // Perform translation with retry logic
        const translationResult = await performTranslationWithRetry(
            translationPrompt, 
            systemPrompt, 
            model
        );
        
        console.log('Final translation result received, length:', translationResult.length);

        // Parse the result based on the language configuration
        const parsedResult = parseTranslationResponse(translationResult, inputLanguage, outputLanguages);
        
        // Validate that we got all requested translations
        for (const lang of outputLanguages) {
            if (!parsedResult.translations[lang]) {
                console.warn(`Warning: Translation for ${lang} not found in response`);
                // Try to extract with a more flexible pattern
                const flexiblePattern = new RegExp(`${lang.toUpperCase()}:?\\s*(.*)`, 'is');
                const flexMatch = translationResult.match(flexiblePattern);
                if (flexMatch) {
                    parsedResult.translations[lang] = flexMatch[1].trim();
                }
            }
        }
        
        res.json(parsedResult);

    } catch (error) {
        console.error('Translation error:', error);
        console.error('Full error stack:', error.stack);
        console.error('Request details:', { 
            inputLanguage, 
            outputLanguages, 
            model,
            textLength: text?.length || 0
        });
        
        // Provide more specific error messages
        let errorMessage = 'Translation failed';
        let statusCode = 500;
        
        if (error.message.includes('timeout')) {
            errorMessage = 'Translation timed out. Please try again with shorter text or select fewer output languages.';
            statusCode = 504;
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            statusCode = 429;
        } else if (error.message.includes('No translation result')) {
            errorMessage = 'Claude did not return a translation. Please try again.';
        }
        
        res.status(statusCode).json({ 
            error: errorMessage, 
            details: error.message || 'Unknown error occurred',
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint for Claude queries about selected text
app.post('/api/query-claude', async (req, res) => {
    const { originalText, highlightedSentence, userQuestion, conversationHistory, model } = req.body;
    
    if (!originalText || !highlightedSentence || !userQuestion) {
        return res.status(400).json({ 
            error: 'originalText, highlightedSentence, and userQuestion are required' 
        });
    }

    try {
        // Build conversation context if history exists
        let conversationContext = '';
        if (conversationHistory && conversationHistory.length > 0) {
            conversationContext = '\n\nPrevious conversation:\n';
            conversationHistory.forEach(msg => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                conversationContext += `${role}: ${msg.content}\n\n`;
            });
            conversationContext += 'Current question:\n';
        }
        
        const queryPrompt = `
<original_text>
${originalText}
</original_text>

Focus on this sentence/text: <highlighted_sentence>${highlightedSentence}</highlighted_sentence>
${conversationContext}
Answer this question: <user_question>${userQuestion}</user_question>

Please provide a detailed answer about the highlighted text in the context of the full document. Consider linguistic, cultural, and historical aspects as relevant. Use markdown formatting for better readability.`;

        let queryResult = '';
        
        // Map model selection to Claude Code SDK format
        // Use "sonnet" directly or undefined for default (opus)
        const modelOption = model === 'sonnet' ? 'sonnet' : undefined; // undefined uses default (opus)
        
        for await (const message of query({
            prompt: queryPrompt,
            options: {
                ...(modelOption && { model: modelOption }), // Only add model if specified
                maxTurns: 3,
                systemPrompt: "You are an expert in linguistics, Classical Chinese literature, and translation. Provide insightful explanations that help users understand the text deeply across languages and cultures.",
                allowedTools: ["WebSearch"], // Allow web search for historical context
                disallowedTools: ['TodoWrite', 'Task'] // Disallow task management tools
            }
        })) {
            console.log('Query message type:', message.type);
            if (message.type === "result") {
                queryResult = message.result;
            } else if (message.type === "assistant" && message.message && message.message.content) {
                // Also capture assistant text responses for queries
                const content = message.message.content;
                if (Array.isArray(content)) {
                    for (const item of content) {
                        if (item.type === 'text' && item.text) {
                            if (!queryResult) {
                                queryResult = item.text;
                            }
                        }
                    }
                }
            }
        }

        res.json({ response: queryResult });

    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ 
            error: 'Query failed', 
            details: error.message 
        });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});