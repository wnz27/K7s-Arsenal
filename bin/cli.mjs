#!/usr/bin/env node

import { copyFile, cp, mkdir, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

function printHelp() {
  console.log(`Usage:
  npx --yes github:wnz27/K7s-Arsenal --list
  npx --yes github:wnz27/K7s-Arsenal <skill> [--project <path>] [--user] [--force]

Options:
  --project <path>  Install into <path>/.agents/skills (default: current directory)
  --user            Install into ~/.agents/skills
  --force           Replace files from a previous installation
  --list            List available skills
  --help            Show this help`);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function discoverSkills() {
  const entries = await readdir(repoRoot, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (entry.isDirectory() && await exists(path.join(repoRoot, entry.name, 'SKILL.md'))) {
      skills.push(entry.name);
    }
  }
  return skills.sort();
}

async function installSkill(name, options) {
  const skills = await discoverSkills();
  if (!skills.includes(name)) {
    throw new Error(`Unknown skill "${name}". Available skills: ${skills.join(', ') || '(none)'}`);
  }

  const sourceDir = path.join(repoRoot, name);
  const targetRoot = options.user
    ? path.join(homedir(), '.agents', 'skills')
    : path.join(options.project, '.agents', 'skills');
  const targetSkillDir = path.join(targetRoot, name);
  const commandsDir = path.join(sourceDir, 'commands');
  const commandFiles = await exists(commandsDir)
    ? (await readdir(commandsDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)
    : [];

  if (!options.force) {
    const targets = [targetSkillDir, ...commandFiles.map((file) => path.join(targetRoot, file))];
    for (const target of targets) {
      if (await exists(target)) {
        throw new Error(`${target} already exists. Use --force to replace the installed files.`);
      }
    }
  }

  await mkdir(targetSkillDir, { recursive: true });
  await copyFile(path.join(sourceDir, 'SKILL.md'), path.join(targetSkillDir, 'SKILL.md'));
  const referencesDir = path.join(sourceDir, 'references');
  if (await exists(referencesDir)) {
    await cp(referencesDir, path.join(targetSkillDir, 'references'), { recursive: true });
  }
  for (const file of commandFiles) {
    await copyFile(path.join(commandsDir, file), path.join(targetRoot, file));
  }

  console.log(`Installed ${name} to ${targetRoot}`);
  if (commandFiles.length > 0) console.log(`Installed ${commandFiles.length} command entries.`);
  console.log('Run /reload in Kimi Code to refresh the skill list.');
}

async function main() {
  const args = process.argv.slice(2);
  const options = { project: process.cwd(), user: false, force: false };
  let skill;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
    if (arg === '--list') {
      const skills = await discoverSkills();
      console.log(skills.join('\n'));
      return;
    }
    if (arg === '--user') {
      options.user = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--project') {
      const project = args[index + 1];
      if (!project) throw new Error('--project requires a path.');
      options.project = path.resolve(project);
      index += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}". Use --help for usage.`);
    } else if (skill) {
      throw new Error('Install one skill at a time.');
    } else {
      skill = arg;
    }
  }

  if (!skill) {
    printHelp();
    throw new Error('Choose a skill to install, or use --list.');
  }
  await installSkill(skill, options);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
