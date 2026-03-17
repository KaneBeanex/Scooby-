const secretKey = document.getElementById('secretKey');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');

// 🔐 Normalize key
function normalizeKey(key) {
    return (key && key.length >= 5) ? key : "00000";
}

// --- HELPER: Sequence ---
function getSequence(key, length) {
    key = normalizeKey(key);

    let seed = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let seq = [];
    let x = seed;

    for (let i = 0; i < length; i++) {
        x = (3 * x * x + 7 * x + 11) % 255;
        seq.push(Math.floor(x));
    }

    return seq;
}

// --- HELPER: Permutation ---
function getPermutation(length, key) {
    key = normalizeKey(key);

    let indices = Array.from({ length }, (_, i) => i);
    let seed = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = length - 1; i > 0; i--) {
        const j = Math.floor((seed * (i + 1)) / 0xFFFF) % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
        seed = (seed * 9301 + 49297) % 233280;
    }

    return indices;
}

// --- ENGINE ---
function scoobyEngine(text, key, isEncoding) {
    key = normalizeKey(key);
    if (!text) return "";

    const len = text.length;
    const seq = getSequence(key, len);
    const p = getPermutation(len, key);
    let result = new Array(len);

    if (isEncoding) {
        let transformed = text.split('').map((char, i) => {
            let code = char.charCodeAt(0) ^ seq[i];
            let k = key.charCodeAt(i % key.length);
            return (code + (k * k)) % 65535;
        });

        p.forEach((originalIndex, newIndex) => {
            result[newIndex] = transformed[originalIndex];
        });

        return btoa(JSON.stringify(result));

    } else {
        let unpermuted = new Array(len);

        p.forEach((originalIndex, newIndex) => {
            unpermuted[originalIndex] = text[newIndex];
        });

        result = unpermuted.map((code, i) => {
            let k = key.charCodeAt(i % key.length);
            let step1 = (code - (k * k) + 65535) % 65535;
            return String.fromCharCode(step1 ^ seq[i]);
        });

        return result.join('');
    }
}

// =======================
// 🔁 UNDO / REDO SYSTEM
// =======================
let history = [];
let future = [];

function saveState(value) {
    const now = Date.now();

    history.push({ text: value, time: now });

    // Keep last 10 seconds only
    history = history.filter(h => now - h.time <= 10000);

    // Clear redo stack on new input
    future = [];
}

// Track typing
inputText.addEventListener('input', () => {
    saveState(inputText.value);
});

// Undo
function undo() {
    if (history.length > 1) {
        future.push(history.pop());
        inputText.value = history[history.length - 1].text;
    }
}

// Redo
function redo() {
    if (future.length > 0) {
        const next = future.pop();
        history.push(next);
        inputText.value = next.text;
    }
}

// =======================
// 🎯 UI ACTIONS
// =======================

// Encode
document.getElementById('encodeBtn').addEventListener('click', () => {
    const res = scoobyEngine(inputText.value, secretKey.value, true);
    outputText.value = res;
});

// Decode
document.getElementById('decodeBtn').addEventListener('click', () => {
    try {
        const raw = inputText.value.trim();
        const decoded = atob(raw);
        const data = JSON.parse(decoded);

        outputText.value = scoobyEngine(data, secretKey.value, false);
    } catch {
        outputText.value = "❌ ERROR: Invalid key or corrupted code.";
    }
});

// Paste (robust)
document.getElementById('pasteBtn').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        inputText.value = text;
        saveState(text);
    } catch {
        alert("Clipboard access denied.");
    }
});

// Copy (robust)
document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(outputText.value);
    } catch {
        alert("Copy failed.");
    }
});

// =======================
// ⌨️ SHORTCUTS
// =======================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

// 🧹 CLEAR FUNCTION
document.getElementById('clearBtn').addEventListener('click', () => {
    inputText.value = "";
    outputText.value = "";

    // reset history + redo
    history = [];
    future = [];

    // store empty state
    saveState("");
});