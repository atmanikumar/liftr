/**
 * Server-Sent Events (SSE) endpoint for real-time game updates
 * Clients connect to this endpoint to receive live updates when games are created/updated
 */

import { NextResponse } from 'next/server';

// Global store for connected SSE clients with metadata
global.sseClients = global.sseClients || new Map();
global.sseClientMeta = global.sseClientMeta || new Map(); // Track last successful write time

export async function GET(request) {
  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // Check if client is reconnecting with existing ID
  const { searchParams } = new URL(request.url);
  const existingClientId = searchParams.get('clientId');
  
  let clientId;
  let isReconnect = false;
  
  if (existingClientId && global.sseClients.has(existingClientId)) {
    // Reuse existing client ID - close old connection and replace with new one
    clientId = existingClientId;
    isReconnect = true;
    console.log(`[SSE] Client reconnecting: ${clientId}`);
    
    // Close the old writer if it exists
    const oldWriter = global.sseClients.get(clientId);
    if (oldWriter) {
      try {
        await oldWriter.close();
      } catch (e) {
        // Ignore errors
      }
    }
  } else if (existingClientId) {
    // Client has ID but not in our map - reuse it
    clientId = existingClientId;
    console.log(`[SSE] Reusing client ID: ${clientId}`);
  } else {
    // Generate new unique client ID
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[SSE] New client: ${clientId}`);
  }
  
  // Store/replace the writer for this client
  global.sseClients.set(clientId, writer);
  global.sseClientMeta.set(clientId, {
    connectedAt: Date.now(),
    lastSuccessfulWrite: Date.now(),
    isReconnect
  });
  
  console.log(`[SSE] Total clients: ${global.sseClients.size}`);
  
  // IMPORTANT: Return the response FIRST, then send messages
  // This starts the stream flowing before we try to write
  const response = new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
  
  // Send initial connection message asynchronously
  (async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      const message = { type: 'connected', clientId };
      await writer.write(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      
      if (global.sseClientMeta && global.sseClientMeta.has(clientId)) {
        global.sseClientMeta.get(clientId).lastSuccessfulWrite = Date.now();
      }
    } catch (error) {
      console.error(`[SSE] Error sending initial message:`, error.message);
    }
  })();
  
  // Set up keepalive ping every 3 seconds and remove stale connections
  const keepaliveInterval = setInterval(async () => {
    try {
      // Clean up stale clients (no successful write in 10 seconds)
      const now = Date.now();
      const staleClients = [];
      
      for (const [id, meta] of global.sseClientMeta.entries()) {
        if (now - meta.lastSuccessfulWrite > 10000) {
          staleClients.push(id);
        }
      }
      
      staleClients.forEach(id => {
        global.sseClients.delete(id);
        global.sseClientMeta.delete(id);
      });
      
      if (staleClients.length > 0) {
        console.log(`[SSE] Removed ${staleClients.length} stale connection(s), total: ${global.sseClients.size}`);
      }
      
      // Send keepalive to current client
      if (!global.sseClients.has(clientId)) {
        clearInterval(keepaliveInterval);
        return;
      }
      
      const currentWriter = global.sseClients.get(clientId);
      if (!currentWriter) {
        clearInterval(keepaliveInterval);
        return;
      }
      
      await currentWriter.write(encoder.encode(`: keepalive ${Date.now()}\n\n`));
      
      const meta = global.sseClientMeta.get(clientId);
      if (meta) {
        meta.lastSuccessfulWrite = Date.now();
      }
    } catch (error) {
      console.error(`[SSE] Keepalive failed:`, error.message);
      clearInterval(keepaliveInterval);
      global.sseClients.delete(clientId);
      global.sseClientMeta.delete(clientId);
      try {
        writer.close();
      } catch (e) {
        // Ignore
      }
    }
  }, 3000);
  
  // Clean up on connection close
  request.signal.addEventListener('abort', () => {
    console.log(`[SSE] Client disconnected: ${clientId}, total: ${global.sseClients.size - 1}`);
    clearInterval(keepaliveInterval);
    global.sseClients.delete(clientId);
    global.sseClientMeta.delete(clientId);
    try {
      writer.close();
    } catch (error) {
      // Ignore
    }
  });
  
  // Return the response (already created above)
  return response;
}

