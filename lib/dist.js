const rdflib = require('rdflib'),
      jsonld = require('jsonld'),
      yaml = require('js-yaml'),
      fs = require('fs'),
      path = require('path'),
      async = require('async'),
      _ = require('lodash'),
      ejs = require('ejs'),
      jsld = require('jsld'),
      eye = require('./eye.js'),
      util = require('util');

const srcDir = path.join(__dirname, '../src');
const ontologiesDir = path.join(__dirname, '..');

const classicTurtle = turtleString => {
  return turtleString.replace(/^PREFIX ([^:]*): (<[^>]*>)$/mg, '@prefix $1: $2.')
};

const fixLiterals = quads => {
  return _.join(_.map(quads.split('"""'),
      (str, index) => index % 2 === 0 ? str : str.replace(/\n/mg,'\\n')
  ), '"');
};

const simpleBnodes = quads => {
  return quads.replace(/_:bn_([0-9]*)/mg,'_:bn$1').replace(/_:b([0-9]*)_b([0-9]*)/mg,'_:b$1xb$2');
};

const quadsToTriples = quads => {
  // return quads.replace(/^(\S+) (\S+) ((\S+)|\"[^"]*\"[^"\s]*|\"\"\"([^"]|\"[^"]|\"\"[^"])*\"\"\"[^"\s]*) (\S+) .$/mg, '$1 $2 $3 .')
  return quads.replace(/^(\S+) (\S+) ((\S+)|\"[^"]*\"[^"\s]*) (\S+) \.$/mg, '$1 $2 $3 .')
};

