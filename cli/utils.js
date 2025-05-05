'use strict';
const fs = require('fs');

/**
 * Метода используется для проверки существования файла.
 * @param file
 * @returns {boolean}
 */
function isFile(file) {
    try {
        const stat = fs.lstatSync(file);
        return stat.isFile();
    } catch (e) {
        return false;
    }
}

/**
 * Метода используется для проверки существования папки.
 * @param file
 * @returns {boolean}
 */
function isDir(file) {
    try {
        const stat = fs.lstatSync(file);
        return stat.isDirectory();
    } catch (e) {
        return false;
    }
}

/**
 * Метода используется для чтения содержимого файла.
 * @param fileName
 * @returns {string}
 */
function fread(fileName) {
    return fs.readFileSync(fileName, 'utf-8');
}

/**
 * Метода используется для записи в файл.
 * @param fileName
 * @param fileContent
 * @param mode
 */
function fwrite(fileName, fileContent, mode = 'w') {
    if (mode === 'w') {
        fs.writeFileSync(fileName, fileContent);
    } else {
        fs.appendFileSync(fileName, fileContent);
    }
}

/**
 * Методы для работы с файлами.
 */
exports.utils = {
    /**
     * Метода используется для проверки существования файла.
     * @param file
     * @returns {boolean}
     */
    isFile,
    /**
     * Метода используется для проверки существования папки.
     * @param file
     * @returns {boolean}
     */
    isDir,
    /**
     * Метода используется для чтения содержимого файла.
     * @param fileName
     * @returns {string}
     */
    fread,
    /**
     * Метода используется для записи в файл.
     * @param fileName
     * @param fileContent
     * @param mode
     */
    fwrite,
};
