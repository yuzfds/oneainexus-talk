import { OneainexusChatClient, ConnectionState, ReceivedMessage } from '@oneainexus/chat-sdk';

// 1. Initialize the SDK client with app credentials
const client = new OneainexusChatClient({
  apiEndpoint: 'http://localhost:3000',
  clientId: 'test-app-id', // Replace with a valid client ID from your DB if needed
  clientSecret: 'test-secret', // Replace with a valid secret
  logLevel: 'debug',
  reconnect: true
});

async function main() {
  console.log('馃殌 Starting Test Application with OpenClaw Chat SDK...');

  // 2. Listen for connection state changes
  client.onStateChange((state) => {
    console.log(`[App] Connection state changed to: ${state}`);
  });

  // 3. Listen for incoming messages from users (via Chat Frontend)
  client.onMessage(async (msg: ReceivedMessage) => {
    console.log(`\n[App] 馃摠 Received message from Chat Platform:`);
    console.log(JSON.stringify(msg, null, 2));

    if (msg.type === 'chat') {
      const sessionId = msg.data?.sessionId as string;
      const messages = msg.data?.messages as any[];
      const lastMessage = messages[messages.length - 1];

      console.log(`[App] 馃 Generating AI response for session: ${sessionId}...`);
      
      // Simulate AI thinking delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const replyText = `Hello! I am the Application Backend using the SDK. I received your message: "${lastMessage.content}"`;
      
      // 4. Send back streaming response
      const words = replyText.split(' ');
      for (let i = 0; i < words.length; i++) {
        await client.sendStructuredMessage({
          type: 'chat_stream',
          content: '',
          data: {
            sessionId,
            content: words[i] + ' ',
            done: false
          }
        });
        await new Promise(resolve => setTimeout(resolve, 100)); // typing effect
      }

      // Send the final "done" message
      await client.sendStructuredMessage({
        type: 'chat_stream',
        content: '',
        data: {
          sessionId,
          content: '',
          done: true,
          finishReason: 'stop'
        }
      });
      
      console.log(`[App] 鉁?Finished sending response.`);
    }
  });

  // 5. Connect to the Chat platform
  try {
    await client.connect();
    console.log('鉁?Connected successfully!');
    console.log('鈴?Waiting for user messages from the Chat frontend...\n');
  } catch (error) {
    console.error('鉂?Failed to connect:', error);
  }
}

main().catch(console.error);
