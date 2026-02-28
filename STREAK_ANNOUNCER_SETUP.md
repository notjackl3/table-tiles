# 🎙️ British Football Announcer - Streak System

This guide explains the new streak announcement system using Eleven Labs' British football announcer voice.

## 🎯 What Was Added

### Streak Announcements (Combos 2-6)
When players hit consecutive notes successfully, they'll hear the British announcer:

- **2 Streak**: "Two!"
- **3 Streak**: "Three!"
- **4 Streak**: "Wow!"
- **5 Streak**: "Phenomenal!"
- **6 Streak**: "Unstoppable!"

### Combo Milestones (10, 15, 20, 25)
For larger milestones, the energetic voice continues to celebrate:

- **10 Combo**: "Ten combo! Amazing!"
- **15 Combo**: "Incredible! Fifteen combo!"
- **20 Combo**: "Twenty combo! Unbelievable!"
- **25 Combo**: "Legendary! Twenty-five combo!"

## 🔧 Technical Implementation

### 1. **Sound Generator Updated** ([generateSoundEffects.ts](scripts/generateSoundEffects.ts))
   - Added **British announcer voice** (Charlie - Voice ID: `IKne3meq5aSn9XLyUdCD`)
   - Generates 5 new streak announcement files
   - Uses different voices for different categories:
     - Streak announcements → British announcer
     - Combo milestones → Energetic voice
     - Celebrations → Energetic voice

### 2. **Audio Engine Enhanced** ([audioEngine.ts](apps/web/src/game/audio/audioEngine.ts))
   - New method: `playStreakAnnouncement(streak)` - Plays for streaks 2-6
   - Updated: `playComboMilestone(combo)` - Now only plays at 10, 15, 20, 25
   - Loads 5 new sound files: `streak-2.mp3` through `streak-6.mp3`

### 3. **Game Logic Integration** ([GamePage.tsx](apps/web/src/pages/GamePage.tsx))
   - Calls `playStreakAnnouncement()` on every combo change
   - Plays immediately when player reaches each streak level
   - No cooldown on streak announcements (they fire instantly)

## 🚀 How to Generate the Sounds

### Step 1: Ensure API Key is Set
Your API key is already in `.env.example`:
```bash
export ELEVENLABS_API_KEY=
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Generate All Sound Effects
```bash
npm run generate:sounds
```

This will generate **16 sound files** total:
- 2 game start announcements
- 5 streak announcements (NEW! 🎙️)
- 4 combo milestones
- 5 celebration sounds

**Expected output:**
```
🎵 Eleven Labs Sound Effects Generator

Generating 16 sound effects...

Generating: Game Start (Get ready! Game starting now!)
✓ Saved: .../sounds/game-start.mp3 (45.2 KB)
✓ Uploaded to backend: game-start.mp3

Generating: Streak 2 (Two!)
✓ Saved: .../sounds/streak-2.mp3 (12.8 KB)
✓ Uploaded to backend: streak-2.mp3

Generating: Streak 3 (Three!)
✓ Saved: .../sounds/streak-3.mp3 (14.1 KB)
...

✅ Done! All sound effects generated successfully!
```

### Step 4: Start Your App
```bash
# Terminal 1: Backend
npm run dev:api

