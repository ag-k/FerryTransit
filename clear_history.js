// Script to clear old history data with incorrect time format
// Run this in the browser console on the history page

console.log('Clearing old history data...');

// Clear the history store
if (window.$nuxt && window.$nuxt.$pinia) {
  const historyStore = window.$nuxt.$pinia._s.get('history');
  historyStore.clearHistory();
  console.log('✓ History cleared');
  
  // Also clear localStorage directly
  localStorage.removeItem('ferry-transit:ferry_search_history');
  console.log('✓ localStorage cleared');
  
  console.log('Please refresh the page to see the clean state');
} else {
  console.log('✗ Could not access history store');
  // Try clearing localStorage directly
  localStorage.removeItem('ferry-transit:ferry_search_history');
  console.log('✓ localStorage cleared directly');
}
