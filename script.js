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
const MAX_HISTORY = 50; // Replaced 10-second timer with a 50-step limit

function saveState(value) {
    // Prevent saving identical back-to-back states
    if (history.length > 0 && history[history.length - 1].text === value) {
        return;
    }

    history.push({ text: value });

    // Keep memory clean by limiting history size
    if (history.length > MAX_HISTORY) {
        history.shift(); 
    }

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
    } else if (history.length === 1) {
        // If we only have one item left, undoing should empty the box
        future.push(history.pop());
        inputText.value = "";
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

// 🧹 CLEAR FUNCTION
document.getElementById('clearBtn').addEventListener('click', () => {
    saveState(""); // Save the empty state so we can undo the clear
    inputText.value = "";
    outputText.value = "";
});

// 🖥️ FULL-SCREEN TOGGLE
const fullscreenBtn = document.getElementById('fullscreenBtn'); 
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });
}

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
