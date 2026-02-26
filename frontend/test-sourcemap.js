import fs from 'fs';
import { SourceMapConsumer } from 'source-map';

const rawSourceMap = fs.readFileSync('dist/assets/index-BT5qL-jG.js.map', 'utf8');

SourceMapConsumer.with(rawSourceMap, null, consumer => {
    // Let's resolve the exact positions from the stack trace
    // 1: index-DWKaR5Ko.js:39:160
    // 2: index-DWKaR5Ko.js:248:68540
    // 3: index-DWKaR5Ko.js:267:1685
    const pos1 = consumer.originalPositionFor({ line: 39, column: 160 });
    const pos2 = consumer.originalPositionFor({ line: 248, column: 68540 });
    const pos3 = consumer.originalPositionFor({ line: 267, column: 1685 });
    console.log('Pos1:', pos1);
    console.log('Pos2:', pos2);
    console.log('Pos3:', pos3);
});
