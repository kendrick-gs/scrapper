// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/app/api/stream/route.ts
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
      // Use a text encoder for proper streaming format
      const encoder = new TextEncoder();

      const interval = setInterval(() => {
        const messages = scrapeCache.get<string[]>(streamKey) || [];
        
        if (messages.length > lastSentIndex) {
          console.log(`[Stream] Found ${messages.length - lastSentIndex} new messages for session ${sessionId}.`);
          for (let i = lastSentIndex; i < messages.length; i++) {
            const messagePayload = `data: ${JSON.stringify({ message: messages[i] })}\n\n`;
            controller.enqueue(encoder.encode(messagePayload));
          }
          lastSentIndex = messages.length;
        }

        const lastMessage = messages[messages.length - 1];
        if (lastMessage === '---DONE---' || lastMessage === '---ERROR---') {
          console.log(`[Stream] Scraping finished for session ${sessionId}. Closing stream.`);
          clearInterval(interval); 

          const finalData = scrapeCache.get(`data-${sessionId}`);
          const finalPayload = `data: ${JSON.stringify({ finished: true, data: finalData })}\n\n`;
          controller.enqueue(encoder.encode(finalPayload));
          
          controller.close();
        }
      }, 500);

      // Clean up the interval if the client closes the connection
      request.signal.addEventListener('abort', () => {
        console.log(`[Stream] Client disconnected for session ${sessionId}. Cleaning up.`);
        clearInterval(interval);
        controller.close();
      });
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