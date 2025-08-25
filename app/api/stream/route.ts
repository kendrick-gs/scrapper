import { NextRequest } from 'next/server';
import { scrapeCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  const streamKey = `stream-${sessionId}`;
  let lastSentIndex = 0;

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false; // <-- ADD THIS FLAG

      const interval = setInterval(() => {
        if (isClosed) { // <-- ADD THIS CHECK
          clearInterval(interval);
          return;
        }

        const messages = scrapeCache.get<string[]>(streamKey) || [];
        
        if (messages.length > lastSentIndex) {
          for (let i = lastSentIndex; i < messages.length; i++) {
            controller.enqueue(`data: ${JSON.stringify({ message: messages[i] })}\n\n`);
          }
          lastSentIndex = messages.length;
        }

        const lastMessage = messages[messages.length - 1];
        if (lastMessage === '---DONE---' || lastMessage === '---ERROR---') {
          const finalData = scrapeCache.get(`data-${sessionId}`);
          controller.enqueue(`data: ${JSON.stringify({ finished: true, data: finalData })}\n\n`);
          
          isClosed = true; // <-- SET THE FLAG
          clearInterval(interval);
          controller.close();
        }
      }, 500);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}