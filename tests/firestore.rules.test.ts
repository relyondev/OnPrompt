import { afterEach, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const projectId = 'relyon-app';
let testEnv: RulesTestEnvironment;
const prompt = (userId: string, id = 'prompt-1') => ({ id, userId, title: 'Valid prompt', content: 'A valid prompt body', usageCount: 0, version: 1, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
const project = (userId: string, id = 'project-1') => ({ id, userId, name: 'Project A', createdAt: Timestamp.now(), color: '#0057D6' });
const category = (userId: string, id = 'category-1') => ({ id, userId, name: 'Writing' });

beforeEach(async () => {
  testEnv = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterEach(async () => { await testEnv.clearFirestore(); await testEnv.cleanup(); });

describe('Phase 2A Firestore rules', () => {
  it('denies anonymous reads and writes', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'prompts/prompt-1')));
    await assertFails(setDoc(doc(db, 'prompts/prompt-1'), prompt('anonymous')));
  });

  it('allows owner CRUD across prompts, projects, and categories', async () => {
    const db = testEnv.authenticatedContext('owner').firestore();
    const ownerPrompt = prompt('owner');
    await assertSucceeds(setDoc(doc(db, 'prompts/prompt-1'), ownerPrompt));
    await assertSucceeds(setDoc(doc(db, 'projects/project-1'), project('owner')));
    await assertSucceeds(setDoc(doc(db, 'categories/category-1'), category('owner')));
    await assertSucceeds(setDoc(doc(db, 'prompts/prompt-1'), { ...ownerPrompt, title: 'Updated prompt', updatedAt: Timestamp.now() }));
    await assertSucceeds(deleteDoc(doc(db, 'categories/category-1')));
  });

  it('denies another user read, update, and delete', async () => {
    await testEnv.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), 'prompts/owner-prompt'), prompt('owner', 'owner-prompt')); });
    const db = testEnv.authenticatedContext('other').firestore();
    await assertFails(getDoc(doc(db, 'prompts/owner-prompt')));
    await assertFails(setDoc(doc(db, 'prompts/owner-prompt'), { ...prompt('other', 'owner-prompt'), title: 'Takeover' }));
    await assertFails(deleteDoc(doc(db, 'prompts/owner-prompt')));
  });

  it('denies ownership transfer, privileged fields, and invalid documents', async () => {
    await testEnv.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), 'prompts/prompt-1'), prompt('owner')); });
    const db = testEnv.authenticatedContext('owner').firestore();
    await assertFails(setDoc(doc(db, 'prompts/prompt-1'), { ...prompt('other'), title: 'Transfer' }));
    await assertFails(setDoc(doc(db, 'prompts/role-prompt'), { ...prompt('owner', 'role-prompt'), role: 'admin' }));
    await assertFails(setDoc(doc(db, 'prompts/invalid-prompt'), { ...prompt('owner', 'invalid-prompt'), title: '' }));
  });

});
