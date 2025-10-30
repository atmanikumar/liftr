#!/usr/bin/env node

/**
 * Test AI Player Insights for All Users
 * This script fetches all users and tests the insights API for each game type
 */

const BASE_URL = 'http://localhost:3000';

async function fetchUsers() {
  try {
    const response = await fetch(`${BASE_URL}/api/users`);
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return [];
  }
}

async function testInsights(userId, userName, gameType) {
  try {
    const response = await fetch(`${BASE_URL}/api/player-insights/${userId}?gameType=${gameType}`);
    
    if (!response.ok) {
      console.log(`   ❌ ${gameType}: Failed (${response.status} ${response.statusText})`);
      return { success: false, gameType };
    }
    
    const data = await response.json();
    
    // Check if insights were generated
    if (data.insights && data.insights.length > 0) {
      const insight = data.insights[0];
      const charCount = insight.length;
      const wordCount = insight.split(' ').length;
      const generatedBy = data.generatedBy || 'unknown';
      
      console.log(`   ✓ ${gameType}: ${generatedBy === 'gemini-ai' ? '✨ AI' : '📋 Rule'} (${charCount} chars, ${wordCount} words)`);
      
      // Show first 100 chars of insight
      if (process.argv.includes('--verbose')) {
        console.log(`      Preview: "${insight.substring(0, 100)}..."`);
      }
      
      return { 
        success: true, 
        gameType, 
        generatedBy,
        charCount,
        wordCount,
        hasHighlights: data.highlights && data.highlights.length > 0
      };
    } else {
      console.log(`   ⚠️  ${gameType}: No insights returned`);
      return { success: false, gameType };
    }
  } catch (error) {
    console.log(`   ❌ ${gameType}: Error - ${error.message}`);
    return { success: false, gameType, error: error.message };
  }
}

async function main() {
  console.log('🧪 Testing AI Player Insights API\n');
  console.log('Fetching users...\n');
  
  const users = await fetchUsers();
  
  if (users.length === 0) {
    console.log('❌ No users found. Make sure your server is running and database has users.\n');
    return;
  }
  
  console.log(`✓ Found ${users.length} users\n`);
  console.log('─'.repeat(60));
  
  const gameTypes = ['Rummy', 'Chess', 'Ace'];
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    aiGenerated: 0,
    ruleBased: 0
  };
  
  for (const user of users) {
    console.log(`\n👤 ${user.name} (${user.id})`);
    
    for (const gameType of gameTypes) {
      const result = await testInsights(user.id, user.name, gameType);
      results.total++;
      
      if (result.success) {
        results.success++;
        if (result.generatedBy === 'gemini-ai') {
          results.aiGenerated++;
        } else {
          results.ruleBased++;
        }
      } else {
        results.failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   Total Tests: ${results.total}`);
  console.log(`   ✓ Success: ${results.success} (${Math.round(results.success/results.total*100)}%)`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ✨ AI Generated: ${results.aiGenerated}`);
  console.log(`   📋 Rule-Based: ${results.ruleBased}`);
  
  if (results.aiGenerated > 0) {
    console.log('\n✨ Gemini AI is working!');
  } else if (results.success > 0) {
    console.log('\n📋 Using rule-based fallback (add GEMINI_API_KEY for AI)');
  }
  
  console.log('\n💡 Tip: Run with --verbose to see insight previews\n');
}

main().catch(console.error);

