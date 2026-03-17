const secretKey = document.getElementById('secretKey');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');

// --- HELPER: Generate Nonlinear Sequence ---
function getSequence(key, length) {
    let seed = Array.from(key || "00000").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let seq = [];
    let x = seed;
    for (let i = 0; i < length; i++) {
        // Nonlinear recurrence: x = (ax^2 + bx + c) mod m
        x = (3 * Math.pow(x, 2) + 7 * x + 11) % 255;
        seq.push(Math.floor(x));
    }
    return seq;
}

// --- HELPER: Shuffle/Unshuffle positions ---
function getPermutation(length, key) {
    let indices = Array.from({length}, (_, i) => i);
    let seed = Array.from(key || "00000").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Seeded Fisher-Yates
    for (let i = length - 1; i > 0; i--) {
        const j = Math.floor((seed * (i + 1)) / 0xFFFF) % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
        seed = (seed * 9301 + 49297) % 233280; // Simple LCG to evolve seed
    }
    return indices;
}

// --- MAIN ENGINE ---
function scoobyEngine(text, key, isEncoding) {
    if (!text) return "";
    const len = text.length;
    const seq = getSequence(key, len);
    const p = getPermutation(len, key);
    let result = new Array(len);

    if (isEncoding) {
        // 1. XOR & Nonlinear Transform
        let transformed = text.split('').map((char, i) => {
            let code = char.charCodeAt(0) ^ seq[i];
            return (code + Math.pow(key.charCodeAt(i % key.length), 2)) % 65535;
        });
        // 2. Permute positions
        p.forEach((originalIndex, newIndex) => {
            result[newIndex] = transformed[originalIndex];
        });
    } else {
        // 1. Reverse Permute
        let unpermuted = new Array(len);
        p.forEach((originalIndex, newIndex) => {
            unpermuted[originalIndex] = text[newIndex];
        });
        // 2. Reverse Nonlinear & XOR
        result = unpermuted.map((code, i) => {
            let step1 = (code - Math.pow(key.charCodeAt(i % key.length), 2));
            while (step1 < 0) step1 += 65535; 
            return String.fromCharCode(step1 ^ seq[i]);
        });
    }
    
    return isEncoding ? btoa(JSON.stringify(result)) : result.join('');
}

// --- UI LOGIC ---
document.getElementById('encodeBtn').addEventListener('click', () => {
    const res = scoobyEngine(inputText.value, secretKey.value, true);
    outputText.value = res;
});

document.getElementById('decodeBtn').addEventListener('click', () => {
    try {
        const data = JSON.parse(atob(inputText.value));
        outputText.value = scoobyEngine(data, secretKey.value, false);
    } catch (e) {
        outputText.value = "❌ ERROR: Check Key or Code integrity.";
    }
});

document.getElementById('pasteBtn').addEventListener('click', async () => {
    const text = await navigator.clipboard.readText();
    inputText.value = text;
});

document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.value);
});

