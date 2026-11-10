import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {compileTestApi} from './compile-test-api.mjs';
compileTestApi();
const r=spawnSync(process.execPath,['--test','--test-concurrency=1','.test-output/tests/http-client.test.mjs','.test-output/tests/ine-analysis.test.mjs','.test-output/tests/ine-ocr-parse.test.mjs','.test-output/tests/ine-preliminary.test.mjs','.test-output/tests/api.test.mjs'],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);const match=r.stdout.match(/TRADE_TEST_REPORT=(\[.*\])/);if(match){mkdirSync('docs',{recursive:true});writeFileSync('docs/test-results.json',JSON.stringify({executedAt:new Date().toISOString(),environment:'MongoDB temporary server + MongoDB image storage; same API handler as deployment',results:JSON.parse(match[1])},null,2));}if(r.error)throw r.error;process.exit(r.status??1);
