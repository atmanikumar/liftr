/**
 * Endpoint for clients to explicitly disconnect and clean up their SSE connection
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { clientId } = await request.json();
    
    if (!clientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'clientId required' 
      }, { status: 400 });
    }

    console.log(`[SSE Disconnect] Client explicitly disconnecting: ${clientId}`);
    
    if (!global.sseClients) {
      return NextResponse.json({ 
        success: true, 
        message: 'No clients connected',
        wasConnected: false
      });
    }

    const wasConnected = global.sseClients.has(clientId);
    
    if (wasConnected) {
      // Remove from clients map
      const writer = global.sseClients.get(clientId);
      global.sseClients.delete(clientId);
      
      // Remove from metadata
      if (global.sseClientMeta) {
        global.sseClientMeta.delete(clientId);
      }
      
      // Try to close the writer
      try {
        if (writer && !writer.closed) {
          await writer.close();
        }
      } catch (e) {
        console.error(`[SSE Disconnect] Error closing writer for ${clientId}:`, e);
      }
      
      console.log(`[SSE Disconnect] ✅ Client ${clientId} disconnected, remaining: ${global.sseClients.size}`);
    } else {
      console.log(`[SSE Disconnect] Client ${clientId} was not in the connected list`);
    }

    return NextResponse.json({
      success: true,
      wasConnected,
      remainingClients: global.sseClients.size
    });
  } catch (error) {
    console.error('[SSE Disconnect] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

