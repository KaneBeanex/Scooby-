// --- CONFIG & STATE ---
let historyStack = [];
const MAX_HISTORY_AGE = 10000; // 10 seconds

// --- 1. BOUNCY KEY LOGIC ---
// This ensures that (Empty) and "00000" are treated as the exact same key.
function getActiveKey() {
    const inputKey = document.getElementById('secretKey').value.trim();
    return inputKey === "" ? "00000" : inputKey;
}

// --- 2. THE ENGINE (Deterministic & Reversible) ---
function scoobyEngine(text, isEncoding) {
    if (!text) return "";
    const key = getActiveKey();
    const keyCodes = Array.from(key).map(c => c.charCodeAt(0));
    
    // Seed-based shift logic
    const seed = keyCodes.reduce((a, b) => a + b, 0);
    
    try {
        if (isEncoding) {
            // Step A: Nonlinear Shift & XOR
            let encodedChars = text.split('').map((char, i) => {
                const charCode = char.charCodeAt(0);
                const keyChar = keyCodes[i % keyCodes.length];
                // Math: (Char + KeyOffset + NonlinearSeed)
                return charCode + keyChar + (seed % 13);
            });
            // Step B: Wrap in Base64 for safe transport
            return btoa(JSON.stringify(encodedChars));
        } else {
            // Step A: Unwrap Base64
            const data = JSON.parse(atob(text));
            // Step B: Reverse Math
            let decoded = data.map((code, i) => {
                const keyChar = keyCodes[i % keyCodes.length];
                const originalCharCode = code - keyChar - (seed % 13);
                return String.fromCharCode(originalCharCode);
            });
            return decoded.join('');
        }
    } catch (e) {
        console.error(e);
        return "❌ DECODE FAILED: Check your key or code!";
    }
}

// --- 3. UI HANDLERS ---
document.getElementById('encodeBtn').addEventListener('click', () => {
    saveState();
    const input = document.getElementById('inputText').value;
    document.getElementById('outputText').value = scoobyEngine(input, true);
});

document.getElementById('decodeBtn').addEventListener('click', () => {
    saveState();
    const input = document.getElementById('inputText').value;
    document.getElementById('outputText').value = scoobyEngine(input, false);
});

// --- 4. HISTORY & FULLSCREEN (Stays the same) ---
function saveState() {
    const state = {
        input: document.getElementById('inputText').value,
        output: document.getElementById('outputText').value,
        time: Date.now()
    };
    historyStack.push(state);
    if (historyStack.length > 20) historyStack.shift();
}

document.getElementById('undoBtn').addEventListener('click', () => {
    const now = Date.now();
    if (historyStack.length > 0) {
        const last = historyStack.pop();
        if (now - last.time <= MAX_HISTORY_AGE) {
            document.getElementById('inputText').value = last.input;
            document.getElementById('outputText').value = last.output;
        } else {
            alert("Mystery too old! (10s limit)");
        }
    }
});

// Fullscreen Logic
window.openFull = function(id) {
    const overlay = document.getElementById('fullScreenOverlay');
    const fullArea = document.getElementById('fullArea');
    const source = document.getElementById(id);
    fullArea.value = source.value;
    fullArea.readOnly = source.readOnly;
    fullArea.dataset.sourceId = id; // Store which one we're editing
    overlay.style.display = 'flex';
};

window.closeFull = function() {
    const fullArea = document.getElementById('fullArea');
    const sourceId = fullArea.dataset.sourceId;
    if (sourceId && !fullArea.readOnly) {
        document.getElementById(sourceId).value = fullArea.value;
    }
    document.getElementById('fullScreenOverlay').style.display = 'none';
};

document.getElementById('copyBtn').addEventListener('click', () => {
    const res = document.getElementById('outputText').value;
    navigator.clipboard.writeText(res);
    alert("Copied to clipboard!");
});

document.getElementById('pasteBtn').addEventListener('click', async () => {
    const text = await navigator.clipboard.readText();
    document.getElementById('inputText').value = text;
});

document.getElementById('clearBtn').addEventListener('click', () => {
    saveState();
    document.getElementById('inputText').value = "";
    document.getElementById('outputText').value = "";
});
