const fs = require('fs');
const path = require('path');

// Конфигурация
const config = {
    baseUrl: 'https://www.maxim-m.ru/bot/ts-doc/documents/',
    excludeFiles: [
        'SECURITY.md', 'AFENT_PROPMPT.md', 'CHANGELOG.md',
        'fix-doc.js', 'fix-doc.mjs', 'doc-fix.js', 'typedoc.json'
    ],
    excludeDirs: ['node_modules', 'docs', 'dist', 'coverage', '.git', '.idea'],
    ignoredExtensions: [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
        '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib',
        '.woff', '.woff2', '.ttf', '.eot', '.map', '.lock', '.patch'
    ],
    // Допустимые префиксы для путей к md файлам в коде
    allowedPathPrefixes: ['./', '../', 'src/', 'docs/', 'examples/', 'cli/']
};

// Загрузка .gitignore
function loadGitignore() {
    try {
        if (fs.existsSync('.gitignore')) {
            const gitignore = fs.readFileSync('.gitignore', 'utf8');
            gitignore.split('\n').forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;
                const dir = line.replace(/^\//, '').replace(/\/$/, '');
                if (dir && !dir.includes('*') && !dir.includes('.')) {
                    if (!config.excludeDirs.includes(dir)) {
                        config.excludeDirs.push(dir);
                    }
                }
            });
            console.log('📖 Загружен .gitignore');
        }
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить .gitignore:', error.message);
    }
}

// Получение версии из package.json (major.minor)
function getVersionFromPackageJson() {
    try {
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const parts = packageJson.version.split('.');
        return parts[0] + '.' + parts[1];
    } catch (error) {
        console.error('Ошибка чтения package.json:', error.message);
        process.exit(1);
    }
}

// Надежная проверка исключений — разбиваем путь на части
function isExcluded(fullPath) {
    const normalizedPath = path.normalize(fullPath);
    const parts = normalizedPath.split(path.sep).filter(p => p && p !== '.');

    // Проверяем директории
    for (const excludeDir of config.excludeDirs) {
        if (parts.includes(excludeDir)) return true;
    }

    // Проверяем файлы
    const fileName = path.basename(fullPath);
    if (config.excludeFiles.includes(fileName)) return true;

    // Проверяем расширения
    const ext = path.extname(fullPath).toLowerCase();
    if (config.ignoredExtensions.includes(ext)) return true;

    return false;
}

