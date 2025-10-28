/**
 * SSE Broadcaster - Utility for broadcasting real-time updates to all connected SSE clients
 */

/**
 * Broadcast a message to all connected SSE clients
 * @param {Object} data - The data to broadcast
 * @param {string} data.type - Type of event (e.g., 'game_created', 'game_updated', 'game_deleted')
 * @param {Object} data.payload - The actual data payload
 */
export async function broadcastToClients(data) {
  if (!global.sseClients) {
    global.sseClients = new Map();
    console.log('[SSE Broadcaster] ⚠️ No global.sseClients found, initialized new Map');
  }
  
  const clients = global.sseClients;
  
  console.log(`[SSE Broadcaster] 📡 Broadcasting ${data.type} to ${clients.size} client(s)`);
  console.log(`[SSE Broadcaster] 📦 Payload:`, {
    type: data.type,
    gameId: data.payload?.gameId,
    gameType: data.payload?.gameType,
    hasFullGame: !!data.payload?.game
  });
  
  if (!clients || clients.size === 0) {
    console.log('[SSE Broadcaster] ⚠️ No clients connected - broadcast skipped');
    return;
  }
  
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(message);
  
  console.log('[SSE Broadcaster] 📝 Message size:', encoded.length, 'bytes');
  
  const failedClients = [];
  let successCount = 0;
  
  for (const [clientId, writer] of clients.entries()) {
    try {
      if (!writer) {
        console.log(`[SSE Broadcaster] ❌ No writer for ${clientId}`);
        failedClients.push(clientId);
        continue;
      }
      
      await writer.write(encoded);
      successCount++;
      console.log(`[SSE Broadcaster] ✅ Sent to client ${clientId} (${successCount}/${clients.size})`);
      
      if (global.sseClientMeta && global.sseClientMeta.has(clientId)) {
        global.sseClientMeta.get(clientId).lastSuccessfulWrite = Date.now();
      }
    } catch (error) {
      console.error(`[SSE Broadcaster] ❌ Failed to send to ${clientId}:`, error.message);
      failedClients.push(clientId);
    }
  }
  
  console.log(`[SSE Broadcaster] 📊 Broadcast complete: ${successCount} successful, ${failedClients.length} failed`);
  
  if (failedClients.length > 0) {
    failedClients.forEach(clientId => {
      clients.delete(clientId);
      if (global.sseClientMeta) {
        global.sseClientMeta.delete(clientId);
      }
    });
    console.log(`[SSE Broadcaster] 🗑️ Removed ${failedClients.length} dead client(s), active: ${clients.size}`);
  }
}

/**
 * Get the count of currently connected clients
 * @returns {number} Number of connected clients
 */
export function getConnectedClientsCount() {
  return global.sseClients?.size || 0;
}

/**
 * Initialize the global SSE clients map if it doesn't exist
 */
export function initializeSSE() {
  if (!global.sseClients) {
    global.sseClients = new Map();
    console.log('[SSE] Initialized global clients map');
  }
}

