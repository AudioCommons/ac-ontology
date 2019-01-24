# Audio Commons Ontology

Repository of the Audio Commons Ontology (https://w3id.org/ac-ontology/aco).

The Audio Commons Ontology provides main concepts and properties for describing audio content, both musical and non-musical, on the Semantic Web.

It is developed in the context of the European project [Audio Commons](http://www.audiocommons.org/).

Refer to https://w3id.org/ac-ontology/aco for documentation and downloading the ontology.

## Development

The ontology source code is split among a set of JSON-LD files in YAML format:
- [src/ac-ontology.jsonld.yaml](https://github.com/AudioCommons/ac-ontology/tree/master/src/ac-ontology.jsonld.yaml) - main concepts;
- [src/ac-ontology-collection.jsonld.yaml](https://github.com/AudioCommons/ac-ontology/tree/master/src/ac-ontology-collection.jsonld.yaml) - formalisation of AudioCollection;
- [src/ac-ontology-events.jsonld.yaml](https://github.com/AudioCommons/ac-ontology/tree/master/src/ac-ontology-events.jsonld.yaml) - concepts related to events in music recording/generation/production;
- [src/ac-ontology-shortcuts-fileToSignal.jsonld.yaml](https://github.com/AudioCommons/ac-ontology/tree/master/src/ac-ontology-shortcuts-fileToSignal.jsonld.yaml) - some shortcuts.

They all share the same in context, defined in [src/ac-ontology-context.jsonld.yaml](https://github.com/AudioCommons/ac-ontology/tree/master/src/ac-ontology-context.jsonld.yaml)

The HTML documentation is generated through the [EJS](https://ejs.co/) template
[src/ontology.ejs](https://github.com/AudioCommons/ac-ontology/tree/master/src/ontology.ejs).

## Build

To regenerate the HTML documentation and ontology serialisations execute the following command.

`node lib/dist.js`

It regenerates the following files:
- [aco.html](https://github.com/AudioCommons/ac-ontology/tree/master/aco.html) - ontology documentation webpage (HTML);
- [aco.ttl](https://github.com/AudioCommons/ac-ontology/tree/master/aco.ttl) - ontology in [Turtle](https://www.w3.org/TR/turtle/);
- [aco.jsonld](https://github.com/AudioCommons/ac-ontology/tree/master/aco.jsonld) - ontology in [JSON-LD](https://www.w3.org/TR/json-ld/);
- [aco.nt](https://github.com/AudioCommons/ac-ontology/tree/master/aco.nt) - ontology as [N-Triples](https://www.w3.org/TR/n-triples/);
- [aco.rdf](https://github.com/AudioCommons/ac-ontology/tree/master/aco.rdf) - ontology as [RDF/XML](https://www.w3.org/TR/rdf-syntax-grammar/);
- [aco.owl](https://github.com/AudioCommons/ac-ontology/tree/master/aco.owl) - ontology as [RDF/XML](https://www.w3.org/TR/rdf-syntax-grammar/) (as above, just different file extension).

## Deploy

The content of https://w3id.org/ac-ontology/aco is served by GitHub Pages directly
from this repo.

So to deploy, just push changes to this repo (including the regenerated files).
