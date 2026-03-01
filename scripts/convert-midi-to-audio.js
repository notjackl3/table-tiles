#!/usr/bin/env node

/**
 * MIDI to Audio Converter Pipeline
 * Automatically converts MIDI files to MP3/WAV for background music
 *
 * Usage:
 *   node scripts/convert-midi-to-audio.js <midi-file>
 *   node scripts/convert-midi-to-audio.js --all
 *
 * Requirements:
 *   - FluidSynth: brew install fluidsynth (Mac) or apt-get install fluidsynth (Linux)
 *   - FFmpeg: brew install ffmpeg (Mac) or apt-get install ffmpeg (Linux)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SOUNDFONT_URL = 'https://github.com/FluidSynth/fluidsynth/raw/master/sf2/VintageDreamsWaves-v2.sf2';
const SOUNDFONT_PATH = path.join(__dirname, 'VintageDreamsWaves-v2.sf2');
const OUTPUT_DIR = path.join(__dirname, '../apps/web/public/sounds');
const MIDI_DIR = path.join(__dirname, '../midi-files'); // Put your MIDI files here

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

function checkDependencies() {
  log('\n🔍 Checking dependencies...', 'cyan');

  const dependencies = [
    { name: 'fluidsynth', cmd: 'fluidsynth --version' },
    { name: 'ffmpeg', cmd: 'ffmpeg -version' }
  ];

  const missing = [];

  for (const dep of dependencies) {
    try {
      execSync(dep.cmd, { stdio: 'ignore' });
      log(`  ✓ ${dep.name} installed`, 'green');
    } catch (error) {
      log(`  ✗ ${dep.name} not found`, 'red');
      missing.push(dep.name);
    }
  }

  if (missing.length > 0) {
    log('\n❌ Missing dependencies:', 'red');
    log('Install with:', 'yellow');
    if (process.platform === 'darwin') {
      log(`  brew install ${missing.join(' ')}`, 'bright');
    } else if (process.platform === 'linux') {
      log(`  sudo apt-get install ${missing.join(' ')}`, 'bright');
    }
    log('\nOr use online converter: https://www.zamzar.com/convert/midi-to-mp3/', 'yellow');
    process.exit(1);
  }

  log('✓ All dependencies installed\n', 'green');
}

async function downloadSoundfont() {
  if (fs.existsSync(SOUNDFONT_PATH)) {
    log(`✓ Soundfont already exists: ${SOUNDFONT_PATH}`, 'green');
    return;
  }

  log('📥 Downloading soundfont (one-time setup)...', 'cyan');
  log('  This may take a minute...', 'yellow');

  try {
    execSync(`curl -L -o "${SOUNDFONT_PATH}" "${SOUNDFONT_URL}"`, { stdio: 'inherit' });
    log('✓ Soundfont downloaded successfully\n', 'green');
  } catch (error) {
    log('❌ Failed to download soundfont', 'red');
    log('Please download manually from:', 'yellow');
    log(SOUNDFONT_URL, 'bright');
    log(`Save to: ${SOUNDFONT_PATH}`, 'bright');
    process.exit(1);
  }
}

function convertMidiToWav(midiPath, wavPath) {
  log(`  🎵 Converting to WAV...`, 'cyan');

  // Correct fluidsynth parameter order: -F and -r must come BEFORE soundfont
  const cmd = `fluidsynth -ni -F "${wavPath}" -r 44100 "${SOUNDFONT_PATH}" "${midiPath}"`;

  try {
    const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch (error) {
    log(`  ❌ Failed to convert to WAV`, 'red');
    log(`  Error: ${error.message}`, 'red');
    if (error.stderr) {
      log(`  Details: ${error.stderr.substring(0, 200)}`, 'red');
    }
    return false;
  }
}

function convertWavToMp3(wavPath, mp3Path) {
  log(`  🎶 Converting to MP3...`, 'cyan');

  const cmd = `ffmpeg -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}" -y 2>&1`;

  try {
    execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch (error) {
    log(`  ❌ Failed to convert to MP3`, 'red');
    log(`  Error: ${error.message}`, 'red');
    // Try alternative: just use WAV file if MP3 fails
    log(`  💡 Keeping WAV file instead (browsers support WAV)`, 'yellow');
    // Rename WAV to show it's the final version
    log(`  ✓ Using WAV file: ${wavPath}`, 'green');
    return 'wav'; // Return 'wav' to indicate we're using WAV instead
  }
}

function convertMidi(midiPath) {
  const basename = path.basename(midiPath, path.extname(midiPath));
  const wavPath = path.join(OUTPUT_DIR, `${basename}.wav`);
  const mp3Path = path.join(OUTPUT_DIR, `${basename}.mp3`);

  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Converting: ${basename}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');

  // Step 1: MIDI to WAV
  if (!convertMidiToWav(midiPath, wavPath)) {
    return false;
  }
  log(`  ✓ WAV created: ${wavPath}`, 'green');

  // Step 2: WAV to MP3
  const mp3Result = convertWavToMp3(wavPath, mp3Path);
  let finalFile, finalExt;

  if (mp3Result === 'wav') {
    // Using WAV file (MP3 conversion failed)
    finalFile = wavPath;
    finalExt = 'wav';
  } else if (mp3Result === true) {
    // MP3 created successfully
    log(`  ✓ MP3 created: ${mp3Path}`, 'green');

    // Clean up WAV file
    try {
      fs.unlinkSync(wavPath);
      log(`  ✓ Cleaned up temporary WAV file`, 'green');
    } catch (error) {
      log(`  ⚠ Could not delete WAV file: ${wavPath}`, 'yellow');
    }

    finalFile = mp3Path;
    finalExt = 'mp3';
  } else {
    // Both failed
    return false;
  }

  // Get file info
  const stats = fs.statSync(finalFile);
  const sizeKB = (stats.size / 1024).toFixed(2);
  log(`  ✓ Final size: ${sizeKB} KB`, 'green');

  log(`\n✅ Successfully converted: ${basename}.${finalExt}`, 'green');
  log(`   Location: /sounds/${basename}.${finalExt}`, 'cyan');
  log(`   Add to your beatmap JSON:`, 'yellow');
  log(`   "audioFile": "/sounds/${basename}.${finalExt}"`, 'bright');

  return true;
}

function findMidiFiles(directory) {
  const files = [];

  if (!fs.existsSync(directory)) {
    return files;
  }

  const items = fs.readdirSync(directory);

  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile() && /\.(mid|midi)$/i.test(item)) {
      files.push(fullPath);
    } else if (stat.isDirectory()) {
      files.push(...findMidiFiles(fullPath));
    }
  }

  return files;
}

function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║        MIDI to Audio Converter Pipeline               ║', 'bright');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    log(`✓ Created output directory: ${OUTPUT_DIR}`, 'green');
  }

  // Check dependencies
  checkDependencies();

  // Download soundfont if needed
  downloadSoundfont();

  // Get MIDI files to convert
  const args = process.argv.slice(2);
  let midiFiles = [];

  if (args.includes('--all')) {
    log(`\n🔍 Scanning for MIDI files in: ${MIDI_DIR}`, 'cyan');
    midiFiles = findMidiFiles(MIDI_DIR);

    if (midiFiles.length === 0) {
      log(`\n⚠ No MIDI files found in ${MIDI_DIR}`, 'yellow');
      log('Create the directory and add your MIDI files:', 'yellow');
      log(`  mkdir -p "${MIDI_DIR}"`, 'bright');
      log(`  cp your-song.mid "${MIDI_DIR}/"`, 'bright');
      process.exit(0);
    }

    log(`Found ${midiFiles.length} MIDI file(s):\n`, 'green');
    midiFiles.forEach(f => log(`  - ${path.basename(f)}`, 'cyan'));
  } else if (args.length > 0) {
    const midiPath = path.resolve(args[0]);
    if (!fs.existsSync(midiPath)) {
      log(`\n❌ File not found: ${midiPath}`, 'red');
      process.exit(1);
    }
    midiFiles = [midiPath];
  } else {
    log('\n📖 Usage:', 'yellow');
    log('  Convert single file:', 'cyan');
    log('    node scripts/convert-midi-to-audio.js path/to/song.mid', 'bright');
    log('\n  Convert all files in midi-files directory:', 'cyan');
    log('    node scripts/convert-midi-to-audio.js --all', 'bright');
    log('\n  Or add to package.json and run:', 'cyan');
    log('    npm run convert-midi path/to/song.mid', 'bright');
    log('    npm run convert-midi -- --all', 'bright');
    process.exit(0);
  }

  // Convert files
  let successCount = 0;
  let failCount = 0;

  for (const midiPath of midiFiles) {
    if (convertMidi(midiPath)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log('📊 Conversion Summary', 'bright');
  log(`${'═'.repeat(60)}`, 'cyan');
  log(`  ✓ Successful: ${successCount}`, 'green');
  if (failCount > 0) {
    log(`  ✗ Failed: ${failCount}`, 'red');
  }
  log(`  📁 Output directory: ${OUTPUT_DIR}`, 'cyan');

  log('\n📝 Next steps:', 'yellow');
  log('  1. Check the generated MP3 files in /apps/web/public/sounds/', 'cyan');
  log('  2. Add "audioFile": "/sounds/your-song.mp3" to your beatmap JSON files', 'cyan');
  log('  3. Test in the game!', 'cyan');

  log('\n✨ Done!\n', 'green');
}

// Run the script
main();