const removeInvalidTriples = quads => {
  return quads.replace(/^\".*\.\n/mg, '')
};

const removeInvalidQuads = quads => {
  return quads.replace(/^\".*\n/mg, '')
};

const conflateStore = store => {
  _.each(store.statements, (stat) => {stat.why = {termType: 'DefaultGraph'}});
  return store;
};

async function fromJsonLdToTurtle(input, ctxt) {
  const store = rdflib.graph();
  const quads = await jsonld.toRDF(input, {expandContext: ctxt, format: 'application/n-quads'});
  await util.promisify(rdflib.parse)(quads, store, null, 'application/n-quads');
  const n3 = await util.promisify(rdflib.serialize)(null, store, 'http://shouldbethebase.org/', 'text/n3')
  return n3;
}

async function storeJsonLd (store, input, ctxt) {
  const quads = await jsonld.toRDF(input, {expandContext: ctxt, format: 'application/n-quads'});
  await util.promisify(rdflib.parse)(quads, store, null, 'application/n-quads');
}

function skipFirstLine(input) {
  return input.substring(input.indexOf("\n") + 1);
};

const fixBlankNodesXML = (input) => {
  return input
      .replace(/(\srdf:parseType="Resource">)\s*<rdf:Description>((?:[^<]|<[^\/]|<\/[^r]|<\/r[^d]|<\/rd[^f]|<\/rdf[^:]|<\/rdf:[^D])*)<\/rdf:Description>\s*(<\/)/mg,'$1$2$3')
      .replace(/(\srdf:parseType="Resource">)\s*<rdf:Description>((?:[^<]|<[^\/]|<\/[^r]|<\/r[^d]|<\/rd[^f]|<\/rdf[^:]|<\/rdf:[^D])*)<\/rdf:Description>\s*(<\/)/mg,'$1$2$3')
      .replace(/(\srdf:parseType="Resource">)\s*<rdf:Description>((?:[^<]|<[^\/]|<\/[^r]|<\/r[^d]|<\/rd[^f]|<\/rdf[^:]|<\/rdf:[^D])*)<\/rdf:Description>\s*(<\/)/mg,'$1$2$3');
};

async function main() {
  // const store = rdflib.graph();

  const store = rdflib.graph();

  const ontologyCtxtYaml = fs.readFileSync(path.join(srcDir, 'ac-ontology-context.jsonld.yaml'), 'utf8');
  const ontologyCtxt = yaml.safeLoad(ontologyCtxtYaml);

  const ontologyYaml = fs.readFileSync(path.join(srcDir, 'ac-ontology.jsonld.yaml'), 'utf8');
  const ontologyJsonLd = yaml.safeLoad(ontologyYaml);
  await storeJsonLd(store, ontologyJsonLd, ontologyCtxt);

  const ontologyCollectionYaml = fs.readFileSync(path.join(srcDir, 'ac-ontology-collection.jsonld.yaml'), 'utf8');
  const ontologyCollectionJsonLd = yaml.safeLoad(ontologyCollectionYaml);
  await storeJsonLd(store, ontologyCollectionJsonLd, ontologyCtxt);

  const ontologyEventsYaml = fs.readFileSync(path.join(srcDir, 'ac-ontology-events.jsonld.yaml'), 'utf8');
  const ontologyEventsJsonLd = yaml.safeLoad(ontologyEventsYaml);
  await storeJsonLd(store, ontologyEventsJsonLd, ontologyCtxt);

  const ontologyShortcutsYaml = fs.readFileSync(path.join(srcDir, 'ac-ontology-shortcuts-fileToSignal.jsonld.yaml'), 'utf8');
  const ontologyShortcutsJsonLd = yaml.safeLoad(ontologyShortcutsYaml);
  await storeJsonLd(store, ontologyShortcutsJsonLd, ontologyCtxt);

  const htmlTemplateSrc = fs.readFileSync(path.join(srcDir, 'ontology.ejs'), 'utf8');
  const htmlTemplate = ejs.compile(htmlTemplateSrc);

    // base: ['ontologyCtxt', async.asyncify((jsonldCtxt) => (jsonldCtxt['@base']))],
    // // baseAsNode: ['base', async.asyncify((iri) => (rdflib.sym(iri)))],
    // baseAsNode: ['base', async.constant(null)],

  const outputAsBadTriples = await util.promisify(rdflib.serialize)(rdflib.defaultGraph(), store, 'xxx', 'application/n-triples');
  const outputAsTriples = _.flow(fixLiterals, simpleBnodes)(outputAsBadTriples);
  // const outputAsQuads = await util.promisify(rdflib.serialize)(rdflib.defaultGraph(), store, 'xxx', 'application/n-quads');
  // const outputAsTriples = _.flow(fixLiterals, simpleBnodes, quadsToTriples)(outputAsQuads);
  fs.writeFileSync(path.join(ontologiesDir, 'aco.nt'), outputAsTriples);

  const outputAsTurtleWithEmptyPrefix = await util.promisify(rdflib.serialize)(rdflib.defaultGraph(), store, 'xxx', 'text/turtle');
    // outputAsTurtleWithEmptyPrefix: ['baseAsNode', 'fullOutputStore', _.partial(rdflib.serialize, _, _, 'xxx', 'text/turtle')],
  const outputAsTurtle = skipFirstLine(outputAsTurtleWithEmptyPrefix);
  fs.writeFileSync(path.join(ontologiesDir, 'aco.ttl'), outputAsTurtle);

  const outputAsJsonLdRaw = await jsonld.fromRDF(outputAsTriples, {format: 'application/n-quads'});
  const outputAsJsonLdCompacted = await jsonld.compact(outputAsJsonLdRaw, ontologyCtxt, {graph: true});
  const outputAsJsonLdTxt = JSON.stringify(outputAsJsonLdCompacted, null, 3);
  fs.writeFileSync(path.join(ontologiesDir, 'aco.jsonld'), outputAsJsonLdTxt);

  const outputAsRdfXmlDirty = await util.promisify(rdflib.serialize)(rdflib.defaultGraph(), store, 'xxx', 'application/rdf+xml');
  const outputAsRdfXml = fixBlankNodesXML(outputAsRdfXmlDirty);
  fs.writeFileSync(path.join(ontologiesDir, 'aco.rdf'), outputAsRdfXml);
  fs.writeFileSync(path.join(ontologiesDir, 'aco.owl'), outputAsRdfXml);
  
  const outputAsJsLd = await util.promisify(jsld.convert)(outputAsJsonLdRaw, ontologyCtxt);
  const outputAsHtml = htmlTemplate(_.assign(outputAsJsLd, {_: _, context: ontologyCtxt}));
  fs.writeFileSync(path.join(ontologiesDir, 'aco.html'), outputAsHtml);
}

main().then((result) => {
  console.log(result);
}).catch((err) => {
  console.error(err);
});
