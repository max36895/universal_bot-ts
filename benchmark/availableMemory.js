/**
 * Доступная для бенчмарка память.
 *
 * Почему не os.freemem() напрямую (баг, из-за которого тест с 1000 команд
 * отказывался запускаться на unix-машинах с горой page cache):
 *  - на Linux freemem показывает «свободные» страницы, но не учитывает, что ядро
 *    сбросит page cache при нехватке — память фактически доступна;
 *  - freemem не знает про лимит heap V8: даже при 16 ГБ свободной RAM Node
 *    по умолчанию не даст аллоцировать больше ~4 ГБ (heap_size_limit),
 *    а с флагом --max-old-space-size=512 — и того меньше;
 *  - в контейнерах реальный лимит задаёт cgroup (memory.max), а не физическая RAM.
 *
 * Логика: реальный потолок = min(лимит heap V8, cgroup-лимит, физическая RAM + drop-cache).
 *
 * @returns Доступно МБ (округлено вниз)
 */
function getAvailableMemoryMB() {
    const v8 = require('node:v8');
    const os = require('node:os');
    const fs = require('node:fs');

    // 1) Лимит heap V8 — жёсткий потолок для наших аллокаций в старом поколении.
    const heapLimitMB = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;

    // 2) cgroup-лимит (docker/k8s). v2: memory.max; v1: memory.limit_in_bytes.
    let cgroupMB = Infinity;
    try {
        const v2 = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
        if (v2 !== 'max') {
            cgroupMB = Number(v2) / 1024 / 1024;
        }
    } catch {
        try {
            const v1 = fs
                .readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8')
                .trim();
            const n = Number(v1);
            // В v1 «безлимит» кодируется огромным числом (~9.2e18) — игнорируем.
            if (Number.isFinite(n) && n < 1e15) {
                cgroupMB = n / 1024 / 1024;
            }
        } catch {
            // не контейнер / файлы недоступны
        }
    }

    // 3) Физическая память. totalmem — надёжнее freemem: page cache при
    //    необходимости сбрасывается ядром. Свободной считаем totalmem,
    //    но не меньше freemem (на windows freemem адекватен).
    const totalMB = os.totalmem() / 1024 / 1024;
    const freeMB = os.freemem() / 1024 / 1024;
    const physicalMB = Math.max(totalMB * 0.9, freeMB);

    const available = Math.min(heapLimitMB, cgroupMB, physicalMB);
    // 50 МБ запас на сам рантайм Node и систему.
    return Math.max(0, available - 50);
}

module.exports = { getAvailableMemoryMB };
