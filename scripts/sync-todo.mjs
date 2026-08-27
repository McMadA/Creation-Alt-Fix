/**
 * Node.js CLI Script for TODO.md Synchronization Verification & DevOps Sync
 * Usage: node scripts/sync-todo.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const todoPath = path.join(rootDir, 'TODO.md');

// Import synchronizer functions
const syncModulePath = path.join(rootDir, 'crm', 'js', 'todo-sync.js');

async function runCliSync() {
    console.log('🔄 [DevOps Sync] Reading TODO.md from:', todoPath);
    const todoContent = fs.readFileSync(todoPath, 'utf8');

    // Dynamic import
    const { parseTodoMarkdown, exportKanbanToTodoMarkdown, PROJECT_PROFILES } = await import(`file://${syncModulePath}`);

    const parsedTasks = parseTodoMarkdown(todoContent);
    console.log(`\n✅ Parsed ${parsedTasks.length} tasks from TODO.md:`);

    const summaryByProject = {};
    parsedTasks.forEach(t => {
        const pName = t.targetProject ? t.targetProject.client : 'Onbekend';
        if (!summaryByProject[pName]) summaryByProject[pName] = [];
        summaryByProject[pName].push(t);
    });

    for (const [pName, tasks] of Object.entries(summaryByProject)) {
        console.log(`\n📌 Project: "${pName}" (${tasks.length} taken):`);
        tasks.forEach(t => {
            const statusIcon = t.status === 'done' ? '✅' : (t.status === 'inprogress' ? '⚡' : (t.status === 'review' ? '🔍' : '⏳'));
            console.log(`   ${statusIcon} [${t.taskCode}] (${t.priority}) - ${t.cleanTitle}`);
        });
    }

    console.log('\n------------------------------------------------------------');
    console.log(`Total Projects Mapped: ${Object.keys(summaryByProject).length}`);
    console.log(`Total Tasks Processed: ${parsedTasks.length}`);
    console.log('------------------------------------------------------------\n');
}

runCliSync().catch(err => {
    console.error('❌ Error during CLI sync:', err);
    process.exit(1);
});
