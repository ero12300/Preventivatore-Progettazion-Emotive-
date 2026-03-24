const { execSync, spawnSync } = require('child_process');

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(prefix) {
  const found = process.argv.find((arg) => arg.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : '';
}

function run(command, { optional = false, dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${command}`);
    return;
  }

  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0 && !optional) {
    process.exit(result.status || 1);
  }
}

function getStdout(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function main() {
  const dryRun = hasFlag('--dry-run');
  const withEmailTest = hasFlag('--email-test');
  const skipEnvCheck = hasFlag('--skip-env-check');
  const messageFromArg = getArgValue('--msg');
  const message = messageFromArg || 'chore: update progetto';

  try {
    getStdout('git rev-parse --is-inside-work-tree');
  } catch {
    console.error('Errore: esegui questo comando dentro una repository Git.');
    process.exit(1);
  }

  const status = getStdout('git status --porcelain');
  if (!status) {
    console.log('Nessuna modifica da pubblicare.');
    return;
  }

  const branch = getStdout('git rev-parse --abbrev-ref HEAD');
  console.log(`Branch corrente: ${branch}`);

  if (!skipEnvCheck) {
    console.log('\n1) Controllo variabili ambiente richieste');
    run('node ./scripts/check-required-env.cjs', { dryRun });
  }

  console.log(`\n${skipEnvCheck ? '1' : '2'}) Build produzione`);
  run('npm run build', { dryRun });

  if (withEmailTest) {
    console.log(`\n${skipEnvCheck ? '2' : '3'}) Test email end-to-end`);
    run('npm run test:send-email', { dryRun });
  }

  console.log(`\n${skipEnvCheck ? (withEmailTest ? '3' : '2') : (withEmailTest ? '4' : '3')}) Commit e push su GitHub`);
  run('git add .', { dryRun });
  run(`git commit -m "${message.replace(/"/g, '\\"')}"`, { dryRun });
  run(`git push -u origin ${branch}`, { dryRun });

  console.log(`\n${skipEnvCheck ? (withEmailTest ? '4' : '3') : (withEmailTest ? '5' : '4')}) Deploy produzione su Vercel`);
  run('npx vercel --prod --yes', { dryRun });

  console.log('\nShip completato con successo.');
}

main();
