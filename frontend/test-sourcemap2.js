import fs from 'fs';
import { SourceMapConsumer } from 'source-map';

const rawSourceMap = fs.readFileSync('dist/assets/index-BT5qL-jG.js.map', 'utf8');

SourceMapConsumer.with(rawSourceMap, null, consumer => {
    console.log('248:68470 ->', consumer.originalPositionFor({ line: 248, column: 68470 }));
    console.log('267:1685 ->', consumer.originalPositionFor({ line: 267, column: 1685 }));
    console.log('51:17 ->', consumer.originalPositionFor({ line: 51, column: 17 }));
});
