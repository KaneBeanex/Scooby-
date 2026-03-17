// --- CONFIG & STATE ---
let historyStack = [];
let redoStack = [];
const MAX_HISTORY_AGE = 10000; // 10 seconds

// --- HELPERS ---
function getActiveKey() {
    const val = document.getElementById('secretKey').value;
    return val.trim() === "" ? "00000" : val;
}

function saveState() {
    const state = {
        input: document.getElementById('inputText').value,
        output: document.getElementById('outputText').value,
        time: Date.now()
    };
    historyStack.push(state);
    if (historyStack.length > 30) historyStack.shift();
    redoStack = []; 
}

// --- NONLINEAR ENGINE ---
function getSequence(key, length) {
    let seed = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let seq = [];
    let x = seed;
    for (let i = 0; i < length; i++) {
        x = (3 * Math.pow(x, 2) + 7 * x + 11) % 255;
        seq.push(Math.floor(x));
    }
    return seq;
}

function getPermutation(length, key) {
    let indices = Array.from({length}, (_, i) => i);
    let seed = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = length - 1; i > 0; i--) {
        const j = Math.floor((seed * (i + 1)) / 0xFFFF) % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
        seed = (seed * 9301 + 49297) % 233280;
    }
    return indices;
}

function scoobyEngine(text, isEncoding) {
    if (!text) return "";
    const key = getActiveKey();
    const len = text.length;
    const seq = getSequence(key, len);
    const p = getPermutation(len, key);
    let result = new Array(len);

    try {
        if (isEncoding) {
            let transformed = text.split('').map((char, i) => {
                let code = char.charCodeAt(0) ^ seq[i];
                return (code + Math.pow(key.charCodeAt(i % key.length), 2)) % 65535;
            });
            p.forEach((origIdx, newIdx) => { result[newIdx] = transformed[origIdx]; });
            return btoa(JSON.stringify(result));
        } else {
            const data = JSON.parse(atob(text));
            let unpermuted = new Array(data.length);
            p.forEach((origIdx, newIdx) => { unpermuted[origIdx] = data[newIdx]; });
            let final = unpermuted.map((code, i) => {
                let step1 = (code - Math.pow(key.charCodeAt(i % key.length), 2));
                while (step1 < 0) step1 += 65535;
                return String.fromCharCode(step1 ^ seq[i]);
            });
            return final.join('');
        }
    } catch (e) { return "❌ INVALID CODE OR KEY"; }
}

// --- UI CONTROLS ---
document.getElementById('encodeBtn').addEventListener('click', () => {
    saveState();
    document.getElementById('outputText').value = scoobyEngine(document.getElementById('inputText').value, true);
});

document.getElementById('decodeBtn').addEventListener('click', () => {
    saveState();
    document.getElementById('outputText').value = scoobyEngine(document.getElementById('inputText').value, false);
});

// Undo Logic (10-second filter)
document.getElementById('undoBtn').addEventListener('click', () => {
    const now = Date.now();
    if (historyStack.length > 0) {
        const lastState = historyStack.pop();
        if (now - lastState.time <= MAX_HISTORY_AGE) {
            redoStack.push({
                input: document.getElementById('inputText').value,
                output: document.getElementById('outputText').value
            });
            document.getElementById('inputText').value = lastState.input;
            document.getElementById('outputText').value = lastState.output;
        } else {
            alert("Mystery expired! (10s limit)");
        }
    }
});

// Full Screen Support
let activeSourceId = null;
window.openFull = function(id) {
    activeSourceId = id;
    const overlay = document.getElementById('fullScreenOverlay');
    const fullArea = document.getElementById('fullArea');
    const sourceArea = document.getElementById(id);
    fullArea.value = sourceArea.value;
    fullArea.readOnly = sourceArea.readOnly;
    overlay.style.display = 'flex';
};

window.closeFull = function() {
    if (activeSourceId && !document.getElementById('fullArea').readOnly) {
        document.getElementById(activeSourceId).value = document.getElementById('fullArea').value;
    }
    document.getElementById('fullScreenOverlay').style.display = 'none';
};

document.getElementById('clearBtn').addEventListener('click', () => {
    saveState();
    document.getElementById('inputText').value = "";
    document.getElementById('outputText').value = "";
});

document.getElementById('pasteBtn').addEventListener('click', async () => {
    const text = await navigator.clipboard.readText();
    document.getElementById('inputText').value = text;
});
