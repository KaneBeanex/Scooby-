// =======================
// 🔐 CORE CONFIG
// =======================
const DEFAULT_KEY = "00000";

// =======================
// 🔑 KEY UTILS
// =======================
function normalizeKey(key) {
    return (key && key.length >= 5) ? key : DEFAULT_KEY;
}

function keySeed(key) {
    return Array.from(key).reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

// =======================
// 🔢 SEQUENCE GENERATOR (Optimized)
// =======================
function getSequence(len, seed) {
    const seq = new Uint8Array(len);
    let x = seed;

    for (let i = 0; i < len; i++) {
        x = (3 * x * x + 7 * x + 11) & 255; // faster than %
        seq[i] = x;
    }
    return seq;
}

// =======================
// 🔀 PERMUTATION (Fisher-Yates)
// =======================
function getPermutation(len, seed) {
    const p = new Uint16Array(len);
    for (let i = 0; i < len; i++) p[i] = i;

    let x = seed;

    for (let i = len - 1; i > 0; i--) {
        x = (x * 9301 + 49297) % 233280;
        const j = x % (i + 1);

        [p[i], p[j]] = [p[j], p[i]];
    }

    return p;
}

// =======================
// 📦 BINARY CODEC (ULTRA COMPACT)
// =======================
const Codec = {
    encode(arr) {
        return btoa(String.fromCharCode(...arr));
    },

    decode(str) {
        const bin = atob(str);
        const arr = new Uint8Array(bin.length);

        for (let i = 0; i < bin.length; i++) {
            arr[i] = bin.charCodeAt(i);
        }
        return arr;
    }
};

// =======================
// ⚙️ ENCRYPTION ENGINE
// =======================
const Engine = {
    encode(text, key) {
        key = normalizeKey(key);
        if (!text) return "";

        const len = text.length;
        const seed = keySeed(key);

        const seq = getSequence(len, seed);
        const perm = getPermutation(len, seed);

        const temp = new Uint8Array(len);

        // 🔐 Transform
        for (let i = 0; i < len; i++) {
            let c = text.charCodeAt(i);
            let k = key.charCodeAt(i % key.length);

            temp[i] = (c ^ seq[i] ^ k) & 255;
        }

        // 🔀 Permute
        const out = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            out[i] = temp[perm[i]];
        }

        return Codec.encode(out);
    },

    decode(base64, key) {
        key = normalizeKey(key);
        if (!base64) return "";

        const data = Codec.decode(base64);
        const len = data.length;
        const seed = keySeed(key);

        const seq = getSequence(len, seed);
        const perm = getPermutation(len, seed);

        // 🔁 Reverse permutation
        const temp = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            temp[perm[i]] = data[i];
        }

        // 🔓 Reverse transform
        let result = "";
        for (let i = 0; i < len; i++) {
            let k = key.charCodeAt(i % key.length);
            let c = temp[i] ^ seq[i] ^ k;
            result += String.fromCharCode(c);
        }

        return result;
    }
};


// =======================
// 🎯 UI CONTROLLER
// =======================
const UI = (() => {
    const el = id => document.getElementById(id);

    const input = el('inputText');
    const output = el('outputText');
    const key = el('secretKey');

    return {
        encode() {
            output.value = Engine.encode(input.value, key.value);
        },

        decode() {
            try {
                output.value = Engine.decode(input.value.trim(), key.value);
            } catch {
                output.value = "❌ Invalid key or corrupted data.";
            }
        },

        clear() {
            input.value = "";
            output.value = "";
        },

        copy() {
            navigator.clipboard.writeText(output.value);
        },

        async paste() {
            input.value = await navigator.clipboard.readText();
        }
    };
})();


// =======================
// 🧠 HISTORY SYSTEM
// =======================
const History = (() => {
    let stack = [""];
    let redoStack = [];

    return {
        save(val) {
            if (stack[stack.length - 1] !== val) {
                stack.push(val);
                redoStack = [];
            }
        },

        undo(input) {
            if (stack.length > 1) {
                redoStack.push(stack.pop());
                input.value = stack[stack.length - 1];
            }
        },

        redo(input) {
            if (redoStack.length) {
                const val = redoStack.pop();
                stack.push(val);
                input.value = val;
            }
        }
    };
})();

// =======================
// 🔗 EVENTS
// =======================
const input = document.getElementById('inputText');

input.addEventListener('input', () => {
    History.save(input.value);
});

document.getElementById('encodeBtn').onclick = UI.encode;
document.getElementById('decodeBtn').onclick = UI.decode;
document.getElementById('clearBtn').onclick = UI.clear;
document.getElementById('copyBtn').onclick = UI.copy;
document.getElementById('pasteBtn').onclick = UI.paste;

document.getElementById('undoBtn').onclick = () => History.undo(input);
document.getElementById('redoBtn').onclick = () => History.redo(input);

// Shortcuts
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        History.undo(input);
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        History.redo(input);
    }
});
