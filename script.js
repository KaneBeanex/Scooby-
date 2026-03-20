const secretKey = document.getElementById('secretKey');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');

// 🔐 Normalize key
function normalizeKey(key) {
    if (!key || key.length < 5) {
        throw new Error("Key must be at least 5 characters long");
    }
    return key;
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

// --- Base64 helpers for raw bytes ---
function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
}

function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

// --- ENGINE ---
function scoobyEngine(text, key, isEncoding) {
    key = normalizeKey(key);
    if (!text) return "";

    const len = text.length;
    const seq = getSequence(key, len);
    const p = getPermutation(len, key);

    if (isEncoding) {
        // Transform to numeric values
        const transformed = new Uint16Array(len);

        for (let i = 0; i < len; i++) {
            const code = text.charCodeAt(i) ^ seq[i];
            const k = key.charCodeAt(i % key.length);
            transformed[i] = (code + (k * k)) % 65535;
        }

        // Permute
        const permuted = new Uint16Array(len);
        p.forEach((originalIndex, newIndex) => {
            permuted[newIndex] = transformed[originalIndex];
        });

        // Pack raw bytes, then base64
        const bytes = new Uint8Array(permuted.buffer);
        return bytesToBase64(bytes);
    } else {
        // Decode base64 to bytes
        const bytes = base64ToBytes(text);

        if (bytes.byteLength % 2 !== 0) {
            throw new Error("Corrupt payload");
        }

        const values = new Uint16Array(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength / 2
        );

        if (values.length !== len) {
            throw new Error("Length mismatch or wrong key");
        }

        // Unpermute
        const unpermuted = new Uint16Array(len);
        p.forEach((originalIndex, newIndex) => {
            unpermuted[originalIndex] = values[newIndex];
        });

        // Reverse transform
        let result = new Array(len);

        for (let i = 0; i < len; i++) {
            const k = key.charCodeAt(i % key.length);
            const step1 = (unpermuted[i] - (k * k) + 65535) % 65535;
            result[i] = String.fromCharCode(step1 ^ seq[i]);
        }

        return result.join("");
    }
}


// =======================
// 🔁 UNDO / REDO SYSTEM
// =======================
let history = [];
let future = [];

// Initialize history with an empty state
history.push({ text: "" });

function saveState(value) {
    // Only save if the value is different from the current state
    if (history.length === 0 || history[history.length - 1].text !== value) {
        history.push({ text: value });
        future = []; // Clear redo stack on new input
    }
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

// Connect Undo/Redo Buttons
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

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

// 🧹 CLEAR FUNCTION (Fixed to support undo)
document.getElementById('clearBtn').addEventListener('click', () => {
    inputText.value = "";
    outputText.value = "";
    
    // Save the empty state to history so the user can undo the clear action!
    saveState("");
});
