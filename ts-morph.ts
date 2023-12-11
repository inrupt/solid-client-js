import { Project, SymbolFlags, SyntaxKind } from 'ts-morph';

const project = new Project({
     tsConfigFilePath: 'tsconfig.json',
     skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(['src/**/*.ts', 'src/**/*.tsx', 'src/**/**/*.ts']);


let i = 0;
project.getSourceFiles().forEach((sourceFile) => {
  const interfaces = sourceFile.getImportDeclarations();

  interfaces.forEach((interfaceDeclaration) => {
    if (interfaceDeclaration.getModuleSpecifierValue() === '@inrupt/universal-fetch') {
      if (interfaceDeclaration.getDefaultImport()) {
        interfaceDeclaration.renameDefaultImport('fetch');
      }

      interfaceDeclaration.getNamedImports().forEach((namedImport) => namedImport.removeAliasWithRename());
      interfaceDeclaration.remove();
    }
  });

  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    if (call.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)[0]?.getText() === 'jest.requireMock') {
      console.log(call.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)[0].getText());
      console.log(call.getArguments()[0]?.getText());
    }



    // if (call.getChildrenOfKind(SyntaxKind.Identifier).length === 0) {
    //   // console.log(call.getChildren())
    //   return;
    // }
    // console.log(call.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)[0]?.getText());
    // console.log(call.getChildrenOfKind(SyntaxKind.Identifier).map(i => i.getText()));
  });

// save

  // Get all CallExpressions in the file


  // sourceFile.getChildren().forEach(c => {
  //   console.log(c.getKindName());
  // })

  // sourceFile.getChildrenOfKind(SyntaxKind.CallExpression).forEach((callExpression) => {
  //   console.log('a');
  // });
  

  // sourceFile.getSymbolsInScope(SymbolFlags.Function).forEach((statement) => {
  //   if (statement.getName() === 'requireMock') {

  //     console.log(statement.getName());
  //   }
  // });
});

project.saveSync();

