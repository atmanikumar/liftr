/**
 * Clear SSE client ID cookie - useful for testing
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  
  // Delete the SSE client ID cookie
  cookieStore.delete('sse_client_id');
  
  console.log('[SSE] Cleared sse_client_id cookie');
  
  return NextResponse.json({
    success: true,
    message: 'SSE client ID cookie cleared'
  });
}

