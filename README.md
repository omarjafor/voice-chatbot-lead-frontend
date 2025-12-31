# Voice-Based Lead Collection Chatbot

A full-stack application that collects lead information through voice interactions. The system uses browser-based speech recognition and text-to-speech capabilities to create a conversational experience for gathering user details.

## Overview

This project demonstrates:
- **Backend**: FastAPI-based REST API with conversation state management
- **Frontend**: Next.js application with Web Speech API integration
- **Voice Features**: Speech recognition (STT) and speech synthesis (TTS)
- **Lead Management**: Structured data collection and storage

## Tech Stack

### Backend
- **Python 3.12**
- **FastAPI** - Modern, fast web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **pytest** - Testing framework

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components
- **Web Speech API** - Voice capabilities

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application
│   ├── test_main.py         # Backend tests
│   ├── requirements.txt     # Python dependencies
│   └── README.md           # Backend documentation
├── app/
│   ├── page.tsx            # Main chat interface
│   ├── layout.tsx          # App layout
│   └── api/
│       └── health/
│           └── route.ts    # Health check endpoint
├── components/             # UI components
├── .env.local.example     # Environment variables template
└── README.md              # This file
```

## Getting Started

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm/yarn/pnpm
- Modern web browser with Web Speech API support (Chrome, Edge, Safari)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create environment file:
```bash
cp .env.local.example .env.local
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

## Usage

1. **Start Both Servers**: Ensure both backend (port 8000) and frontend (port 3000) are running
2. **Open Browser**: Navigate to `http://localhost:3000`
3. **Start Chat**: Click "Start Chat" to begin the conversation
4. **Speak**: Click the microphone button and speak your response
5. **Listen**: The agent's questions will be read aloud automatically
6. **Complete**: Follow through the conversation flow to submit your lead

### Conversation Flow

The chatbot follows this sequence:
1. Asks for your name
2. Asks for your email
3. Asks what service you're interested in
4. Thanks you and saves the lead information

## Features

### Voice Capabilities

- **Speech Recognition**: Browser-based voice input using Web Speech API
- **Text-to-Speech**: Automatic reading of agent messages
- **Audio Toggle**: Mute/unmute voice output
- **Visual Feedback**: Real-time indicators for listening and speaking states

### Backend Features

- RESTful API design
- Session-based conversation management
- Step-by-step flow control
- In-memory data storage (easily replaceable with database)
- CORS enabled for development
- Comprehensive error handling

### Frontend Features

- Clean, responsive interface
- Real-time chat display
- Voice control buttons
- Error handling and user feedback
- Dark/light mode support (via system preferences)

## API Endpoints

### Start Chat Session
```http
POST /api/chat/start
```
Response:
```json
{
  "session_id": "uuid",
  "message": "What is your name?"
}
```

### Send Message
```http
POST /api/chat/message
Content-Type: application/json

{
  "session_id": "uuid",
  "message": "John Doe"
}
```
Response:
```json
{
  "session_id": "uuid",
  "agent_message": "What is your email?",
  "is_complete": false,
  "current_step": 1
}
```

### Get All Leads
```http
GET /api/leads
```

For complete API documentation, visit `http://localhost:8000/docs` when the backend is running.

## Testing

### Backend Tests

Run the test suite:
```bash
cd backend
pytest test_main.py -v
```

Run with coverage:
```bash
pytest test_main.py --cov=main --cov-report=term-missing
```

### Test Coverage

The backend includes tests for:
- Session creation
- Message processing
- Complete conversation flow
- Lead retrieval
- Error handling

## Browser Compatibility

### Speech Recognition Support
- ✅ Chrome/Edge (full support)
- ✅ Safari (iOS 14.5+, macOS Big Sur+)
- ❌ Firefox (limited/no support)

### Speech Synthesis Support
- ✅ All modern browsers

**Note**: Chrome or Edge is recommended for the best experience.

## Development Notes

### Adding More Questions

To extend the conversation, modify `CONVERSATION_STEPS` in `backend/main.py`:

```python
CONVERSATION_STEPS = [
    {"step": 0, "field": "name", "question": "What is your name?"},
    {"step": 1, "field": "email", "question": "What is your email?"},
    {"step": 2, "field": "phone", "question": "What is your phone number?"},  # New
    {"step": 3, "field": "interest", "question": "What service are you interested in?"},
    {"step": 4, "field": "complete", "question": "Thank you!"}
]
```

### Database Integration

Replace in-memory storage with a database:

1. Install database driver (e.g., SQLAlchemy + PostgreSQL)
2. Create models for `Session` and `Lead`
3. Replace dictionary operations in `main.py`
4. Add database connection in startup event

### AI Integration

The system is designed to easily integrate AI services:

- **OpenAI GPT**: Add to `process_user_message()` for dynamic responses
- **Intent Recognition**: Parse user input for better understanding
- **Sentiment Analysis**: Gauge user emotions during conversation
- **Smart Routing**: Direct leads based on their responses

### Voice Customization

Modify speech synthesis settings in `app/page.tsx`:

```typescript
const utterance = new SpeechSynthesisUtterance(text)
utterance.rate = 0.9    // Speed (0.1 to 10)
utterance.pitch = 1     // Pitch (0 to 2)
utterance.volume = 1    // Volume (0 to 1)
```

## Deployment

### Backend Deployment

Deploy to any platform supporting Python/FastAPI:
- **Railway**: Simple Python deployments
- **Render**: Free tier available
- **AWS/GCP/Azure**: Containerized deployments
- **Heroku**: Python buildpack support

### Frontend Deployment

Deploy to Vercel (recommended):
```bash
npm install -g vercel
vercel
```

Or other platforms:
- **Netlify**: Next.js support
- **AWS Amplify**: Full-stack hosting
- **Self-hosted**: Using Docker

### Environment Variables

For production, set:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- Backend CORS origins: Add your frontend domain

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (needs 3.8+)
- Verify virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Verify CORS settings in `backend/main.py`

### Voice not working
- Use Chrome or Edge browser
- Check microphone permissions
- Verify HTTPS or localhost (required for Web Speech API)
- Check browser console for errors

### No audio output
- Check system volume and browser permissions
- Click the speaker icon to ensure audio is enabled
- Try a different browser

## Security Considerations

This is a development/demo application. For production:

- Add authentication/authorization
- Implement rate limiting
- Use HTTPS everywhere
- Validate and sanitize all inputs
- Add CSRF protection
- Use environment variables for sensitive data
- Implement database with proper backups
- Add logging and monitoring

## Future Enhancements

Potential improvements:
- Database integration (PostgreSQL, MongoDB)
- User authentication system
- Admin dashboard for viewing leads
- Email notifications for new leads
- Multi-language support
- CRM integration (Salesforce, HubSpot)
- Advanced analytics and reporting
- WebSocket for real-time updates
- Mobile app version

## License

MIT License - Feel free to use this project as a starting point for your own applications.

## Assumptions Made

- Users have access to a microphone
- Modern browser with Web Speech API support
- Development environment (not production-ready security)
- In-memory storage is acceptable for demo purposes
- English language for voice recognition
- Standard web development tooling available

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs for API errors
3. Check browser console for frontend errors
4. Ensure all dependencies are correctly installed

## Acknowledgments

- **FastAPI** for the excellent Python framework
- **Next.js** for the React framework
- **shadcn/ui** for beautiful UI components
- **Web Speech API** for browser-based voice capabilities
