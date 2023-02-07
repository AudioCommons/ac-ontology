import { parse, graph as _graph, serialize, defaultGraph } from 'rdflib';
import jsonld from 'jsonld';
import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import _ from 'lodash';
import { compile } from 'ejs';
import { convert } from 'jsld';
import { promisify } from 'util';

// const srcDir = join(__dirname, '../src');
// const ontologiesDir = join(__dirname, '..');
const srcDir = './src';
const ontologiesDir = '.';

// const classicTurtle = turtleString => {
//   return turtleString.replace(/^PREFIX ([^:]*): (<[^>]*>)$/mg, '@prefix $1: $2.')
// };

const fixLiterals = quads => {
  return _.join(_.map(quads.split('"""'),
      (str, index) => index % 2 === 0 ? str : str.replace(/\n/mg,'\\n')
  ), '"');
};

const simpleBnodes = quads => {
  return quads.replace(/_:bn_([0-9]*)/mg,'_:bn$1').replace(/_:b([0-9]*)_b([0-9]*)/mg,'_:b$1xb$2');
};

async function storeJsonLd (store, input, ctxt) {
  const quads = await jsonld.toRDF(input, {expandContext: ctxt, format: 'application/n-quads'});
  await promisify(parse)(quads, store, null, 'application/n-quads');
}

function skipFirstLine(input) {
  return input.substring(input.indexOf("\n") + 1);
};

const fixBlankNodesXML = (input) => {
  return input.replaceAll(' rdf:parseType="Resource"','');
      // .replace(/(\srdf:parseType="Resource">)\s*<rdf:Description>((?:[^<]|<[^\/]|<\/[^r]|<\/r[^d]|<\/rd[^f]|<\/rdf[^:]|<\/rdf:[^D])*)<\/rdf:Description>\s*(<\/)/mg,'$1$2$3')
      // .replace(/(\srdf:parseType="Resource">)\s*<rdf:Description>((?:[^<]|<[^\/]|<\/[^r]|<\/r[^d]|<\/rd[^f]|<\/rdf[^:]|<\/rdf:[^D])*)<\/rdf:Description>\s*(<\/)/mg,'$1$2$3')
      // .replace(/(\srdf:parseType="Resource">)\s*<rdf:Description>((?:[^<]|<[^\/]|<\/[^r]|<\/r[^d]|<\/rd[^f]|<\/rdf[^:]|<\/rdf:[^D])*)<\/rdf:Description>\s*(<\/)/mg,'$1$2$3');
};

async function main() {
  const store = _graph();

  const ontologyCtxtYaml = readFileSync(join(srcDir, 'ac-ontology-context.jsonld.yaml'), 'utf8');
  const ontologyCtxt = yaml.safeLoad(ontologyCtxtYaml);

  const ontologyYaml = readFileSync(join(srcDir, 'ac-ontology.jsonld.yaml'), 'utf8');
  const ontologyJsonLd = yaml.safeLoad(ontologyYaml);
  await storeJsonLd(store, ontologyJsonLd, ontologyCtxt);

  const ontologyCollectionYaml = readFileSync(join(srcDir, 'ac-ontology-collection.jsonld.yaml'), 'utf8');
  const ontologyCollectionJsonLd = yaml.safeLoad(ontologyCollectionYaml);
  await storeJsonLd(store, ontologyCollectionJsonLd, ontologyCtxt);

  const ontologyEventsYaml = readFileSync(join(srcDir, 'ac-ontology-events.jsonld.yaml'), 'utf8');
  const ontologyEventsJsonLd = yaml.safeLoad(ontologyEventsYaml);
  await storeJsonLd(store, ontologyEventsJsonLd, ontologyCtxt);

  const ontologyShortcutsYaml = readFileSync(join(srcDir, 'ac-ontology-shortcuts-fileToSignal.jsonld.yaml'), 'utf8');
  const ontologyShortcutsJsonLd = yaml.safeLoad(ontologyShortcutsYaml);
  await storeJsonLd(store, ontologyShortcutsJsonLd, ontologyCtxt);

  const htmlTemplateSrc = readFileSync(join(srcDir, 'ontology.ejs'), 'utf8');
  const htmlTemplate = compile(htmlTemplateSrc);

  const outputAsBadTriples = await promisify(serialize)(defaultGraph(), store, 'xxx', 'application/n-triples');
  const outputAsTriples = _.flow(fixLiterals, simpleBnodes)(outputAsBadTriples);
  writeFileSync(join(ontologiesDir, 'aco.nt'), outputAsTriples);

  const outputAsTurtleWithEmptyPrefix = await promisify(serialize)(defaultGraph(), store, 'xxx', 'text/turtle');
  const outputAsTurtle = skipFirstLine(outputAsTurtleWithEmptyPrefix);
  writeFileSync(join(ontologiesDir, 'aco.ttl'), outputAsTurtle);

  const outputAsJsonLdRaw = await jsonld.fromRDF(outputAsTriples, {format: 'application/n-quads'});
  const outputAsJsonLdCompacted = await jsonld.compact(outputAsJsonLdRaw, ontologyCtxt, {graph: true});
  const outputAsJsonLdTxt = JSON.stringify(outputAsJsonLdCompacted, null, 3);
  writeFileSync(join(ontologiesDir, 'aco.jsonld'), outputAsJsonLdTxt);

  const outputAsRdfXmlDirty = await promisify(serialize)(defaultGraph(), store, 'xxx', 'application/rdf+xml');
  const outputAsRdfXml = fixBlankNodesXML(outputAsRdfXmlDirty);
  writeFileSync(join(ontologiesDir, 'aco.rdf'), outputAsRdfXml);
  writeFileSync(join(ontologiesDir, 'aco.owl'), outputAsRdfXml);
  
  // const outputAsJsLd = await promisify(convert)(outputAsJsonLdRaw, ontologyCtxt);
  // const outputAsHtml = htmlTemplate(_.assign(outputAsJsLd, {_: _, context: ontologyCtxt}));
  // writeFileSync(join(ontologiesDir, 'aco.html'), outputAsHtml);
}

main().then((result) => {
  console.log(result);
}).catch((err) => {
  console.error(err);
});
