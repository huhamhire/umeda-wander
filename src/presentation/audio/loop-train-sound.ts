import type { LoopTrainCue } from '../../application/exploration/osaka-loop-train.ts';

// Transcribed onsets in seconds, MIDI pitches and relative strike strengths.
const arrivalPattern = [
    [0, 74, .68], [.123, 69, .84], [.247, 74, .79], [.374, 76, .77], [.498, 78, .96],
    [.621, 74, .68], [.745, 76, .82], [.868, 78, .90], [.991, 81, .88],
    [1.119, 76, .75], [1.244, 78, 1], [1.369, 81, .93], [1.492, 86, .86],
    [1.993, 76, .76], [2.117, 78, .91], [2.236, 81, .87],
    [2.361, 76, .83], [2.486, 78, .96], [2.607, 81, .93],
    [2.731, 76, .78], [2.853, 78, .92], [2.978, 81, 1],
    [3.103, 76, .77], [3.226, 78, .95], [3.347, 81, .95],
    [3.472, 74, .71], [3.600, 76, .82], [3.727, 78, .97], [3.844, 81, 1],
    [3.977, 86, .91]
] as const;
// Osaka Station (大阪駅) departure cue, transcribed from the spectrum of the supplied MIDI recreation.
// Each entry gives the onset in seconds, sounding pitches and an estimated decay.
const departurePattern = [
    [0, [53, 72, 77], .70], [.36, [72, 77], .37], [.54, [57, 60, 75], .71],
    [.90, [74], .45], [1.10, [58, 74], .77], [1.64, [62], .61],
    [1.98, [65, 70], .59], [2.34, [62], .54], [2.70, [70, 74], .44],
    [2.88, [72, 77], .50], [3.06, [65], .51], [3.24, [70, 72, 77], .49],
    [3.42, [57, 75], .75], [3.78, [74], .47], [3.96, [74], .62],
    [4.12, [55], .54], [4.30, [72], .43], [4.48, [58, 70], .70],
    [4.84, [62], .59], [5.20, [67, 72], .52], [5.38, [74], .39],
    [5.58, [51, 67, 70, 72, 75], 1.10]
] as const;
// The next recorded cycle starts after the final strike has rung out.
const arrivalCycleStarts = [0, 5.6] as const;
const nearDistance = 65;
const maxDistance = 420;

/** Fade smoothly with distance from the station; distant scenes never trigger audio. */
export function platformGain(distance: number): number {
    const remaining = Math.max(0, Math.min(1, (maxDistance - distance) / (maxDistance - nearDistance)));
    return .18 * remaining ** 2;
}

/** Schedule the damped body or bright octave partial of a single strike. */
function strike(
    context: AudioContext, voice: GainNode, wave: PeriodicWave, time: number,
    frequency: number, strength: number, decay: number, sustain = .18
): OscillatorNode {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.setPeriodicWave(wave);
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(strength, time + .004);
    envelope.gain.exponentialRampToValueAtTime(strength * .64, time + .06);
    envelope.gain.exponentialRampToValueAtTime(strength * sustain, time + decay * .52);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + decay);
    oscillator.connect(envelope).connect(voice);
    oscillator.start(time);
    oscillator.stop(time + decay);
    return oscillator;
}

/** Schedule two approach cycles with separately damped resonances for overlapping strikes. */
function playArrival(context: AudioContext, voice: GainNode): OscillatorNode | undefined {
    const body = context.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, .12, .06]));
    const octave = context.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, .36, .09]));
    const start = context.currentTime + .02;
    let lastBody: OscillatorNode | undefined;
    for (const cycleStart of arrivalCycleStarts) {
        for (const [onset, midi, strength] of arrivalPattern) {
            const time = start + cycleStart + onset;
            const frequency = 440 * 2 ** ((midi - 69) / 12);
            const closing = midi === 86;
            // The upper resonance is prominent in the recording, particularly on D and A.
            const brightness = midi === 74 || midi === 81 ? .34 : .22;
            strike(context, voice, octave, time, frequency * 1.982, strength * brightness, closing ? .91 : .46);
            lastBody = strike(context, voice, body, time, frequency, strength * .37, closing ? 1.33 : .62);
        }
    }
    return lastBody;
}

/** Render the departure melody and its bass together, using a bright keyboard-like wave. */
function playDeparture(context: AudioContext, voice: GainNode): OscillatorNode | undefined {
    const bass = context.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, .08, .04, .28]));
    const lead = context.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, .42, .07, .40]));
    const start = context.currentTime + .02;
    let lastNote: OscillatorNode | undefined;
    for (const [onset, pitches, decay] of departurePattern) {
        for (const midi of pitches) {
            const lowerVoice = midi <= 62;
            const frequency = 440 * 2 ** ((midi - 69) / 12);
            lastNote = strike(
                context, voice, lowerVoice ? bass : lead, start + onset, frequency, lowerVoice ? .22 : .27, decay, .48
            );
        }
    }
    return lastNote;
}

/** Play each train cue once and update its gain while the listener moves. */
export class LoopTrainSound {
    private context?: AudioContext;
    private output?: GainNode;
    private voice?: GainNode;
    private played?: LoopTrainCue;
    private target = 0;
    private enabled: boolean;
    private readonly onStateChange?: () => void;

    /** Store the sound preference and report browser playback state changes. */
    constructor(enabled: boolean, onStateChange?: () => void) {
        this.enabled = enabled;
        this.onStateChange = onStateChange;
    }

    /** Check whether the browser currently allows this page to play audio. */
    get ready(): boolean {
        return this.context?.state === 'running';
    }

    /** Prepare the audio graph without forcing a resume on browsers that require a gesture. */
    prepare(): void {
        if (this.context || !this.enabled || typeof AudioContext === 'undefined') {
            return;
        }
        try {
            const context = new AudioContext();
            const output = context.createGain();
            output.gain.value = 0;
            output.connect(context.destination);
            context.onstatechange = () => this.onStateChange?.();
            this.context = context;
            this.output = output;
        } catch {
            // Audio is optional on restricted or unsupported renderers.
        }
    }

    /** Resume a suspended context from an explicit browser interaction. */
    unlock(): void {
        if (!this.enabled) {
            return;
        }
        this.prepare();
        const context = this.context;
        if (context && context.state !== 'running' && context.state !== 'closed') {
            void context.resume().catch(() => {});
        }
    }

    /** Muting stops the current cue immediately. */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.update(undefined, Infinity);
        }
    }

    /** Fade an active voice in place; an infinite distance marks a hidden tab or platform. */
    update(cue: LoopTrainCue | undefined, distance: number): void {
        const { context, output } = this;
        if (!context || !output) {
            return;
        }
        const audibleView = this.enabled && Number.isFinite(distance);
        const target = audibleView ? platformGain(distance) : 0;
        if (target !== this.target) {
            output.gain.setTargetAtTime(target, context.currentTime, .05);
            this.target = target;
        }
        if (!audibleView) {
            this.voice?.disconnect();
            this.voice = undefined;
            return;
        }
        const alreadyPlayed = cue?.id === this.played?.id && cue?.kind === this.played?.kind;
        if (target && cue && !alreadyPlayed && context.state === 'running') {
            this.voice?.disconnect();
            const voice = context.createGain();
            this.voice = voice;
            voice.connect(output);
            const ending = cue.kind === 'arrival' ? playArrival(context, voice) : playDeparture(context, voice);
            if (ending) {
                ending.onended = () => {
                    if (this.voice === voice) {
                        voice.disconnect();
                        this.voice = undefined;
                    }
                };
            }
            this.played = cue;
        }
    }
}
