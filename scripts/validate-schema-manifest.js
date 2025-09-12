#!/usr/bin/env node

/**
 * CI Schema Manifest Validation Script
 * Validates that the IndexedDB schema in code matches the manifest
 */

const fs = require('fs');
const path = require('path');

// Simple YAML parser for our specific use case
function parseManifestYaml(content) {
  const stores = [];
  let currentStore = null;
  let inEventsStore = false;
  let inIndexes = false;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Detect events store start
    if (trimmed === '- name: events') {
      currentStore = { name: 'events', indexes: [] };
      stores.push(currentStore);
      inEventsStore = true;
      continue;
    }
    
    // Detect indexes section
    if (inEventsStore && trimmed === 'indexes:') {
      inIndexes = true;
      continue;
    }
    
    // Detect index (with dash)
    if (inIndexes && trimmed.startsWith('- ')) {
      const indexName = trimmed.substring(2).trim();
      if (indexName && !indexName.startsWith('#')) {
        currentStore.indexes.push(indexName);
      }
    }
    
    // Exit sections on indentation level change
    if (trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('-')) {
      if (trimmed.includes(':') && trimmed !== 'indexes:') {
        inEventsStore = false;
        inIndexes = false;
      }
    }
  }
  
  return { stores };
}

// Extract index information from storage-v2.ts
function extractIndexesFromCode() {
  const storagePath = path.join(__dirname, '../src/lib/storage-v2.ts');
  const content = fs.readFileSync(storagePath, 'utf8');
  
  const indexes = {};
  
  // Extract events store indexes
  const eventsMatch = content.match(/events:\s*{[^}]+indexes:\s*{([^}]+)}/s);
  if (eventsMatch) {
    const indexesSection = eventsMatch[1];
    const indexMatches = indexesSection.match(/(\w+):\s*string/g);
    
    if (indexMatches) {
      indexes.events = indexMatches.map(match => match.split(':')[0].trim());
    }
  }
  
  // Extract index creation calls
  const createIndexMatches = content.matchAll(/createIndex\(['"](\w+)['"],\s*([^)]+)\)/g);
  const createdIndexes = {};
  
  for (const match of createIndexMatches) {
    const [_, indexName, keyPath] = match;
    createdIndexes[indexName] = keyPath.trim().replace(/^['"]|['"]$/g, '');
  }
  
  return { indexes, createdIndexes };
}

// Extract index information from manifest
function extractIndexesFromManifest() {
  const manifestPath = path.join(__dirname, '../docs/storage-schema-manifest.yaml');
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = parseManifestYaml(content);
  
  const manifestIndexes = {};
  
  const eventsStore = manifest.stores?.find(store => store.name === 'events');
  if (eventsStore && eventsStore.indexes) {
    manifestIndexes.events = eventsStore.indexes;
  }
  
  return manifestIndexes;
}

function main() {
  try {
    console.log('🔍 Validating Schema Manifest consistency...\n');
    
    const codeData = extractIndexesFromCode();
    const manifestData = extractIndexesFromManifest();
    
    let hasErrors = false;
    
    // Check events store indexes
    const codeIndexes = new Set(codeData.indexes.events || []);
    const manifestIndexes = new Set(manifestData.events || []);
    
    console.log('📊 Events Store Indexes:');
    console.log('   Code:', Array.from(codeIndexes).join(', ') || 'none');
    console.log('   Manifest:', Array.from(manifestIndexes).join(', ') || 'none');
    
    // Check for mismatches
    const missingInManifest = Array.from(codeIndexes).filter(idx => !manifestIndexes.has(idx));
    const missingInCode = Array.from(manifestIndexes).filter(idx => !codeIndexes.has(idx));
    
    if (missingInManifest.length > 0) {
      console.log('\n❌ Missing in manifest:', missingInManifest.join(', '));
      hasErrors = true;
    }
    
    if (missingInCode.length > 0) {
      console.log('\n❌ Missing in code:', missingInCode.join(', '));
      hasErrors = true;
    }
    
    // Check index creation consistency
    console.log('\n🔧 Index Creation Verification:');
    for (const [indexName, keyPath] of Object.entries(codeData.createdIndexes)) {
      console.log(`   ${indexName}: ${keyPath}`);
    }
    
    if (hasErrors) {
      console.log('\n❌ Schema Manifest validation failed!');
      console.log('Please update either src/lib/storage-v2.ts or docs/storage-schema-manifest.yaml');
      process.exit(1);
    } else {
      console.log('\n✅ Schema Manifest is consistent!');
    }
    
    // Check policies
    console.log('\n📋 Policy Checks:');
    const policies = [
      'timestamps normalized to seconds',
      'synced: false default for new writes',
      'JSON-serializable data validation'
    ];
    
    const storageContent = fs.readFileSync(path.join(__dirname, '../src/lib/storage-v2.ts'), 'utf8');
    
    if (storageContent.includes('normalizeTimestamp')) {
      console.log('   ✅ Timestamp normalization implemented');
    } else {
      console.log('   ⚠️  Timestamp normalization not found');
    }
    
    if (storageContent.includes('synced: false')) {
      console.log('   ✅ Synced default policy implemented');
    } else {
      console.log('   ⚠️  Synced default policy not found');
    }
    
    if (storageContent.includes('validateJsonSerializable')) {
      console.log('   ✅ JSON validation implemented');
    } else {
      console.log('   ⚠️  JSON validation not found');
    }
    
    console.log('\n🎉 Schema validation complete!');
    
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractIndexesFromCode, extractIndexesFromManifest };