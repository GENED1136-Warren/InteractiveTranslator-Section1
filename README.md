# China: Power and Civilization - Interactive Translation System
# 中華文明 · 互動翻譯系統

A sophisticated web application that provides interactive translations between Classical Chinese, Modern Chinese, and English, enhanced with AI-powered contextual analysis using the Claude Code SDK.

## ✨ Features

### Core Translation Capabilities
- **Flexible Language Selection**: Choose any language as input and translate to any combination of the others
- **Bidirectional Translation**: Supports all 9 translation combinations between Ancient Chinese, Modern Chinese, and English
- **Dynamic Panel Display**: Shows only selected languages in a responsive layout (1-3 columns)
- **Ancient Chinese Generation**: Can generate authentic Classical Chinese (文言文) with proper particles from Modern Chinese or English

### Interactive Features
- **Multi-Sentence Selection**: Hold Cmd/Ctrl while clicking to select multiple sentences for analysis
- **Synchronized Highlighting**: Click any sentence to highlight corresponding translations across all panels
- **AI-Powered Queries**: Ask questions about selected sentences using Claude Code SDK
- **Model Selection**: Choose between Claude Opus (higher quality) or Claude Sonnet (faster) models

### Design & UX
- **Chinese-Inspired Aesthetic**: Professional interface with traditional Chinese design elements
- **Color-Coded Panels**: 
  - Ancient Chinese: Deep red borders
  - Modern Chinese: Jade green borders
  - English: Blue borders
- **Visual Feedback**: Golden highlights for selected text, gradient backgrounds, and smooth animations
- **Bilingual Interface**: Chinese and English labels throughout

## 🚀 Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to:
```
http://localhost:3001
```

## 📖 Usage Guide

### Basic Translation
1. **Select Input Language**: Choose from Ancient Chinese (古文), Modern Chinese (现代中文), or English
2. **Select Output Languages**: Check one or more target languages (input language is automatically excluded)
3. **Choose AI Model**: 
   - Claude Opus (Latest): Higher quality, more nuanced translations
   - Claude Sonnet (Latest): Faster processing, efficient for simpler texts
4. **Enter Text**: Type or paste your text, or click "Load Sample" for the provided Classical Chinese text
5. **Translate**: Click the "翻譯 · Translate" button

### Advanced Features

#### Multi-Sentence Selection
- **Single Click**: Select one sentence
- **Cmd/Ctrl + Click**: Add or remove sentences from selection
- **Visual Indicator**: Bottom-right corner shows count when multiple sentences selected

#### AI-Powered Analysis
With sentences selected:
1. Type your question in the query box
2. Click "問 · Ask AI" to get contextual analysis
3. The AI considers the full text context when answering

## 🏗️ Technical Architecture

### Backend (`server.js`)
- Express server with three main endpoints:
  - `/api/segment-and-translate`: Processes text with XML sentence markers
  - `/api/query-claude`: Handles AI queries using Claude Code SDK
  - Model selection support for both endpoints

### Frontend (`index.html`)
- Single-page application with vanilla JavaScript
- Dynamic panel generation based on language selection
- Multi-sentence selection with Set-based state management
- Chinese-inspired CSS with custom properties for theming

### Translation Process
1. Text segmented into sentences with XML markers (`<s1>`, `<s2>`, etc.)
2. Full context maintained for accurate translation
3. Parallel display with synchronized sentence alignment
4. Support for Classical Chinese particles (之, 乎, 者, 也, etc.)

## 🔧 API Reference

### POST /api/segment-and-translate
Request:
```json
{
  "text": "Input text",
  "inputLanguage": "ancient|modern|english",
  "outputLanguages": ["ancient", "modern", "english"],
  "model": "opus|sonnet"
}
```

Response:
```json
{
  "original": {
    "language": "ancient",
    "text": "<s1>sentence1</s1><s2>sentence2</s2>..."
  },
  "translations": {
    "modern": "<s1>translation1</s1><s2>translation2</s2>...",
    "english": "<s1>translation1</s1><s2>translation2</s2>..."
  }
}
```

### POST /api/query-claude
Request:
```json
{
  "originalText": "Full original text",
  "highlightedSentence": "Selected sentence(s)",
  "userQuestion": "User's question",
  "model": "opus|sonnet"
}
```

Response:
```json
{
  "response": "Claude's detailed analysis"
}
```

## 🎨 Design Philosophy

The system combines traditional Chinese aesthetics with modern UX principles:
- **Colors**: Deep reds, golds, and jade greens inspired by Chinese art
- **Typography**: Noto Serif SC for Classical Chinese, clean sans-serif for modern text
- **Layout**: Balanced, harmonious arrangement reflecting Chinese design principles
- **Interactions**: Smooth transitions and subtle animations for professional feel

## 📚 Sample Text

The included `translate_this_text.txt` contains a Classical Chinese philosophical text about governance and the relationship between China (中國) and foreign peoples (夷狄), exploring concepts of righteousness (義), reputation (名), and adaptability (權).

## 🛠️ Dependencies

- `express`: Web server framework
- `@anthropic-ai/claude-code`: Claude Code SDK for AI integration
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management

## 🌟 Key Improvements

### From Original System
1. **Enhanced Branding**: "China: Power and Civilization" title with bilingual elements
2. **Model Selection**: Choose between Opus and Sonnet models for speed/quality tradeoff
3. **Multi-Sentence Selection**: Cmd/Ctrl+Click for selecting multiple sentences
4. **Professional Chinese Aesthetic**: Traditional design elements and color scheme
5. **Better Visual Feedback**: Golden highlights, gradient backgrounds, status indicators

## 📝 Notes

- The system uses the Claude Code SDK's streaming responses for real-time feedback
- Translation maintains full context awareness for accurate cultural and linguistic rendering
- XML markers ensure precise alignment between language versions
- Multi-sentence queries provide richer contextual analysis
- Model selection allows users to balance quality vs speed based on their needs

## 🤝 Contributing

This is an educational project for exploring Classical Chinese texts and translation technology. Contributions that enhance the translation accuracy, UI/UX, or educational value are welcome.

---

*Powered by Claude AI · 中西合璧 · Bridging Ancient Wisdom and Modern Technology*