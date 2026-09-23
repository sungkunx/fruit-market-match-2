const test = require('node:test');
const assert = require('node:assert/strict');
const GameAudio = require('../audio.js');

// Instrument names playing on one sixteenth step.
function names(step, intensity) {
    return GameAudio.musicStep(step, intensity).map(event => event.instrument).sort();
}

function find(step, intensity, instrument) {
    return GameAudio.musicStep(step, intensity).find(event => event.instrument === instrument);
}

// Every step of the 64-step loop, for the given instrument.
function stepsWith(instrument, intensity) {
    const steps = [];
    for (let step = 0; step < 64; step++) {
        if (find(step, intensity, instrument)) steps.push(step);
    }
    return steps;
}

test('at intensity 0 only kick, bass, and melody play', () => {
    for (let step = 0; step < 64; step++) {
        names(step, 0).forEach(instrument => {
            assert.ok(['kick', 'bass', 'melody'].includes(instrument), `${instrument} at step ${step}`);
        });
    }
});

test('the kick lands on every quarter note', () => {
    assert.deepEqual(stepsWith('kick', 0), [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]);
});

test('the hat is added at intensity 1, on the off eighths', () => {
    assert.deepEqual(stepsWith('hat', 0), []);
    assert.deepEqual(stepsWith('hat', 1), [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62]);
});

test('the clap is added at intensity 2, on beats 2 and 4', () => {
    assert.deepEqual(stepsWith('clap', 1), []);
    assert.deepEqual(stepsWith('clap', 2), [4, 12, 20, 28, 36, 44, 52, 60]);
});

test('the sparkle is added at intensity 3, on odd steps', () => {
    assert.deepEqual(stepsWith('sparkle', 2), []);
    const sparkleSteps = stepsWith('sparkle', 3);
    assert.equal(sparkleSteps.length, 32);
    sparkleSteps.forEach(step => assert.equal(step % 2, 1));
});

test('the bass follows the chord roots and jumps an octave on the off beat', () => {
    // C2, A1, F1, G1 for the C, Am, F, G bars.
    assert.equal(find(0, 0, 'bass').midi, 36);
    assert.equal(find(16, 0, 'bass').midi, 33);
    assert.equal(find(32, 0, 'bass').midi, 29);
    assert.equal(find(48, 0, 'bass').midi, 31);
    assert.equal(find(2, 0, 'bass').midi, 48);
    assert.equal(find(18, 0, 'bass').midi, 45);
});

test('the melody starts every bar and stays in C major', () => {
    const cMajor = [0, 2, 4, 5, 7, 9, 11];
    [0, 16, 32, 48].forEach(step => {
        assert.ok(find(step, 0, 'melody'), `bar starting at ${step} has no melody note`);
    });
    for (let step = 0; step < 64; step++) {
        const note = find(step, 0, 'melody');
        if (note) assert.ok(cMajor.includes(note.midi % 12), `step ${step} note ${note.midi} is out of key`);
    }
});

test('the loop repeats every 64 steps', () => {
    for (let step = 0; step < 64; step++) {
        assert.deepEqual(GameAudio.musicStep(step + 64, 3), GameAudio.musicStep(step, 3));
        assert.deepEqual(GameAudio.musicStep(step + 640, 1), GameAudio.musicStep(step, 1));
    }
});

test('the fanfare rises and finishes inside the pause it asks the music for', () => {
    const notes = GameAudio.fanfareNotes();
    assert.ok(notes.length >= 3);
    assert.equal(notes[0].at, 0);
    notes.forEach((note, index) => {
        if (index === 0) return;
        assert.ok(note.midi > notes[index - 1].midi, 'each note is higher than the last');
        assert.ok(note.at > notes[index - 1].at, 'each note starts later than the last');
    });
    const end = Math.max(...notes.map(note => note.at + note.duration));
    assert.ok(end <= GameAudio.fanfareSeconds, 'the last note ends before the music comes back');
});

test('fanfareNotes hands out a copy, so callers cannot edit the fanfare', () => {
    GameAudio.fanfareNotes()[0].midi = 1;
    assert.notEqual(GameAudio.fanfareNotes()[0].midi, 1);
});

test('the title tune has no drums: pads and a bass to open each bar, a music box on top', () => {
    const instruments = new Set();
    for (let step = 0; step < 64; step++) {
        GameAudio.titleStep(step).forEach(event => instruments.add(event.instrument));
    }
    assert.deepEqual([...instruments].sort(), ['box', 'pad', 'softbass']);
    for (let bar = 0; bar < 4; bar++) {
        const opening = GameAudio.titleStep(bar * 16).map(event => event.instrument);
        assert.equal(opening.filter(name => name === 'pad').length, 3, `bar ${bar} opens on a full chord`);
        assert.ok(opening.includes('softbass'));
    }
});

test('the title tune loops every 64 steps', () => {
    for (let step = 0; step < 64; step++) {
        assert.deepEqual(GameAudio.titleStep(step + 64), GameAudio.titleStep(step));
    }
});
