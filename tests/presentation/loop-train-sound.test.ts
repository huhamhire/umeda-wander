import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loopTrainSoundCue } from '../../src/application/exploration/osaka-loop-train.ts';
import { LoopTrainSound, platformGain } from '../../src/presentation/audio/loop-train-sound.ts';

test('platform cues follow the listener during playback and play once per train phase', (t) => {
    const starts: number[] = [];
    const stops: number[] = [];
    const pitches: number[] = [];
    const gains: number[] = [];
    let disconnects = 0;

    /** Supply the gain and connections used by the synthesized voice. */
    function createGain() {
        return {
            gain: {
                value: 0,
                setTargetAtTime: (gain: number) => gains.push(gain),
                setValueAtTime: t.mock.fn(),
                exponentialRampToValueAtTime: t.mock.fn()
            },
            connect: t.mock.fn(),
            disconnect: () => {
                disconnects += 1;
            }
        };
    }

    const context = {
        currentTime: 10,
        state: 'suspended',
        resume: async () => {
            context.state = 'running';
        },
        destination: {},
        createGain,
        createPeriodicWave: t.mock.fn(),
        createOscillator: () => {
            const frequency = { value: 0 };
            return {
                frequency,
                setPeriodicWave: t.mock.fn(),
                connect: (target: ReturnType<typeof createGain>) => target,
                start: (time: number) => {
                    starts.push(time);
                    pitches.push(frequency.value);
                },
                stop: (time: number) => stops.push(time)
            };
        }
    };
    const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
    Object.defineProperty(globalThis, 'AudioContext', {
        configurable: true,
        value: function AudioContextStub() {
            return context;
        }
    });
    t.after(() => {
        if (original) {
            Object.defineProperty(globalThis, 'AudioContext', original);
        } else {
            Reflect.deleteProperty(globalThis, 'AudioContext');
        }
    });

    const sound = new LoopTrainSound(true);
    sound.prepare();
    assert.equal(sound.ready, false);
    const arrival = loopTrainSoundCue(9000).cue;
    sound.update(arrival, 350);
    assert.equal(starts.length, 0);
    sound.unlock();
    assert.equal(sound.ready, true);
    sound.update(arrival, 420);
    assert.equal(starts.length, 0);
    sound.update(loopTrainSoundCue(14000).cue, 350);
    const notes = starts.length;
    const perCycle = notes / 2;
    assert.ok(perCycle > 0 && Number.isInteger(perCycle));
    assert.deepEqual(pitches.slice(0, perCycle), pitches.slice(perCycle));
    assert.ok(Math.abs(starts[perCycle]! - starts[0]! - 5.6) < .001);
    const duration = stops.at(-1)! - starts[0]!;
    assert.ok(duration > 10 && duration < 11);
    sound.update(undefined, 160);
    assert.equal(gains.at(-1), platformGain(160));
    assert.equal(starts.length, notes);
    sound.update(undefined, 421);
    assert.equal(gains.at(-1), 0);
    assert.equal(disconnects, 0);
    sound.update(undefined, 65);
    assert.equal(gains.at(-1), platformGain(65));
    assert.equal(starts.length, notes);

    const departure = loopTrainSoundCue(33000).cue;
    sound.update(departure, 80);
    const afterDeparture = starts.length;
    assert.ok(afterDeparture > notes && afterDeparture < notes * 2);
    const departureDuration = stops.at(-1)! - starts[notes]!;
    assert.ok(departureDuration > 6 && departureDuration < 7);
    assert.deepEqual(starts.slice(notes, notes + 3), Array(3).fill(starts[notes]));
    assert.deepEqual(pitches.slice(notes, notes + 3).map(Math.round), [175, 523, 698]);
    sound.update(loopTrainSoundCue(33999).cue, 160);
    assert.equal(gains.at(-1), platformGain(160));
    assert.equal(starts.length, afterDeparture);
    sound.setEnabled(false);
    assert.equal(disconnects, 2);
    const nextArrival = loopTrainSoundCue(69000).cue;
    sound.update(nextArrival, 0);
    assert.equal(starts.length, afterDeparture);
    sound.setEnabled(true);
    sound.update(nextArrival, 0);
    assert.equal(starts.length, afterDeparture + notes);
});
