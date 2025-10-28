/**
 * Cleanup endpoint to remove dead SSE connections
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const forceAll = searchParams.get('force') === 'true';
  
  if (!global.sseClients) {
    return NextResponse.json({ 
      success: true, 
      message: 'No clients to clean up',
      removed: 0,
      remaining: 0
    });
  }

  const beforeCount = global.sseClients.size;
  
  // Force clear all connections
  if (forceAll) {
    console.log(`[SSE Cleanup] FORCE clearing all ${beforeCount} connections...`);
    const allClientIds = Array.from(global.sseClients.keys());
    global.sseClients.clear();
    if (global.sseClientMeta) {
      global.sseClientMeta.clear();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Force cleared all connections',
      removed: beforeCount,
      remaining: 0,
      clientIds: allClientIds
    });
  }

  const deadClients = [];
  const aliveClients = [];

  console.log(`[SSE Cleanup] Starting cleanup of ${beforeCount} connections...`);

  // Check each connection - try to write to verify it's alive
  const encoder = new TextEncoder();
  const testMessage = encoder.encode(`: cleanup-test ${Date.now()}\n\n`);
  
  for (const [clientId, writer] of global.sseClients.entries()) {
    try {
      // Try to write a test message
      await writer.write(testMessage);
      aliveClients.push(clientId);
      console.log(`[SSE Cleanup] ✓ Client ${clientId} is alive`);
    } catch (error) {
      // If we can't write, connection is dead
      console.log(`[SSE Cleanup] ✗ Client ${clientId} is dead: ${error.message}`);
      deadClients.push(clientId);
    }
  }

  // Remove dead connections
  deadClients.forEach(clientId => {
    global.sseClients.delete(clientId);
    if (global.sseClientMeta) {
      global.sseClientMeta.delete(clientId);
    }
  });

  const afterCount = global.sseClients.size;

  console.log(`[SSE Cleanup] Cleanup complete:`);
  console.log(`  - Dead connections removed: ${deadClients.length}`);
  console.log(`  - Active connections: ${afterCount}`);
  console.log(`  - Alive client IDs:`, aliveClients);

  return NextResponse.json({
    success: true,
    removed: deadClients.length,
    remaining: afterCount,
    aliveClients: aliveClients,
    deadClients: deadClients
  });
}

// GET endpoint to just check status without cleanup
export async function GET() {
  if (!global.sseClients) {
    return NextResponse.json({ 
      clientCount: 0,
      clients: []
    });
  }

  const clients = Array.from(global.sseClients.keys()).map(id => ({
    id,
    timestamp: parseInt(id.split('_')[1]) || 0
  }));

  // Sort by timestamp (oldest first)
  clients.sort((a, b) => a.timestamp - b.timestamp);

  return NextResponse.json({
    clientCount: global.sseClients.size,
    clients: clients,
    oldestConnection: clients[0] ? new Date(clients[0].timestamp).toISOString() : null,
    newestConnection: clients[clients.length - 1] ? new Date(clients[clients.length - 1].timestamp).toISOString() : null
  });
}

