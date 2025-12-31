# Sound Effects for Voice Modal

This folder contains sound effects for the voice recording feature.

## Current Files

- `beep.mp3` - Sound played when recording **starts** (33 KB)
- `click.wav` - Sound played when recording **stops** (2.6 KB)

✅ **Sound playback is ENABLED** - Ready to use!

## Where to Get Free Sound Effects

### Option 1: Freesound.org (Recommended)
1. Visit https://freesound.org
2. Search for "beep" or "click" or "notification"
3. Download your preferred sounds (WAV format preferred)
4. Rename them to `start.wav` and `stop.wav`
5. Place them in this folder

### Option 2: Mixkit
Direct links to good options:
- **Recording Start**: https://mixkit.co/free-sound-effects/click/ (any short click)
- **Recording Stop**: https://mixkit.co/free-sound-effects/beep/ (any short beep)

### Option 3: Zapsplat
1. Visit https://www.zapsplat.com
2. Search for "UI click" or "notification beep"
3. Download free sounds (registration required)

## Recommended Sound Characteristics

### start.wav
- Duration: 0.1 - 0.3 seconds
- Type: Short "blip" or "click"
- Volume: Moderate (not too loud)

### stop.wav
- Duration: 0.1 - 0.5 seconds
- Type: Short "beep" or "ding"
- Volume: Moderate

## How It Works

The sound effects are already integrated into [VoiceModal.js](../../components/log/VoiceModal.js):

- **Line 19**: Audio import is enabled
- **Lines 93-111**: playSound function is active
- **Line 96**: Uses `beep.mp3` for recording start
- **Line 97**: Uses `click.wav` for recording stop

## Testing

Test the sounds by:
1. Opening the voice recording modal in your app
2. Tap the microphone to **start recording** → Should hear `beep.mp3`
3. Tap to **stop recording** → Should hear `click.wav`

## To Change Sound Files

To use different sounds, simply replace `beep.mp3` and `click.wav` with your own files:

```javascript
// In VoiceModal.js line 95-97:
const source = type === 'start'
  ? require('../../assets/sounds/beep.mp3')      // Change this
  : require('../../assets/sounds/click.wav');    // Or this
```