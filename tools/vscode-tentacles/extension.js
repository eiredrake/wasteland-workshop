const vscode = require("vscode");

const tasks = [
  { label: "Run DEV", taskName: "Tentacles: Run DEV" },
  { label: "Build DEV", taskName: "Tentacles: Build DEV" },
  { label: "Run Tests", taskName: "Tentacles: Run Tests" },
  { label: "Release PROD", taskName: "Tentacles: Release PROD", legacyTaskName: "Tentacles: Release" },
  { label: "Deploy PROD", taskName: "Tentacles: Deploy PROD", legacyTaskName: "Tentacles: Deploy" }
];

class TentaclesControlsProvider {
  getTreeItem(item) {
    return item;
  }

  async getChildren() {
    const available = await vscode.tasks.fetchTasks();
    const controls = [...tasks];
    if (available.some((task) => task.name === "Tentacles: Deploy DEV")) {
      controls.splice(2, 0, { label: "Deploy DEV", taskName: "Tentacles: Deploy DEV" });
    }
    return controls.map(({ label, taskName, legacyTaskName }) => {
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      item.command = {
        command: "tentacles.runTask",
        title: label,
        arguments: [available.some((task) => task.name === taskName) ? taskName : (legacyTaskName || taskName)]
      };
      return item;
    });
  }
}

async function runTask(label) {
  const tasks = await vscode.tasks.fetchTasks();
  const task = tasks.find((candidate) => candidate.name === label);

  if (!task) {
    vscode.window.showErrorMessage(`Task not found: ${label}`);
    return;
  }

  await vscode.tasks.executeTask(task);
}

function activate(context) {
  const provider = new TentaclesControlsProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("tentacles.controls", provider),
    vscode.commands.registerCommand("tentacles.runTask", runTask)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
