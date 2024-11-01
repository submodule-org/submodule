import ts from 'typescript';
import fs from 'node:fs';

// Function to read and parse a TypeScript file
function readAndParseFile(filePath: string): ts.SourceFile {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);
}

// Function to replace `create` with `provide` and `map`
function replaceCreateWithProvideAndMap(sourceFile: ts.SourceFile): string {
  const printer = ts.createPrinter();
  const transformer = <T extends ts.Node>(context: ts.TransformationContext) => (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const { expression, name } = node.expression;
        if (ts.isIdentifier(expression) && expression.text === '@submodule/core' && name.text === 'create') {
          const args = node.arguments;

          if (args.length === 1) {
            // Replace `create` with `provide`
            return ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(expression, 'provide'),
              undefined,
              args
            );
          } if (args.length === 2) {
            // Replace `create` with `map`
            const [funcParam, secondParam] = args;

            let newSecondParam = secondParam;
            if (!isExecutorType(secondParam)) {
              newSecondParam = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(expression, 'combine'),
                undefined,
                [secondParam]
              );
            }

            return ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(expression, 'map'),
              undefined,
              [funcParam, newSecondParam]
            );
          }
        }
      }
      return ts.visitEachChild(node, visit, context);
    }
    return ts.visitNode(rootNode, visit);
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = result.transformed[0] as ts.SourceFile;

  const content = printer.printFile(transformedSourceFile);
  result.dispose();
  return content
}

// Function to check if a node is of type Executor
function isExecutorType(node: ts.Expression): boolean {
  // Implement logic to determine if the node is of type Executor
  // This is a placeholder implementation and should be replaced with actual type checking logic
  return ts.isIdentifier(node) && node.getText() === 'Executor';
}

// Function to process the file
export function processFile(filePath: string, dryRun = false) {
  const sourceFile = readAndParseFile(filePath);
  const newContent = replaceCreateWithProvideAndMap(sourceFile);

  if (!dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  } else {
    console.log(newContent);
  }
}

