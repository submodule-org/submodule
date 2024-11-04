export default function transformer(file, api) {
	const j = api.jscodeshift;
	const root = j(file.source);

	const importDeclaration = root.find(j.ImportDeclaration, {
		source: {
			value: "@submodule/core",
		},
	});

	const createCalls = root
		.find(j.CallExpression, {
			callee: {
				type: "Identifier",
				name: "create",
			},
		})
		.filter(() => {
			return importDeclaration.some((importPath) => {
				return !!importPath.value.specifiers?.some((specifier) => {
					return specifier.local?.name === "create";
				});
			});
		});

	let needProvide = false;
	let needMap = false;

	for (const path of createCalls.paths()) {
		const args = path.value.arguments;
		if (args.length === 1) {
			path.get("callee").replace(j.identifier("provide"));
			needProvide = true;
		} else if (args.length === 2) {
			path.get("callee").replace(j.identifier("map"));
			path.get("arguments").replace([args[1], args[0]]);
			needMap = true;
		}
	}

	for (const importPath of importDeclaration.paths()) {
		if (needProvide || needMap) {
			const specifiers = importPath.value.specifiers;
			if (
				needProvide &&
				specifiers &&
				!specifiers.some((spec) => spec.local?.name === "provide")
			) {
				specifiers.push(j.importSpecifier(j.identifier("provide")));
			}

			if (
				needMap &&
				specifiers &&
				!specifiers.some((spec) => spec.local?.name === "map")
			) {
				specifiers.push(j.importSpecifier(j.identifier("map")));
			}

			// Remove 'create' specifier
			if (specifiers) {
				importPath.value.specifiers = specifiers.filter(
					(spec) => spec.local?.name !== "create",
				);
			}
		}
	}

	return root.toSource();
}
