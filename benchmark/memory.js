// stress-test.js
// Запуск: node --expose-gc stress-test.js

function getMemoryMB() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

function getReg(i) {
    /* return new RegExp(`(\\d{1,2}-\\d{1,2}-\\d{1,2}_ref_${i}_)`, 'imu');
    //return new RegExp(`\\d\\d-\\d\\d-\\d\\d_ref_${i}_`, 'ium');
    return new RegExp(`((([\\d\\-() ]{4,}\\d)|((?:\\+|\\d)[\\d\\-() ]{9,}\\d))_ref_${i}_)`, 'ium');
    return new RegExp(
        `${Math.random()} напомни для user_${i} ([^\\d]+) в (\\d{1,2}:\\d{2})`,
        'ium',
    );*/
    //return new RegExp(`\\d{2}(-\\d{2}){2}_ref_${i}_`, 'ium');
    return new RegExp(`(\\s*\\w+){2,}_${i}`, 'ium');
}

function getGroup(count) {
    let reg = '';
    for (let i = 0; i < 30; i++) {
        if (reg) {
            reg += '|';
        }
        reg += `(?<_${i}>(${getReg(i + count).source}))`;
    }
    return new RegExp(reg, 'ium');
}

// ───────────────────────────────────────
// 1. Тест нормальной нагрузки (основной)
// ───────────────────────────────────────
async function start() {
    const fn = (count) => {
        gc();
        console.log('Старт для команд', count);
        console.log('просто регулярки');
        let regs = [];
        let memStart = getMemoryMB();
        for (let i = 0; i < count; i++) {
            regs.push(getReg(i));
            regs[regs.length - 1].test('custom');
            regs[regs.length - 1].test('');
        }
        let memEnd = getMemoryMB();
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);
        console.log('после 100 обращений');
        memStart = getMemoryMB();
        let start = performance.now();
        regs.forEach((reg) => {
            for (let i = 0; i < 100; i++) {
                reg.test(Math.random() + '_custom');
            }
        });
        let end = performance.now();
        console.log('time', end - start);
        memEnd = getMemoryMB();
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);
        gc();
        console.log('регулярки в группе');
        regs = [];
        memStart = getMemoryMB();
        for (let i = 0; i < count / 30; i++) {
            regs.push(getGroup(i));
            regs[regs.length - 1].test('custom');
            regs[regs.length - 1].test('');
        }
        memEnd = getMemoryMB();
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);
        console.log('после 100 обращений');
        memStart = getMemoryMB();
        start = performance.now();
        regs.forEach((reg) => {
            for (let i = 0; i < 100; i++) {
                reg.test(Math.random() + '_custom');
            }
        });
        end = performance.now();
        console.log('time', end - start);
        memEnd = getMemoryMB();
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);
        console.log('\n\n');
    };
    for (let i = 2000; i < 300000; i += 500) {
        fn(i);
    }
}

start();
