import ts from 'typescript';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
export function compileTestApi(){
mkdirSync('.test-output/lib',{recursive:true});
writeFileSync('.test-output/lib/ine-ocr-diagnostics.mjs',ts.transpileModule(readFileSync('lib/ine-ocr-diagnostics.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
for(const file of ['db/collections','db/mongo','lib/rules','lib/catalog-seed','lib/presentation-data','lib/demo','lib/api-context','lib/trades-db','lib/settings-db','lib/api-lifecycle','lib/api-admin','lib/provider-review-jobs','lib/ine-browser-runner','lib/provider-decision','lib/ine-analysis','lib/ine-preliminary','lib/ine-reader','lib/ine-confidence','lib/api-account','lib/ine-identity','lib/ine-ocr-parse','lib/ine-states','lib/ine-ocr-image','lib/api','lib/http-client','lib/service-location','tests/http-client.test','tests/ine-analysis.test','tests/ine-ocr-parse.test','tests/ine-preliminary.test','tests/api.test']){mkdirSync('.test-output/'+file.split('/')[0],{recursive:true});let code=ts.transpileModule(readFileSync(file+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;code=code.replace(/from '(\.[^']+)'/g,"from '$1.mjs'");writeFileSync('.test-output/'+file+'.mjs',code)}
}
