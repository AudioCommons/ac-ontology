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

They all share the same in context, defined in - [src/ac-ontology-context.jsonld.yaml](https://github.com/AudioCommons/ac-ontology/tree/master/src/ac-ontology-context.jsonld.yaml)

The HTML documentation is generated through the [EJS](https://ejs.co/) template
[src/ontology.ejs](https://github.com/AudioCommons/ac-ontology/src/tree/master/ontology.ejs).

## Build

To regenerate the HTML documentation and ontology serialisations execute the following command.

`node lib/dist.js`

It regenerates the following files:
