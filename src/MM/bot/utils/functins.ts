import * as fs from 'fs'
import * as readline from 'readline';

export interface IGetParams {
    [key: string]: string;
}

export function rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function similar_text(first: string, second: string, percent: number = 0): number {
    if (first === null || second === null) {
        return 0;
    }

    first += '';
    second += '';

    let pos1: number = 0;
    let pos2: number = 0;
    let max: number = 0;
    let firstLength: number = first.length;
    let secondLength: number = second.length;
    let sum: number;

    for (let p = 0; p < firstLength; p++) {
        for (let q = 0; q < secondLength; q++) {
            let l: number;
            for (l = 0;
                 (p + l < firstLength) && (q + l < secondLength) && (first.charAt(p + l) === second.charAt(q + l));
                 l++) {
            }
            if (l > max) {
                max = l;
                pos1 = p;
                pos2 = q;
            }
        }
    }

    sum = max;

    if (sum) {
        if (pos1 && pos2) {
            sum += similar_text(first.substr(0, pos1), second.substr(0, pos2));
        }

        if ((pos1 + max < firstLength) && (pos2 + max < secondLength)) {
            sum += similar_text(
                first.substr(pos1 + max, firstLength - pos1 - max),
                second.substr(pos2 + max, secondLength - pos2 - max)
            );
        }
    }
    percent = (sum * 200) / (firstLength + secondLength);
    return percent;
}

export function is_file(file: string): boolean {
    try {
        const stat: fs.Stats = fs.lstatSync(file);
        return stat.isFile();
    } catch (e) {
        return false;
    }
}

export function fread(fileName: string): string {
    return fs.readFileSync(fileName, 'utf-8');
}

export function fwrite(fileName: string, fileContent: string, mode: string = 'w'): void {
    if (mode === 'w') {
        fs.writeFileSync(fileName, fileContent);
    } else {
        fs.appendFileSync(fileName, fileContent);
    }
}

export function unlink(fileName: string): void {
    fs.unlinkSync(fileName);
}

export function isDir(path: string): boolean {
    return fs.existsSync(path);
}

export function mkdir(path: string, mask: fs.Mode = '0774'): void {
    fs.mkdirSync(path, mask);
}

export function http_build_query(formData: IGetParams, separator: string = '&') {
    let key: string;
    let query: string[] = [];
    for (key in formData) {
        if (formData.hasOwnProperty(key)) {
            key = escape(key);
            let val: string = escape((formData[key].toString())).replace(/%20/g, '+');
            query.push(`${key}=${val}`);
        }
    }
    return query.join(separator);
}

let GET = {};
if (typeof window !== 'undefined') {
    GET = window
        .location
        .search
        .replace('?', '')
        .split('&')
        .reduce(
            function (p, e) {
                let a = e.split('=');
                p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
                return p;
            },
            {}
        );
}
export {GET}

export function stdin(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.on('line', (input) => {
            resolve(input);
            rl.close();
        });
    });
}

export function stdout(): void {

}
