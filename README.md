# EffiReadAI 📚

**EffiReadAI** isn’t just another AI summarizer—it’s the Pro Max evolution of how you interact with knowledge. While standard workflows often trap you in a tedious cycle of manual screenshots and unreliable AI hallucinations, we’ve built a 'Digital Professor' that truly respects your time. By eliminating the friction of manual captures and sharpening the accuracy of every insight, we deliver pure, unadulterated efficiency. Welcome to a smarter way to read.

## ✨ Core Features

- **Professor Persona**: The AI acts as a mentor, guiding you through complex topics in an easy-to-understand yet profound way, perfectly balancing detail and brevity.
- **Smart PDF Rendering**: Smooth multi-page viewing and fluid navigation for a superior reading experience.
- **Real-time Streaming**: Powered by streaming responses, AI insights appear instantly as they are generated.
- **Multi-Model Support**: Deeply integrated with Gemini with broad compatibility for OpenAI and DeepSeek models.
- **Production-Ready Security**: Built-in rate limiting, security headers (Helmet), and sensitive data protection.
- **Fully Responsive**: A mobile-optimized layout that allows for high-productivity reading on smartphones and tablets.

## 🚀 Quick Start

### Prerequisites
- Install [Node.js](https://nodejs.org/) (LTS version recommended).
- Obtain an [API key](https://aistudio.google.com/app/apikey) (Gemini recommended).
  
### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/EffiReadAI.git
   cd EffiReadAI
   ```

2. **Environment Configuration**
   - In the `server/` directory, rename `.env.example` to `.env` and insert your API Key.
   - In the `client/` directory, ensure the environment variables point to your backend API.

3. **Launch the Application**
   Run the startup script from the root directory:
   ```bash
   ./start-app.command
   ```
   *Alternatively, run `npm install` and `npm run dev` in the `client` folder, and `npm install` and `node index.js` in the `server` folder.*

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, Google Generative AI SDK.
- **Security**: Helmet, Express Rate Limit.

## 📄 License
This project is licensed under the [MIT License](LICENSE).
