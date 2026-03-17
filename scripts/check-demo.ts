import { demoLibrary, goldenQueries } from "../src/lib/demo-library";
import { parseIntent, rankPhotos } from "../src/lib/search";

const failures: string[] = [];

for (const fixture of goldenQueries) {
  const intent = parseIntent(fixture.query, [], demoLibrary);
  const results = rankPhotos(demoLibrary, intent);

  if (results[0]?.id !== fixture.expectedTopId) {
    failures.push(
      `"${fixture.query}" expected ${fixture.expectedTopId} but got ${results[0]?.id ?? "nothing"}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Demo check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Demo check passed. Golden queries resolved to the expected memories.");
