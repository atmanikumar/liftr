import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Test endpoint to verify AI connection and response
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'gemini'; // gemini only
  
  console.log(`\n🔍 Testing ${provider.toUpperCase()} API Connection...\n`);
  
  const results = {
    provider: provider,
    timestamp: new Date().toISOString(),
    status: 'unknown',
    apiKeyFound: false,
    model: null,
    responseTime: null,
    responseLength: null,
    response: null,
    error: null
  };
  
  try {
    if (provider === 'gemini') {
      // Test Gemini
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
      }
      
      results.apiKeyFound = true;
      results.model = 'gemini-2.0-flash-exp';
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      const testData = {
        totalGames: 25,
        wins: 12,
        winRate: 48,
        recentForm: 60
      };
      
      const prompt = `Analyze this player in 3 lines:
Games: ${testData.totalGames} | Wins: ${testData.wins} | Win Rate: ${testData.winRate}% | Recent: ${testData.recentForm}%

Write a brief analysis of their performance.`;
      
      console.log('📤 Sending test prompt to Gemini...');
      const startTime = Date.now();
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const endTime = Date.now();
      results.responseTime = `${endTime - startTime}ms`;
      results.response = text.trim();
      results.responseLength = results.response.length;
      results.status = 'success';
      
      console.log('✅ Gemini response received!');
      console.log(`   Response time: ${results.responseTime}`);
      console.log(`   Response length: ${results.responseLength} chars\n`);
      
    } else {
      throw new Error(`Unknown provider: ${provider}. Use 'gemini'`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    results.status = 'error';
    results.error = error.message;
    
    // Add helpful hints
    if (error.status === 429) {
      results.hint = 'Rate limit reached. Wait 1 minute or add credits.';
    } else if (error.status === 401) {
      results.hint = 'Invalid API key. Check your .env.local file.';
    } else if (error.status === 402) {
      results.hint = 'Insufficient credits. Add payment method.';
    }
  }
  
  return NextResponse.json(results, { 
    status: results.status === 'success' ? 200 : 500 
  });
}

