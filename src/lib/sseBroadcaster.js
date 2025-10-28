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
  }
  
  const clients = global.sseClients;
  
  if (!clients || clients.size === 0) {
    return;
  }
  
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(message);
  
  const failedClients = [];
  
  for (const [clientId, writer] of clients.entries()) {
    try {
      if (!writer) {
        failedClients.push(clientId);
        continue;
      }
      
      await writer.write(encoded);
      
      if (global.sseClientMeta && global.sseClientMeta.has(clientId)) {
        global.sseClientMeta.get(clientId).lastSuccessfulWrite = Date.now();
      }
    } catch (error) {
      failedClients.push(clientId);
    }
  }
  
  // Clean up failed clients
  if (failedClients.length > 0) {
    failedClients.forEach(clientId => {
      clients.delete(clientId);
      if (global.sseClientMeta) {
        global.sseClientMeta.delete(clientId);
      }
    });
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
  }
}

