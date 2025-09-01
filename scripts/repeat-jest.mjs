import { spawn } from 'node:child_process';

const runs = Number(process.env.RUNS || 5);
let failures = 0;

const runOnce = () => new Promise((resolve) => {
  const p = spawn('npx', ['jest', '--ci', '--maxWorkers=50%'], { stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('close', (code) => resolve(code));
});

for (let i = 1; i <= runs; i++) {
  // eslint-disable-next-line no-console
  console.log(`\n=== RUN ${i}/${runs} ===`);
  // eslint-disable-next-line no-await-in-loop
  const code = await runOnce();
  if (code !== 0) failures++;
}

// eslint-disable-next-line no-console
console.log(`\nFlake sweep done: ${runs - failures}/${runs} green, ${failures} failed`);
process.exit(failures ? 1 : 0);

