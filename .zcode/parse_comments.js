const fs = require('fs');
const path = require('path');
const file = path.join(process.env.TEMP || '/tmp', 'pr94_comments.json');
const cs = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const c of cs) {
    console.log('='.repeat(80));
    console.log('id:', c.id, '| author:', c.user.login);
    console.log('file:', c.path, '| line:', c.line ?? c.original_line);
    console.log('BODY:');
    console.log(c.body);
    console.log('DIFF HUNK (tail):');
    console.log((c.diff_hunk || '').split('\n').slice(-8).join('\n'));
}
