import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindPlaybackWakeLock } from '../../src/presentation/components/playback-wake-lock.ts';

/** Stub the visibility and lifecycle events used by the binding. */
function createPage() {
    return Object.assign(new EventTarget(), { visibilityState: 'visible', defaultView: new EventTarget() });
}

/** Track release so assertions can distinguish active and discarded screen locks. */
function createLock() {
    return {
        released: false,
        async release() {
            this.released = true;
        }
    };
}

test('one screen lock covers overlapping playback and is released when the page is hidden', async t => {
    const doc = createPage();
    const locks: ReturnType<typeof createLock>[] = [];
    const request = t.mock.fn(async () => {
        const lock = createLock();
        locks.push(lock);
        return lock;
    });
    const setPlaying = bindPlaybackWakeLock(doc as unknown as Document, { request } as unknown as WakeLock);
    setPlaying('route', true);
    setPlaying('train', true);
    await Promise.resolve();
    assert.deepEqual(request.mock.calls.map(call => call.arguments), [['screen']]);
    setPlaying('route', false);
    assert.equal(locks[0]!.released, false);

    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(locks[0]!.released, true);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    assert.equal(locks[1]!.released, false);

    setPlaying('train', false);
    assert.equal(locks[1]!.released, true);
});

test('a pending lock that resolves after pagehide is discarded and pageshow can reacquire', async () => {
    const doc = createPage();
    let resolve!: (lock: ReturnType<typeof createLock>) => void;
    const nextLock = createLock();
    let queued = new Promise<ReturnType<typeof createLock>>(complete => {
        resolve = complete;
    });
    const setPlaying = bindPlaybackWakeLock(doc as unknown as Document, {
        request: () => queued
    } as unknown as WakeLock);
    setPlaying('tour', true);
    doc.defaultView.dispatchEvent(new Event('pagehide'));
    const staleLock = createLock();
    resolve(staleLock);
    await Promise.resolve();
    assert.equal(staleLock.released, true);

    queued = Promise.resolve(nextLock);
    doc.defaultView.dispatchEvent(new Event('pageshow'));
    await Promise.resolve();
    assert.equal(nextLock.released, false);
    setPlaying('tour', false);
    assert.equal(nextLock.released, true);
});
