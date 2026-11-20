import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const { chromium } = createRequire(new URL('../frontend/package.json', import.meta.url))('playwright');
const port = async () => { const s = createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p=s.address().port; await new Promise(r=>s.close(r)); return p; };
const backendPort=await port(), frontendPort=await port(), token=randomBytes(32).toString('hex');
const database=await mkdtemp(`${tmpdir()}/opendata-business-`);
const output=`${root}/frontend/test-results/business-flow`;
await mkdir(output,{recursive:true});
const checks=[], errors=[];
function check(message){checks.push(message);console.log(`PASS ${message}`);}
const headers={Authorization:`Bearer ${token}`,'X-Dev-Tenant':'browser-test','X-Dev-User':'alice','Content-Type':'application/json'};
const base=`http://127.0.0.1:${backendPort}/api/opendata/v1`, url=`http://127.0.0.1:${frontendPort}`;
let logs='';
const child=spawn(process.execPath,['scripts/dev-business.mjs'],{cwd:root,env:{...process.env,OPENDATA_PORT:String(backendPort),OPENDATA_FRONTEND_PORT:String(frontendPort),OPENDATA_DEV_TOKEN:token,OPENDATA_DEV_TENANT:'browser-test',OPENDATA_DEV_USER:'alice',OPENDATA_LOCAL_DATA_DIR:database},stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{logs+=chunk.toString().replaceAll(token,'[redacted]');});
let browser, page, passed=false;
for(const file of ['failure.txt','failure.html','failure.png'])await rm(`${output}/${file}`,{force:true});
async function api(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...headers,...(body?{'Idempotency-Key':randomUUID()}:{})},body:body?JSON.stringify(body):undefined}); const data=await r.json(); assert.ok(r.ok,JSON.stringify(data));return data;}
async function ready(){for(let n=0;n<150;n++){if(child.exitCode!==null)throw Error(`Development stack exited: ${child.exitCode}`);try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw Error('Development stack timeout');}
try {
 await ready();
 const tasks=[];
 for(let n=1;n<=16;n++)tasks.push(await api('/tasks',{platformCode:'tianshu',rootTaskId:'root-browser',nodeTaskId:`node-${n}`,workflowInstanceId:'flow-browser',businessKey:`browser-${n}`,businessType:'assessment',title:`OpenData task ${String(n).padStart(2,'0')}`,description:'Task verification record',creatorId:'alice',assigneeId:n===16?'bob':'alice'}));
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{if(!localStorage.getItem('opendata-token'))localStorage.setItem('opendata-token','mock-browser-guard');});
 page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='warning'&&/intlify|translation/i.test(m.text()))errors.push(m.text());});
 const button=(name)=>page.getByRole('button',{name,exact:true});
 const visible=async locator=>{await locator.waitFor({state:'visible',timeout:15000});};
 const loaded=async()=>{await visible(page.locator('.business-task-table')); await page.waitForFunction(()=>!document.querySelector('.business-task-table .arco-spin-loading'));};
 await page.goto(`${url}/tasks/business`);await loaded();await visible(page.getByText('共 16 条任务',{exact:true}));
 assert.equal(await page.locator('.business-task-table tbody tr').count(),10);
 await page.locator('.mt-pagination').getByRole('button',{name:'2',exact:true}).click();await page.waitForURL(/page=2/);await loaded();assert.equal(await page.locator('.business-task-table tbody tr').count(),6);
 await page.locator('.business-tasks-page .app-page-size').click();await page.locator('.arco-select-option:visible').filter({hasText:/^20\s/}).click();await page.waitForURL(/size=20/);await loaded();assert.equal(await page.locator('.business-task-table tbody tr').count(),16);check('database-backed list and pagination');
 await page.getByRole('textbox',{name:'关键词',exact:true}).fill('no-match');await button('查询').click();await visible(page.getByText('暂无匹配的业务任务',{exact:true}));await button('重置').click();await visible(page.getByText('共 16 条任务',{exact:true}));
 // Inspect a real task and simulate a committed response lost on the network.
 const task=tasks[0], path=`/tasks/${task.id}/actions`;
 await page.goto(`${url}/tasks/business/${task.id}`);await visible(button('开始办理'));await button('开始办理').click();
 const keys=[];let drop=true;
 await page.route(`**${path}`,async route=>{if(route.request().method()!=='POST')return route.continue();keys.push(route.request().headers()['idempotency-key']);if(drop){drop=false;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.locator('[role="dialog"]').getByRole('button',{name:'开始办理',exact:true}).click();await visible(page.getByText('连接失败，请检查网络后重试',{exact:true}));
 await page.locator('[role="dialog"]').getByRole('button',{name:'开始办理',exact:true}).click();await visible(button('完成任务'));assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);assert.equal((await api(path)).length,2);check('lost response retries reuse idempotency key without duplicate action');
 await button('退回').click();const dialog=page.locator('.business-action-modal');await dialog.getByRole('button',{name:'退回',exact:true}).click();await visible(page.getByText('请填写办理原因',{exact:true}));await dialog.getByRole('textbox',{name:'办理原因'}).fill('补充任务材料');await dialog.getByRole('button',{name:'退回',exact:true}).click();await visible(button('开始办理'));assert.equal((await api(`/tasks/${task.id}`)).returnCount,1);check('required reason and return transition persisted');
 await api(path,{action:'start',expectedVersion:2,reason:''});await button('开始办理').click();await page.locator('[role="dialog"]').getByRole('button',{name:'开始办理',exact:true}).click();await visible(button('完成任务'));assert.equal((await api(`/tasks/${task.id}`)).version,3);check('concurrent version conflict refreshes current state');
 await button('完成任务').click();await page.locator('[role="dialog"]').getByRole('button',{name:'完成任务',exact:true}).click();await page.locator('[role="dialog"]').waitFor({state:'hidden'});await page.reload();await visible(page.getByText('已完成',{exact:true}));assert.equal((await api(path)).length,5);check('complete and reload preserve terminal state and audit history');
 await page.goto(`${url}/tasks/business?status=completed`);await visible(page.getByText('共 1 条任务',{exact:true}));check('status filter uses persisted server state');
 await page.goto(`${url}/tasks/business/${tasks[15].id}`);await visible(page.getByText('基本信息',{exact:true}));assert.equal(await button('开始办理').count(),0);check('assignee-specific actions');
 await page.route('**/api/opendata/v1/tasks?*',r=>r.abort('failed'));await page.goto(`${url}/tasks/business`);await visible(button('重试'));await page.unroute('**/api/opendata/v1/tasks?*');await button('重试').click();await visible(page.getByText('共 16 条任务',{exact:true}));check('list failure and recovery');
 await page.goto(`${url}/tasks/business/${randomUUID()}`);await visible(button('重试'));check('unknown task recovery state');
 // Use the product's live locale and theme controls, then inspect both routes at narrow widths.
 await page.goto(`${url}/tasks/business`);await loaded();
 for(const locale of ['zh','en']){
  await page.goto(`${url}/tasks/business`);await loaded();
  if(locale==='en'){await button('语言').click();await page.locator('.arco-dropdown-option').filter({hasText:'English'}).click();await visible(button('Search'));}
  for(const theme of ['light','dark']){
   if(theme==='dark'){await button(locale==='zh'?'主题':'Theme').click();await page.locator('.arco-dropdown-option').filter({hasText:locale==='zh'?'深色':'Dark'}).click();}
   else if(locale==='en'){await button('Theme').click();await page.locator('.arco-dropdown-option').filter({hasText:'Light'}).click();}
   for(const width of [1440,900,375]){
    await page.setViewportSize({width,height:1000});
    for(const [name,route] of [['list','/tasks/business'],['detail',`/tasks/business/${task.id}`]]){
     await page.goto(url+route);await visible(page.getByText(locale==='zh'?(name==='list'?'业务任务':'基本信息'):(name==='list'?'Business tasks':'Basic information'),{exact:true}).last());
     await page.waitForTimeout(200);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${locale}/${theme}/${width}/${name}: document overflow`);
     await page.screenshot({path:`${output}/${locale}-${theme}-${width}-${name}.png`,fullPage:true});
    }
   }
   await page.goto(`${url}/tasks/business/${tasks[15].id}`);await visible(button(locale==='zh'?'作废':'Cancel task'));await button(locale==='zh'?'作废':'Cancel task').click();
   await visible(page.locator('.business-action-modal'));
   await page.locator('.business-action-modal').evaluate(element=>Promise.all(element.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{}))));
   await page.waitForFunction(()=>{const el=document.querySelector('.business-action-modal .arco-modal');return el && Math.abs(el.getBoundingClientRect().width-parseFloat(getComputedStyle(el).width))<0.1 && Number(getComputedStyle(el).opacity)>0.99;});
   const box=await page.locator('.business-action-modal .arco-modal').boundingBox();assert.ok(box.width>300 && box.width<=375 && box.x>=0 && box.x+box.width<=375,'reason dialog fits narrow viewport');
   await page.screenshot({path:`${output}/${locale}-${theme}-375-reason.png`,fullPage:true});
   await page.locator('.business-action-modal').getByRole('button',{name:locale==='zh'?'取消':'Cancel',exact:true}).click();
  }
 }
 assert.deepEqual(errors,[]);check('zh/en, light/dark, 1440/900/375 layouts and browser errors');
 passed=true;console.log(JSON.stringify({passed:checks.length,checks},null,2));
} catch(error){await page?.screenshot({path:`${output}/failure.png`,fullPage:true}); if(page)await writeFile(`${output}/failure.html`,await page.content());await writeFile(`${output}/failure.txt`,String(error.stack));throw error;}
finally{
 await browser?.close();
 child.kill('SIGTERM');
 await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,10000))]);
 await writeFile(`${output}/service.log`,logs);await writeFile(`${output}/report.json`,JSON.stringify({passed,checks,errors},null,2));
 if(child.exitCode!==null || child.signalCode!==null)await rm(database,{recursive:true,force:true});
}
