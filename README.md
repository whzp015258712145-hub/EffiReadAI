# EffiReadAI 📚

**EffiReadAI** is an intelligent PDF reading and summarization assistant designed to enhance your learning and research efficiency through the power of AI. It is more than just a reader—it's a "Digital Professor" ready to guide you through any document.

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
