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
      const interval = setInterval(() => {
        const messages = scrapeCache.get<string[]>(streamKey) || [];
        
        if (messages.length > lastSentIndex) {
          for (let i = lastSentIndex; i < messages.length; i++) {
            controller.enqueue(`data: ${JSON.stringify({ message: messages[i] })}\n\n`);
          }
          lastSentIndex = messages.length;
        }

        const lastMessage = messages[messages.length - 1];
        if (lastMessage === '---DONE---' || lastMessage === '---ERROR---') {
          // ## FIX: Clear the interval FIRST ##
          clearInterval(interval); 

          const finalData = scrapeCache.get(`data-${sessionId}`);
          controller.enqueue(`data: ${JSON.stringify({ finished: true, data: finalData })}\n\n`);
          
          // Now it is safe to close the controller
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