// URL -> локальный путь к MD
function urlToFilePath(url) {
    let urlPath = url.replace(config.baseUrl, '');

    // Убираем якорь
    const hashIndex = urlPath.indexOf('#');
    if (hashIndex !== -1) urlPath = urlPath.substring(0, hashIndex);

    // Убираем префикс версии
    const versionMatch = urlPath.match(/umbot_v-\d+\.\d+_\.?/);
    if (versionMatch) urlPath = urlPath.substring(versionMatch[0].length);

    // Убираем ВСЕ .html в конце (защита от .html.html)
    urlPath = urlPath.replace(/(\.html)+$/g, '');

    // _ -> /
    urlPath = urlPath.replace(/_/g, '/');
    urlPath = urlPath.replace(/^\//, '');

    return urlPath + '.md';
}

// Локальный путь -> URL
function filePathToUrl(filePath, version) {
    let urlPath = filePath;
    urlPath = urlPath.replace(/\.md$/, '');
    urlPath = urlPath.replace(/(\.html)+$/g, ''); // защита от дублей
    urlPath = urlPath.replace(/^\.\//, '');
    urlPath = urlPath.replace(/^\//, '');
    urlPath = urlPath.replace(/\//g, '_');
    return config.baseUrl + 'umbot_v-' + version + '_.' + urlPath + '.html';
}

// Резолв пути
function resolveFilePath(urlOrPath, currentFile) {
    let localPath;

    if (urlOrPath.startsWith(config.baseUrl)) {
        localPath = urlToFilePath(urlOrPath);
    } else if (urlOrPath.endsWith('.md') && !urlOrPath.startsWith('http')) {
        if (currentFile) {
            const currentDir = path.dirname(currentFile);
            localPath = path.resolve(currentDir, urlOrPath);
        } else {
            localPath = path.resolve(urlOrPath);
        }
    } else {
        return null;
    }

    localPath = path.normalize(localPath);
    return fs.existsSync(localPath) ? localPath : null;
}

// Обход директории
function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach(f => {
        const fullPath = path.join(dir, f);
        if (isExcluded(fullPath)) return;

        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath, callback);
        } else {
            callback(fullPath);
        }
    });
}

// Поиск ссылок в файле
function findLinksInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const links = [];

    // 1. URL документации
    const urlRegex = new RegExp(
        config.baseUrl.replace(/\./g, '\\.') + '[^\\s\\)\\]"\'<>]+', 'g'
    );
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
        links.push({
            type: 'url',
            value: match[0],
            line: content.substring(0, match.index).split('\n').length,
            index: match.index
        });
    }

    // 2. Markdown ссылки [text](./path.md)
    const mdLinkRegex = /\[([^\]]+)\]\((\.[^)]+\.md(?:#[^)]*)?)\)/g;
    while ((match = mdLinkRegex.exec(content)) !== null) {
        links.push({
            type: 'path',
            value: match[2],
            line: content.substring(0, match.index).split('\n').length,
            index: match.index,
            fullMatch: match[0],
            text: match[1]
        });
    }

    // 3. Пути в коде — ТОЛЬКО с допустимыми префиксами (не ловим README.md, text.md и т.д.)
    const prefixPattern = config.allowedPathPrefixes
        .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    const codePathRegex = new RegExp(
        '(?:`|\'|")(' + prefixPattern + '[a-zA-Z0-9_\\-\\.\\/]+\\.md)(?:`|\'|")', 'g'
    );
    while ((match = codePathRegex.exec(content)) !== null) {
        links.push({
            type: 'path',
            value: match[1],
            line: content.substring(0, match.index).split('\n').length,
            index: match.index
        });
    }

    return links;
}

// Основная функция
function processFiles() {
    loadGitignore();

    const version = getVersionFromPackageJson();
    console.log(`🎯 Версия: ${version}`);
    console.log(`🚫 Исключения: ${config.excludeDirs.length} папок, ${config.excludeFiles.length} файлов\n`);

    const brokenLinks = [];
    const updatedFiles = new Set();
    let processedFiles = 0;

    walkDir('.', (filePath) => {
        const links = findLinksInFile(filePath);
        if (links.length === 0) return;

        processedFiles++;
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Обратный порядок, чтобы индексы не сдвигались
        const sortedLinks = links.sort((a, b) => b.index - a.index);

        sortedLinks.forEach(link => {
            const resolvedPath = resolveFilePath(link.value, filePath);

            if (resolvedPath) {
                if (link.type === 'url') {
                    const hashIndex = link.value.indexOf('#');
                    const hash = hashIndex !== -1 ? link.value.substring(hashIndex) : '';
                    const urlWithoutHash = hashIndex !== -1 ? link.value.substring(0, hashIndex) : link.value;
                    const localPath = urlToFilePath(urlWithoutHash);
                    const newUrl = filePathToUrl(localPath, version) + hash;

                    if (link.value !== newUrl) {
                        content = content.substring(0, link.index) + newUrl +
                            content.substring(link.index + link.value.length);
                        updatedFiles.add(filePath);
                    }
                } else if (link.type === 'path') {
                    const newUrl = filePathToUrl(link.value, version);

                    if (link.fullMatch) {
                        const newFullMatch = `[${link.text}](${newUrl})`;
                        content = content.substring(0, link.index) + newFullMatch +
                            content.substring(link.index + link.fullMatch.length);
                    } else {
                        content = content.substring(0, link.index) + newUrl +
                            content.substring(link.index + link.value.length);
                    }
                    updatedFiles.add(filePath);
                }
            } else {
                brokenLinks.push({
                    file: filePath,
                    line: link.line,
                    type: link.type,
                    value: link.value
                });
            }
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
    });

    console.log(`\n📊 Обработано: ${processedFiles} | Обновлено: ${updatedFiles.size}`);

    if (brokenLinks.length === 0) {
        console.log('\n✅ Все ссылки корректны!');
    } else {
        console.log(`\n❌ Найдено битых ссылок: ${brokenLinks.length}\n`);
        brokenLinks.forEach(link => {
            console.log(`📄 ${link.file}:${link.line}`);
            console.log(`   ${link.type === 'url' ? '🔗 URL' : '📁 Путь'}: ${link.value}\n`);
        });
        process.exit(1);
    }
}

processFiles();