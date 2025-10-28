/**
 * Test endpoint to check SSE client connections
 */

import { NextResponse } from 'next/server';
import { getConnectedClientsCount } from '@/lib/sseBroadcaster';

export async function GET() {
  const clientCount = getConnectedClientsCount();
  
  console.log('[TEST SSE] Checking connected clients...');
  console.log('[TEST SSE] global.sseClients exists:', !!global.sseClients);
  console.log('[TEST SSE] Client count:', clientCount);
  
  // List all client IDs
  if (global.sseClients) {
    const clientIds = Array.from(global.sseClients.keys());
    console.log('[TEST SSE] Client IDs:', clientIds);
  }
  
  return NextResponse.json({
    success: true,
    clientCount,
    hasGlobalMap: !!global.sseClients,
    globalMapSize: global.sseClients?.size || 0,
    clientIds: global.sseClients ? Array.from(global.sseClients.keys()) : []
  });
}

