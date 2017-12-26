var rdflib = require('rdflib'),
    jsonld = require('jsonld'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    _ = require('lodash'),
    eye = require('./eye.js');

var srcDir = path.join(__dirname, 'src');
var ontologiesDir = path.join(__dirname, 'dist');

const classicTurtle = turtleString => {
  return turtleString.replace(/^PREFIX ([^:]*): (<[^>]*>)$/mg, '@prefix $1: $2.')
};

const fixLiterals = quads => {
  return quads.replace(/([^.]|[^ ]\.)\n/mg,'$1\\n').replace(/\"\"\"(([^"]|\"[^"]|\"\"[^"])*)\"\"\"/mg, '\"$1\"');
};

const simpleBnodes = quads => {
  return quads.replace(/_:bn_([0-9]*)/mg,'_:bn$1');
};



const quadsToTriples = quads => {
  // return quads.replace(/^(\S+) (\S+) ((\S+)|\"[^"]*\"[^"\s]*|\"\"\"([^"]|\"[^"]|\"\"[^"])*\"\"\"[^"\s]*) (\S+) .$/mg, '$1 $2 $3 .')
  return quads.replace(/^(\S+) (\S+) ((\S+)|\"[^"]*\"[^"\s]*) (\S+) .$/mg, '$1 $2 $3 .')
};

const conflateStore = store => {
  console.log(store.statements);
  _.each(store.statements, (stat) => {stat.why = {termType: 'DefaultGraph'}});
  // console.log(store.statements);
  return store;
};

const fromJsonLdToTurtle = (input, callback) => {
  async.autoInject({
    newStore: [async.asyncify(rdflib.graph)],
    quads: [_.partial(jsonld.toRDF, input, {format: 'application/nquads'})],
    rdfInStore: ['quads', 'newStore', _.partial(rdflib.parse, _, _, null, 'application/n-quads')],
    n3: ['rdfInStore', _.partial(rdflib.serialize, null, _, 'http://shouldbethebase.org/', 'text/n3')],
  }, (err, result) => err ? callback(err) : callback(null, result.n3));
};

async.autoInject({
  ontologyYaml: [_.partial(fs.readFile, path.join(srcDir, 'ac-ontology.jsonld.yaml'), 'utf8')],
  ontologyJsonLd: ['ontologyYaml', async.asyncify(yaml.safeLoad)],
  base: ['ontologyJsonLd', async.asyncify((jsonLd) => (jsonLd['@context']['@base']))],
  baseAsNode: ['base', async.asyncify((iri) => (rdflib.sym(iri)))],
  // identityQueryN3: [_.partial(fs.readFile, path.join(srcDir, 'identity.n3'), 'utf8')],
  ontologyTermsQueryN3: [_.partial(fs.readFile, path.join(srcDir, 'definedByOntology.n3'), 'utf8')],
  rdfsAxiomsTtl: [_.partial(fs.readFile, path.join(srcDir, 'rdfs-axioms.ttl'), 'utf8')],
  ontologyTtl: ['ontologyJsonLd', fromJsonLdToTurtle],
  eyeDataArray: [
    'ontologyTtl', 'rdfsAxiomsTtl',
    _.partial(
      async.asyncify(_.concat),
      [ 'http://eulersharp.sourceforge.net/2003/03swap/rdfs-domain.n3',
        'http://eulersharp.sourceforge.net/2003/03swap/rdfs-range.n3'])],
  ontologyAfterInference: ['eyeDataArray', 'ontologyTermsQueryN3', eye],
  ontologyAfterInferenceForStore: ['ontologyAfterInference', async.asyncify(classicTurtle)],
  writeTurtle: ['ontologyAfterInferenceForStore', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.ttl'))],
  newOutputStore: [async.asyncify(rdflib.graph)],
  // fullOutputStore: ['ontologyAfterInferenceForStore', 'newOutputStore', _.partial(rdflib.parse, _, _, 'http://shouldbethebase.org/', 'text/n3')],
  fullOutputStore: ['ontologyAfterInferenceForStore', 'newOutputStore', 'base', _.partial(rdflib.parse, _, _, _, 'text/n3')],
  // singleGraphStore: ['fullOutputStore', async.asyncify(conflateStore)],
  outputAsQuads: ['baseAsNode', 'fullOutputStore', 'base', _.partial(rdflib.serialize, _, _, _, 'application/n-quads')],
  outputAsTriples: ['outputAsQuads', async.asyncify(_.flow(fixLiterals, simpleBnodes, quadsToTriples))],
  writeTriples: ['outputAsTriples', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.nt'))],
  outputAsJsonLd: ['outputAsTriples', _.partial(jsonld.fromRDF, _, {format: 'application/nquads'})],
  outputAsJsonLdTxt: ['outputAsJsonLd', async.asyncify(_.partialRight(JSON.stringify, null, 3))],
  writeJsonLd: ['outputAsJsonLdTxt', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.jsonld'))],
  outputAsRdfXml: ['baseAsNode', 'fullOutputStore', 'base', _.partial(rdflib.serialize, _, _, _, 'application/rdf+xml')],
  writeRdf: ['outputAsRdfXml', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.rdf'))],
  writeOwl: ['outputAsRdfXml', _.partial(fs.writeFile, path.join(ontologiesDir, 'aco.owl'))],
  result: ['writeJsonLd', async.asyncify(_.identity)]
}, function(err, results) {
  if (err) {
    console.error(err);
  }
  // console.log(results);
  // console.log(results.result);
  console.log(JSON.stringify(results.result));
});

// // serialize the ontoly to RDF/XML
// jsonld.toRDF(jsonldObj, {format: 'application/nquads'}, function(err, nquads) {
//   var store = rdflib.graph();
//   if (err) {
//     console.log(err);
//   } else {
//     try {
//       rdflib.parse(nquads, store, null, 'application/n-quads', function(err) {
//         if (err) {
//           console.log(err);
//         } else {
//           // var base = jsonldObj["@context"] && jsonldObj["@context"]["@base"];
//           // not using base because is not explicitly set in rdf/xml
//           rdflib.serialize(
//             null, store, null, 'application/rdf+xml',
//             function(err, rdfXml) {
//               if (err) {
//                 console.log(err);
//               } else {
//                 fs.writeFileSync(path.join(ontologiesDir, 'aco.owl'), rdfXml);
//                 console.log('Ontology in RDF/XML regenerated successfully.');
//               }
//             });
//         }
//       });
//     } catch (err) {
//       console.log(err);
//     }
//   }
// });
