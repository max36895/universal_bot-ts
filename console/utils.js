"use strict";
const fs = require('fs');

function isFile(file) {
    try {
        const stat = fs.lstatSync(file);
        return stat.isFile();
    } catch (e) {
        return false;
    }
}

function is_dir(file) {
    try {
        const stat = fs.lstatSync(file);
        return stat.isDirectory()
    } catch (e) {
        return false;
    }
}

function fread(fileName) {
    return fs.readFileSync(fileName, 'utf-8');
}

function fwrite(fileName, fileContent, mode = 'w') {
    if (mode === 'w') {
        fs.writeFileSync(fileName, fileContent);
    } else {
        fs.appendFileSync(fileName, fileContent);
    }
}

exports.utils = {
    isFile,
    is_dir,
    fread,
    fwrite
};
