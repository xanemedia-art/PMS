const fs = require('fs');
const path = require('path');

function search(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) { return; }
    
    for (const file of files) {
        if (dir === 'node_modules' && file === '.cache') continue;
        const full = path.join(dir, file);
        let stat;
        try { stat = fs.statSync(full); } catch (e) { continue; }
        
        if (stat.isDirectory()) {
            search(full);
        } else if (full.endsWith('.js') || full.endsWith('.cjs') || full.endsWith('.mjs')) {
            const content = fs.readFileSync(full, 'utf8');
            if (content.includes('window.fetch =') || content.includes('window.fetch=') || content.includes('globalThis.fetch =') || content.includes('globalThis.fetch=')) {
                console.log(full);
            }
        }
    }
}

search('node_modules');
