const { rmSync } = require('node:fs');
const { join } = require('node:path');
const distPath = join(__dirname, 'dist');
// Удаляем директорию сборки, для того, чтобы в ней не отказалось лишних файлов
try {
    rmSync(distPath, { recursive: true, force: true });
} catch (err) {
    if (err.code !== 'ENOENT') throw err;
}
