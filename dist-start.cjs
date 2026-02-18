// Wrapper to catch startup errors cleanly
process.on('uncaughtException', (err) => {
  console.error('='.repeat(60));
  console.error('UNCAUGHT EXCEPTION:');
  console.error('Message:', err.message);
  console.error('Name:', err.name);
  if (err.stack) {
    // Only show first 10 lines of stack, not the entire bundle
    const lines = err.stack.split('\n').slice(0, 10);
    console.error('Stack:', lines.join('\n'));
  }
  console.error('='.repeat(60));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('='.repeat(60));
  console.error('UNHANDLED REJECTION:');
  console.error(reason);
  console.error('='.repeat(60));
  process.exit(1);
});

console.log('[wrapper] Loading dist/index.cjs...');
try {
  require('./dist/index.cjs');
  console.log('[wrapper] Module loaded successfully');
} catch (err) {
  console.error('='.repeat(60));
  console.error('REQUIRE ERROR:');
  console.error('Message:', err.message);
  console.error('Name:', err.name);
  if (err.stack) {
    const lines = err.stack.split('\n').slice(0, 10);
    console.error('Stack:', lines.join('\n'));
  }
  console.error('='.repeat(60));
  process.exit(1);
}
