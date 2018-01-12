const rdflib = require('rdflib'),
      jsonld = require('jsonld'),
      yaml = require('js-yaml'),
      fs = require('fs'),
      path = require('path'),
      async = require('async'),
      _ = require('lodash'),
      ejs = require('ejs'),
      jsld = require('jsld'),
      eye = require('./eye.js');

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

const fromJsonLdToTurtle = (input, ctxt, callback) => {
  async.autoInject({
    newStore: [async.asyncify(rdflib.graph)],
    quads: [_.partial(jsonld.toRDF, input, {expandContext: ctxt, format: 'application/nquads'})],
    rdfInStore: ['quads', 'newStore', _.partial(rdflib.parse, _, _, null, 'application/n-quads')],
    n3: ['rdfInStore', _.partial(rdflib.serialize, null, _, 'http://shouldbethebase.org/', 'text/n3')],
  }, (err, result) => {
    if (err) {
      callback(err);
    } else {
      callback(null, result.n3);
    }
  });
};

const storeJsonLd = (store, input, ctxt, callback) => {
  async.autoInject({
    quads: [_.partial(jsonld.toRDF, input, {expandContext: ctxt, format: 'application/nquads'})],
    rdfInStore: ['quads', _.partial(rdflib.parse, _, store, null, 'application/n-quads')]
  }, (err, result) => {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};

const onlyGraph = (inputJsonld) => inputJsonld[0];
// const store = rdflib.graph();

async.autoInject({

  store: [async.asyncify(rdflib.graph)],

  ontologyCtxtYaml: [_.partial(fs.readFile, path.join(srcDir, 'ac-ontology-context.jsonld.yaml'), 'utf8')],
  ontologyCtxt: ['ontologyCtxtYaml', async.asyncify(yaml.safeLoad)],

  ontologyYaml: [_.partial(fs.readFile, path.join(srcDir, 'ac-ontology.jsonld.yaml'), 'utf8')],
  ontologyJsonLd: ['ontologyYaml', async.asyncify(yaml.safeLoad)],
  // ontologyTtl: ['ontologyJsonLd', 'ontologyCtxt', fromJsonLdToTurtle],
  ontologyLoaded: ['store', 'ontologyJsonLd', 'ontologyCtxt', storeJsonLd],

  ontologyCollectionYaml: [_.partial(fs.readFile, path.join(srcDir, 'ac-ontology-collection.jsonld.yaml'), 'utf8')],
  ontologyCollectionJsonLd: ['ontologyCollectionYaml', async.asyncify(yaml.safeLoad)],
  // ontologyCollectionTtl: ['ontologyCollectionJsonLd', 'ontologyCtxt', fromJsonLdToTurtle],
  ontologyCollectionLoaded: ['store', 'ontologyCollectionJsonLd', 'ontologyCtxt', storeJsonLd],

  ontologyEventsYaml: [_.partial(fs.readFile, path.join(srcDir, 'ac-ontology-events.jsonld.yaml'), 'utf8')],
  ontologyEventsJsonLd: ['ontologyEventsYaml', async.asyncify(yaml.safeLoad)],
  // ontologyEventsTtl: ['ontologyEventsJsonLd', 'ontologyCtxt', fromJsonLdToTurtle],
  ontologyEventsLoaded: ['store', 'ontologyEventsJsonLd', 'ontologyCtxt', storeJsonLd],

  fullOutputStore: [
    'store', 'ontologyLoaded', 'ontologyCollectionLoaded', 'ontologyEventsLoaded',
    async.asyncify((store, s1, s2, s3) => store)],

  htmlTemplateSrc: [_.partial(fs.readFile, path.join(srcDir, 'ontology.ejs'), 'utf8')],
  htmlTemplate: [
    'htmlTemplateSrc',
    async.asyncify(_.partialRight(ejs.compile, {}))],

  base: ['ontologyCtxt', async.asyncify((jsonldCtxt) => (jsonldCtxt['@base']))],
  // baseAsNode: ['base', async.asyncify((iri) => (rdflib.sym(iri)))],
  baseAsNode: ['base', async.constant(null)],

  // identityQueryN3: [_.partial(fs.readFile, path.join(srcDir, 'identity.n3'), 'utf8')],
  // // ontologyTermsQueryN3: [_.partial(fs.readFile, path.join(srcDir, 'definedByOntology.n3'), 'utf8')],
  // rdfsAxiomsTtl: [_.partial(fs.readFile, path.join(srcDir, 'rdfs-axioms.ttl'), 'utf8')],
  // eyeDataArray: [
  //   'ontologyTtl', 'ontologyEventsTtl', 'ontologyCollectionTtl',
  //   'rdfsAxiomsTtl',
  //   _.partial(
  //     async.asyncify(_.concat),
  //     [ 'http://eulersharp.sourceforge.net/2003/03swap/rdfs-domain.n3',
  //       'http://eulersharp.sourceforge.net/2003/03swap/rdfs-range.n3'])],
  // ontologyAfterInference: ['eyeDataArray', 'identityQueryN3', eye],
  // ontologyAfterInferenceForStore: ['ontologyAfterInference', async.asyncify(_.flow(classicTurtle, removeInvalidTriples))],
  // writeTurtle: ['ontologyAfterInferenceForStore', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.ttl'))],
  // newOutputStore: [async.asyncify(rdflib.graph)],
  // // fullOutputStore: ['ontologyAfterInferenceForStore', 'newOutputStore', _.partial(rdflib.parse, _, _, 'http://shouldbethebase.org/', 'text/n3')],
  // fullOutputStore: ['ontologyAfterInferenceForStore', 'newOutputStore', 'base', _.partial(rdflib.parse, _, _, _, 'text/n3')],

  outputAsQuads: ['baseAsNode', 'fullOutputStore', 'base', _.partial(rdflib.serialize, _, _, _, 'application/n-quads')],
  outputAsTriples: ['outputAsQuads', async.asyncify(_.flow(fixLiterals, simpleBnodes, quadsToTriples))],
  writeTriples: ['outputAsTriples', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.nt'))],

  outputAsTurtle: ['baseAsNode', 'fullOutputStore', 'base', _.partial(rdflib.serialize, _, _, _, 'text/turtle')],
  writeTurtle: ['outputAsTurtle', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.ttl'))],

  outputAsJsonLdRaw: ['outputAsTriples', _.partial(jsonld.fromRDF, _, {format: 'application/nquads'})],
  outputAsJsonLdCompacted: ['outputAsJsonLdRaw', 'ontologyCtxt', _.partial(jsonld.compact, _, _, {graph: true})],
  outputAsJsonLd: ['outputAsJsonLdCompacted', async.asyncify(onlyGraph)],
  outputAsJsonLdTxt: ['outputAsJsonLd', async.asyncify(_.partialRight(JSON.stringify, null, 3))],
  writeJsonLd: ['outputAsJsonLdTxt', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.jsonld'))],

  outputAsRdfXml: ['baseAsNode', 'fullOutputStore', 'base', _.partial(rdflib.serialize, _, _, _, 'application/rdf+xml')],
  writeRdf: ['outputAsRdfXml', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.rdf'))],
  writeOwl: ['outputAsRdfXml', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.owl'))],

  outputAsJsLd: ['outputAsJsonLdRaw', 'ontologyCtxt', jsld.convert],
  outputAsHtml: [
    'htmlTemplate', 'outputAsJsLd', 'ontologyCtxt',
    async.asyncify((template, data, context) => template(_.assign(data, {_: _, context: context})))],
  writeHtml: ['outputAsHtml', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.html'))],

  result: ['writeHtml', async.asyncify(_.identity)]
}, function(err, results) {
  if (err) {
    console.error(err);
  }
  // console.log(results);
  // console.log(results.result.statements);
  //console.log(JSON.stringify(results.result));
});
