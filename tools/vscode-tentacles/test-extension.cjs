const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const taskConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.vscode/tasks.json')));
let available = taskConfig.tasks.map(({ label }) => ({ name: label }));
let provider, runTask, executed;
const vscode = {
  TreeItem: class { constructor(label) { this.label = label; } },
  TreeItemCollapsibleState: { None: 0 },
  tasks: { fetchTasks: async () => available, executeTask: async (task) => { executed = task; } },
  window: { registerTreeDataProvider: (_, value) => { provider = value; }, showErrorMessage: assert.fail },
  commands: { registerCommand: (_, value) => { runTask = value; } },
};
const context = { require: () => vscode, module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'extension.js'), 'utf8'), context);
context.module.exports.activate({ subscriptions: [] });
(async () => {
  const buttons = await provider.getChildren();
  assert.deepEqual(Array.from(buttons, ({ label }) => label), ['Run DEV', 'Build DEV', 'Deploy DEV', 'Run Tests', 'Release PROD', 'Deploy PROD']);
  const button = buttons.find(({ label }) => label === 'Deploy DEV');
  await runTask(...button.command.arguments);
  assert.equal(executed.name, 'Tentacles: Deploy DEV');
  const task = taskConfig.tasks.find(({ label }) => label === executed.name);
  assert.ok(task.args.includes('${workspaceFolder}/scripts/deploy-test.ps1'));
  for (const label of ['Release PROD', 'Deploy PROD']) {
    const productionButton = buttons.find((item) => item.label === label);
    await runTask(...productionButton.command.arguments);
    assert.equal(executed.name, 'Tentacles: ' + label);
  }
  available = available.filter(({ name }) => name !== 'Tentacles: Deploy DEV');
  assert.equal((await provider.getChildren()).length, 5);
  console.log('PASS: sixth button, exact task dispatch, script integration, original five buttons.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
