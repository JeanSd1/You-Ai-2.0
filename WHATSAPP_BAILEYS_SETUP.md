# WhatsApp Baileys Integration Setup Guide

## Overview

This document explains how to set up and use the Baileys-based WhatsApp integration for the You-Ai platform. This integration allows the system to:

- Connect to WhatsApp Web as a client
- Generate QR codes for authentication
- Receive incoming messages from WhatsApp
- Route messages to AI for responses
- Send AI-generated responses back through WhatsApp

## What is Baileys?

Baileys is a WhatsApp Web automation library that allows you to interact with WhatsApp by simulating a web client. It does NOT use the official WhatsApp Business API.

### Key Characteristics:
- **Free**: No licensing costs
- **Real WhatsApp**: Uses actual WhatsApp Web
- **Easy Setup**: Just scan a QR code
- **Limitations**: 
  - Subject to WhatsApp rate limiting
  - Account risks if detected as bot
  - Less stable than official API

## Installation Steps

### 1. Install Baileys Package

```bash
cd backend
npm install @whiskeysockets/baileys
```

### 2. Files Created/Modified

**New Files:**
- `backend/services/whatsappService.js` - WhatsApp service with Baileys integration
- `backend/controllers/whatsappBaileyController.js` - API endpoints for QR and status
- `backend/routes/whatsappBailey.js` - Routes for WhatsApp endpoints

**Files to Modify:**
- `backend/server.js` - Add WhatsApp initialization

### 3. Update server.js

Add the following to `backend/server.js` after creating the Express app:

```javascript
// Initialize WhatsApp connection on startup
const { initializeWhatsApp } = require('./services/whatsappService');

// ... after app.use(cors()) and other middleware ...

// Register WhatsApp Bailey routes
app.use('/api/whatsapp-bailey', require('./routes/whatsappBailey'));

// ... then when starting the server ...

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize WhatsApp connection
  try {
    await initializeWhatsApp();
    console.log('WhatsApp service initialized');
  } catch (err) {
    console.error('Failed to initialize WhatsApp:', err);
  }
});
```

### 4. Environment Variables (Optional)

No specific environment variables required for Baileys, but ensure you have:

```env
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
PORT=3001
NODE_ENV=development
```

## Usage

### Starting WhatsApp Connection

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. The WhatsApp service will initialize automatically

3. When QR code is ready, retrieve it via API:
   ```bash
   curl http://localhost:3001/api/whatsapp-bailey/qr
   ```

### Getting QR Code

**Endpoint:** `GET /api/whatsapp-bailey/qr`

**Response:**
```json
{
  "success": true,
  "qr": "data:image/png;base64,..."
}
```

The QR code is returned as a base64 data URL that can be displayed in the frontend.

### Checking Connection Status

**Endpoint:** `GET /api/whatsapp-bailey/status`

**Response:**
```json
{
  "success": true,
  "connected": true,
  "qrAvailable": false
}
```

### Scanning QR Code

1. Open WhatsApp on your phone
2. Go to Settings → Linked Devices (or similar)
3. Tap "Link a Device"
4. Scan the QR code displayed on your admin dashboard
5. Approve the connection on your phone

### Incoming Messages Flow

1. User sends message to the WhatsApp number
2. Baileys receives the message
3. System extracts `[client:ID|prompt:ID]` tag from message
4. Fetches client config and prompt
5. Calls AI service with the prompt
6. Sends AI response back to user

### QR Code Generation for Clients

The existing QR code generation (`/api/qrcode/generate`) creates wa.me links:

- These are NOT for server connection
- Clients use these to start conversations
- Messages sent include the `[client:ID|prompt:ID]` tag
- Server's Baileys connection receives these messages

## Frontend Integration

### Display QR Code

```javascript
// In your admin dashboard
const response = await fetch('http://localhost:3001/api/whatsapp-bailey/qr');
const data = await response.json();

if (data.success) {
  document.getElementById('qr-container').innerHTML = 
    `<img src="${data.qr}" alt="WhatsApp QR Code" />`;
}
```

### Check Connection Status

```javascript
const statusResponse = await fetch('http://localhost:3001/api/whatsapp-bailey/status');
const status = await statusResponse.json();

if (status.connected) {
  console.log('WhatsApp is connected!');
}
```

## Troubleshooting

### "QR code not available"
- The server hasn't initialized yet, wait a few seconds
- Check backend console for errors
- Restart the backend server

### "No client found for phone"
- Ensure the phone number matches what's stored in database
- Check that the message includes proper `[client:ID|prompt:ID]` tag

### Connection keeps disconnecting
- This is normal if WhatsApp detects unusual activity
- Scan QR code again to re-authenticate
- Check WhatsApp account for security alerts

### Messages not being received
- Check that Baileys is initialized (look for console logs)
- Verify phone has internet connection
- Ensure backend can connect to database
- Check client record for AI API key configuration

### High CPU/Memory Usage
- Baileys can be resource-intensive
- Consider running on separate server for production
- Implement message rate limiting

## Architecture

```
┌─────────────┐
│  WhatsApp   │
│   Client    │
└──────┬──────┘
       │ messages
       ▼
┌─────────────────────────────┐
│   Baileys (whatsappService) │
│  - Handle QR Generation     │
│  - Receive Messages         │
└─────────────┬───────────────┘
              │
              ▼
┌──────────────────────────────┐
│  WhatsApp Message Handler    │
│  - Parse Client Tag          │
│  - Fetch Config              │
│  - Call AI Service           │
└──────────────┬───────────────┘
               │
               ▼
        ┌─────────────┐
        │  AI Service │
        │ (ChatGPT)   │
        └──────┬──────┘
               │ response
               ▼
        ┌─────────────────┐
        │ Send via Baileys│
        │ Back to Client  │
        └─────────────────┘
```

## Security Considerations

1. **WhatsApp Account Risk**: Using Baileys may trigger WhatsApp's security systems
   - Use a dedicated business account
   - Monitor for suspicious activity alerts
   - Be prepared to authenticate frequently

2. **API Key Security**: Always encrypt client API keys in database
   - The system uses encryption/decryption utilities
   - Keys are never logged or exposed in responses

3. **Rate Limiting**: Implement rate limiting to avoid WhatsApp blocks
   - Currently not implemented, add if needed
   - WhatsApp has strict message limits

## Production Considerations

For production deployment, consider:

1. **Use Official WhatsApp Business API** instead of Baileys for:
   - Better reliability
   - Official support
   - Higher message limits
   - No account risk

2. **Alternative**: Twilio WhatsApp Integration
   - Already partially supported in codebase
   - Requires Twilio Business Account

3. **Message Queue**: Add message queue system
   - Prevent message loss
   - Handle rate limiting gracefully
   - Implement retry logic

## Support

For issues with Baileys specifically:
- GitHub: https://github.com/WhiskeySockets/Baileys
- Documentation: Check Baileys README for latest API

For You-Ai platform issues:
- Refer to main README.md
- Check server logs: `npm run dev`
