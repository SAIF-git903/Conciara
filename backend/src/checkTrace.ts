/**
 * Script to check a specific trace by ID
 * Usage: npx ts-node src/checkTrace.ts <traceId>
 */

import { traceService } from './services/traceService.js';

const traceId = process.argv[2];

if (!traceId) {
  console.error('Usage: npx ts-node src/checkTrace.ts <traceId>');
  process.exit(1);
}

async function checkTrace() {
  console.log(`\n🔍 Looking for trace: ${traceId}\n`);

  const trace = await traceService.getTrace(traceId);

  if (!trace) {
    console.log('❌ Trace not found');
    console.log('\nPossible reasons:');
    console.log('1. Trace ID is incorrect');
    console.log('2. Trace was cleaned up (older than 24 hours)');
    console.log('3. Backend server was restarted (traces are in-memory)');
    console.log('4. Trace was never created');
    
    // Show all available traces
    const allTraces = await traceService.getAllTraces();
    if (allTraces.length > 0) {
      console.log(`\n📋 Available traces (${allTraces.length}):`);
      allTraces.slice(0, 10).forEach((t) => {
        console.log(`  - ${t.traceId} (${t.userMessage.substring(0, 50)}...)`);
      });
      if (allTraces.length > 10) {
        console.log(`  ... and ${allTraces.length - 10} more`);
      }
    } else {
      console.log('\n📋 No traces available in memory');
    }
    process.exit(1);
  }

  // Display trace information
  console.log('✅ Trace found!\n');
  console.log('═'.repeat(80));
  console.log('TRACE INFORMATION');
  console.log('═'.repeat(80));
  console.log(`Trace ID:     ${trace.traceId}`);
  console.log(`Session ID:   ${trace.sessionId}`);
  console.log(`Tree ID:      ${trace.treeId}`);
  console.log(`User ID:      ${trace.userId || 'N/A'}`);
  console.log(`User Message: "${trace.userMessage}"`);
  console.log(`Start Time:   ${new Date(trace.startTime).toISOString()}`);
  console.log(`End Time:     ${trace.endTime ? new Date(trace.endTime).toISOString() : 'In progress'}`);
  console.log(`Duration:     ${trace.endTime ? (trace.endTime - trace.startTime) + 'ms' : 'N/A'}`);
  console.log(`Events:       ${trace.events.length}`);
  console.log(`Correlation:  ${trace.correlationId}`);
  if (trace.finalResponse) {
    console.log(`Final Response: "${trace.finalResponse.substring(0, 100)}${trace.finalResponse.length > 100 ? '...' : ''}"`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('EVENTS');
  console.log('═'.repeat(80));

  trace.events.forEach((event, index) => {
  const time = event.relativeTime < 1000 
    ? `${event.relativeTime.toFixed(0)}ms` 
    : `${(event.relativeTime / 1000).toFixed(2)}s`;
  
  console.log(`\n[${index + 1}] ${event.type.toUpperCase()} @ ${time}`);
  console.log(`    Timestamp: ${new Date(event.timestamp).toISOString()}`);
  
  // Show key data based on event type
  if (event.type === 'vector_db_search' && event.data.topResult) {
    console.log(`    Result: "${event.data.topResult.userInput}"`);
    console.log(`    Similarity: ${(event.data.topResult.similarity * 100).toFixed(1)}%`);
  } else if (event.type === 'dialog_tree_search' && event.data.matchedNodeId) {
    console.log(`    Matched Node: ${event.data.matchedNodeId}`);
    console.log(`    Strategy: ${event.data.strategy || 'N/A'}`);
  } else if (event.type === 'llm_call' && event.data.response) {
    console.log(`    Response: "${event.data.response.substring(0, 80)}${event.data.response.length > 80 ? '...' : ''}"`);
  } else if (event.type === 'user_memory_retrieval') {
    console.log(`    Memories Found: ${event.data.memoriesFound || 0}`);
  } else {
    console.log(`    Status: ${event.data.status || 'N/A'}`);
  }
  
  // Show full data if requested
  if (process.argv.includes('--full')) {
    console.log(`    Full Data:`, JSON.stringify(event.data, null, 2));
  }
});

  console.log('\n' + '═'.repeat(80));
  console.log(`Total Events: ${trace.events.length}`);
  console.log('═'.repeat(80));
}

// Run the async function
checkTrace().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