# Terminal 2: Frontend
npm run dev:web
```

### Step 5: Play and Test!
1. Start a game
2. Hit consecutive notes
3. Listen for the British announcer calling out your streaks! 🎙️

## 🎮 How It Works in Game

### Streak Flow Example:
```
Hit 1: [Note sound only]
Hit 2: "Two!" 🎙️
Hit 3: "Three!" 🎙️
Hit 4: "Wow!" 🎙️
Hit 5: "Phenomenal!" 🎙️
Hit 6: "Unstoppable!" 🎙️
Hit 7-9: [Note sounds only]
Hit 10: "Ten combo! Amazing!" 🎉
```

### Audio Layering:
- **Note sound**: Always plays (melodic tone)
- **Streak announcement**: Plays for combos 2-6 (British announcer)
- **Combo milestone**: Plays at 10, 15, 20, 25 (energetic voice)
- **Celebration**: 20% chance on perfect hits (energetic voice)

All sounds play simultaneously without interfering with each other!

## 🎨 Voice Customization

### Change the British Announcer Voice

Edit [scripts/generateSoundEffects.ts](scripts/generateSoundEffects.ts):

```typescript
// Try different British/announcer-style voices:
const ANNOUNCER_VOICE = 'IKne3meq5aSn9XLyUdCD'; // Charlie (Default)
// const ANNOUNCER_VOICE = 'pNInz6obpgDQGcFmaJgB'; // Adam (Deep)
// const ANNOUNCER_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel (Clear)
```

Find more voices: https://api.elevenlabs.io/v1/voices

### Customize the Callouts

Edit the `SOUND_EFFECTS` array:

```typescript
{
  name: 'Streak 4',
  text: 'Brilliant!',  // Change this!
  filename: 'streak-4.mp3',
  category: 'streak',
  voiceId: ANNOUNCER_VOICE
},
```

Then regenerate: `npm run generate:sounds`

## 🔊 Volume & Timing Adjustments

### Adjust Streak Volume

In [audioEngine.ts](apps/web/src/game/audio/audioEngine.ts):

```typescript
playStreakAnnouncement(streak: number) {
  if (streak >= 2 && streak <= 6) {
    this.playSoundEffect(`streak-${streak}`, 0.95); // Change volume here (0.0 - 1.0)
  }
}
```

### Add More Streak Levels

To extend beyond 6:

1. **Add to generator** (generateSoundEffects.ts):
   ```typescript
   {
     name: 'Streak 7',
     text: 'Magnificent!',
     filename: 'streak-7.mp3',
     category: 'streak',
     voiceId: ANNOUNCER_VOICE
   }
   ```

2. **Update AudioEngine** (audioEngine.ts):
   ```typescript
   if (streak >= 2 && streak <= 7) { // Change 6 to 7
     this.playSoundEffect(`streak-${streak}`, 0.95);
   }
   ```

3. **Regenerate sounds**: `npm run generate:sounds`

## 📊 Cost Estimation

### New Streak Sounds:
- Streak 2: "Two!" (~5 characters)
- Streak 3: "Three!" (~7 characters)
- Streak 4: "Wow!" (~5 characters)
- Streak 5: "Phenomenal!" (~13 characters)
- Streak 6: "Unstoppable!" (~13 characters)

**Total**: ~43 characters

With existing sounds (~300 characters), the full set is now **~350 characters**.

**Free tier** (10,000 chars/month) = ~28 regenerations/month

## 🎯 Tips for Best Results

1. **Generate once, use forever** - These files are saved locally and served from your app
2. **No API calls during gameplay** - All sounds are preloaded at game start
3. **Instant playback** - No latency once sounds are loaded
4. **Test in development** - Listen to each sound before deploying

## 🐛 Troubleshooting

### Sounds not playing?
1. Check browser console for "Sound effect not found" warnings
2. Verify files exist in `apps/web/public/sounds/`
3. Check `streak-2.mp3` through `streak-6.mp3` are present
4. Refresh the page to reload sounds

### British announcer sounds wrong?
1. Verify voice ID is correct: `IKne3meq5aSn9XLyUdCD`
2. Try adjusting the text (add punctuation: "Two!", "Three!")
3. Test with different voice stability settings in the generator

### Sounds overlapping too much?
1. Reduce celebration probability in `playRandomCelebration()` (default 20%)
2. Adjust combo milestone cooldown (default 2 seconds)
3. Lower volume on some sound categories

## 🎉 Next Steps

- Add streak break sound ("Oh no!" when combo breaks)
- Add warm-up messages (1st hit: "Here we go!")
- Add combo decay warnings ("Keep it going!")
- Add different announcer personalities (toggle in settings)
- Add multiplayer trash talk announcements

---

Enjoy the British football announcer bringing your game to life! 🎙️⚽
