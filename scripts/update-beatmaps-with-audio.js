#!/usr/bin/env node

/**
 * Beatmap Audio File Updater
 * Automatically adds "audioFile" property to beatmap JSON files
 *
 * Usage:
 *   node scripts/update-beatmaps-with-audio.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BEATMAPS_DIR = path.join(__dirname, '../apps/web/src/game/songs');
const SOUNDS_DIR = path.join(__dirname, '../apps/web/public/sounds');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findJsonFiles(directory) {
  const files = [];

  if (!fs.existsSync(directory)) {
    return files;
  }

  const items = fs.readdirSync(directory);

  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile() && item.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function findMatchingAudioFile(beatmapId) {
  // Try different naming conventions
  const possibleNames = [
    `${beatmapId}.mp3`,
    `${beatmapId}.wav`,
    `${beatmapId.replace(/-/g, '_')}.mp3`,
    `${beatmapId.replace(/_/g, '-')}.mp3`
  ];

  for (const name of possibleNames) {
    const fullPath = path.join(SOUNDS_DIR, name);
    if (fs.existsSync(fullPath)) {
      return `/sounds/${name}`;
    }
  }

  return null;
}

function updateBeatmapFile(filePath) {
  log(`\n📄 Processing: ${path.basename(filePath)}`, 'cyan');

  try {
    // Read and parse JSON
    const content = fs.readFileSync(filePath, 'utf-8');
    const beatmap = JSON.parse(content);

    // Check if audioFile already exists
    if (beatmap.audioFile) {
      log(`  ⏭  Already has audioFile: ${beatmap.audioFile}`, 'yellow');
      return { status: 'skipped', reason: 'already-has-audio' };
    }

    // Find matching audio file
    const audioFile = findMatchingAudioFile(beatmap.id);

    if (!audioFile) {
      log(`  ⚠  No matching audio file found for ID: ${beatmap.id}`, 'yellow');
      log(`     Looking for: ${beatmap.id}.mp3 or ${beatmap.id}.wav`, 'yellow');
      return { status: 'skipped', reason: 'no-audio-file' };
    }

    // Add audioFile property
    beatmap.audioFile = audioFile;

    // Write back to file with proper formatting
    const updatedContent = JSON.stringify(beatmap, null, 2);
    fs.writeFileSync(filePath, updatedContent + '\n', 'utf-8');

    log(`  ✓ Added audioFile: ${audioFile}`, 'green');
    return { status: 'updated', audioFile };
  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    return { status: 'error', error: error.message };
  }
}

function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║      Beatmap Audio File Updater                        ║', 'bright');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  // Find all beatmap JSON files
  const jsonFiles = findJsonFiles(BEATMAPS_DIR);

  if (jsonFiles.length === 0) {
    log(`\n⚠  No JSON files found in ${BEATMAPS_DIR}`, 'yellow');
    process.exit(0);
  }

  log(`\nFound ${jsonFiles.length} beatmap file(s)\n`, 'green');

  // Process each file
  const results = {
    updated: [],
    skipped: [],
    errors: []
  };

  for (const filePath of jsonFiles) {
    const result = updateBeatmapFile(filePath);

    if (result.status === 'updated') {
      results.updated.push({ file: path.basename(filePath), audioFile: result.audioFile });
    } else if (result.status === 'skipped') {
      results.skipped.push({ file: path.basename(filePath), reason: result.reason });
    } else if (result.status === 'error') {
      results.errors.push({ file: path.basename(filePath), error: result.error });
    }
  }

  // Summary
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log('📊 Update Summary', 'bright');
  log(`${'═'.repeat(60)}`, 'cyan');

  if (results.updated.length > 0) {
    log(`\n✓ Updated (${results.updated.length}):`, 'green');
    results.updated.forEach(r => {
      log(`  - ${r.file} → ${r.audioFile}`, 'green');
    });
  }

  if (results.skipped.length > 0) {
    log(`\n⏭  Skipped (${results.skipped.length}):`, 'yellow');
    results.skipped.forEach(r => {
      const reason = r.reason === 'already-has-audio' ? 'already has audio' : 'no matching audio file';
      log(`  - ${r.file} (${reason})`, 'yellow');
    });
  }

  if (results.errors.length > 0) {
    log(`\n✗ Errors (${results.errors.length}):`, 'red');
    results.errors.forEach(r => {
      log(`  - ${r.file}: ${r.error}`, 'red');
    });
  }

  // Next steps
  if (results.updated.length > 0) {
    log('\n📝 Next steps:', 'yellow');
    log('  1. Review the updated JSON files', 'cyan');
    log('  2. Test the songs in your game', 'cyan');
    log('  3. Commit the changes if everything works!', 'cyan');
  }

  log('\n✨ Done!\n', 'green');
}

// Run the script
main();
