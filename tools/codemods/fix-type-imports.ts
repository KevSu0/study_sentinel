import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.tests.json", // covers tests; run again with app tsconfig if needed
});

project.addSourceFilesAtPaths(["src/**/*.ts", "src/**/*.tsx"]);

for (const sf of project.getSourceFiles()) {
  let changed = false;

  // 1) Inline 'type' on specifiers that are only used as types
  for (const decl of sf.getImportDeclarations()) {
    // skip side-effect imports and type-only imports
    if (decl.isTypeOnly() || decl.getNamedImports().length === 0 && !decl.getDefaultImport()) continue;

    // default import: if only used as a type, convert to `import type { default as X }`
    const def = decl.getDefaultImport();
    if (def) {
      const refs = def.findReferences().flatMap(r => r.getReferences());
      const usedAsValue = refs.some(ref => {
        const node = ref.getNode();
        const parent = node.getParentIfKind(SyntaxKind.TypeReference) ? null : node;
        // heuristic: if not within type positions, treat as value
        return parent !== null;
      });
      if (!usedAsValue) {
        const name = def.getText();
        decl.removeDefaultImport();
        decl.addNamedImport({ name: `default as ${name}`, isTypeOnly: true });
        changed = true;
      }
    }

    // named imports
    for (const ni of decl.getNamedImports()) {
      if (ni.isTypeOnly()) continue;
      const refs = ni.getNameNode().findReferences().flatMap(r => r.getReferences());
      const usedAsValue = refs.some(ref => {
        const node = ref.getNode();
        // treat references inside type nodes as type-only
        const inType =
          !!node.getFirstAncestorByKind(SyntaxKind.TypeNode) ||
          !!node.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration) ||
          !!node.getFirstAncestorByKind(SyntaxKind.TypeAliasDeclaration) ||
          !!node.getFirstAncestorByKind(SyntaxKind.ImportType);
        return !inType;
      });
      if (!usedAsValue) {
        ni.setIsTypeOnly(true);
        changed = true;
      }
    }
  }

  if (changed) sf.fixUnusedIdentifiers(); // cleans up accidental leftovers
}

project.saveSync();
