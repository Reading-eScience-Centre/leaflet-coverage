# leaflet-coverage

[![NPM version](http://img.shields.io/npm/v/leaflet-coverage.svg)](https://npmjs.org/package/leaflet-coverage) 
[![dependencies Status](https://david-dm.org/Reading-eScience-Centre/leaflet-coverage/status.svg)](https://david-dm.org/Reading-eScience-Centre/leaflet-coverage)
[![devDependencies Status](https://david-dm.org/Reading-eScience-Centre/leaflet-coverage/dev-status.svg)](https://david-dm.org/reading-escience-centre/leaflet-coverage?type=dev)
[![Build Status](https://travis-ci.org/Reading-eScience-Centre/leaflet-coverage.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/leaflet-coverage)
[![Inline docs](http://inch-ci.org/github/Reading-eScience-Centre/leaflet-coverage.svg?branch=master)](http://inch-ci.org/github/Reading-eScience-Centre/leaflet-coverage)

A [Leaflet](http://leafletjs.com/) plugin for visualizing [coverage data](https://en.wikipedia.org/wiki/Coverage_data) (numerical or categorical data varying in space and time) with the help of the [JavaScript Coverage Data API](https://github.com/Reading-eScience-Centre/coverage-jsapi). Currently, it supports most domain types defined within [CoverageJSON](https://covjson.org):
Grid, Point, PointSeries, Trajectory, VerticalProfile, PolygonSeries, MultiPolygon. Additionally, it supports Point and VerticalProfile collections for a more convenient handling of such coverage collections.

Note that to *load* a coverage you have to use another library, depending on which formats you want to support. The only currently known coverage loader that can be used is the [covjson-reader](https://github.com/Reading-eScience-Centre/covjson-reader) for the [CoverageJSON](https://github.com/Reading-eScience-Centre/coveragejson) format.

NOTE: This plugin is in active development, does not support all CoverageJSON domain types, may contain bugs, and will change.

[API docs](https://doc.esdoc.org/github.com/Reading-eScience-Centre/leaflet-coverage/)

## Example

```js
var map = L.map('map')
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
}).addTo(map)

var cov = ... // load Coverage object with another library

var layer = C.dataLayer(cov, {parameter: 'salinity'}).on('afterAdd', function(e) {
  if (layer.palette) {
    C.legend(layer).addTo(map)
  }
  
  if (layer.timeSlices) {
  	new C.TimeAxis(layer).addTo(map)
  }
  
  map.fitBounds(layer.getBounds())
}).addTo(map)
```

Have a look at [this codepen](http://codepen.io/letmaik/pen/OXgPXQ) for a full example that uses a [CoverageJSON](http://covjson.org) temperature grid as a data source.

## Notes

This is how you would typically include leaflet-coverage in a website:

```html
<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.1/leaflet.css">
<link rel="stylesheet" type="text/css" href="https://unpkg.com/leaflet-coverage@0.7/leaflet-coverage.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.1/leaflet.js"></script>
<script src="https://unpkg.com/covutils@0.6/covutils.min.js"></script>
<script src="https://unpkg.com/leaflet-coverage@0.7/leaflet-coverage.min.js"></script>
```

If you don't need support for MultiPolygon and PolygonSeries layers, then you can also use the lite variant of [covutils](https://www.npmjs.com/package/covutils):

```html
<script src="https://unpkg.com/covutils@0.6/covutils-lite.min.js"></script>
```

To use the plotting functionality (for time series or vertical profile plots) you have to include the D3 and C3 libraries in your HTML:

```html
<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.11/c3.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.11/c3.min.js"></script>
```

## Acknowledgments

This library is developed within the [MELODIES project](http://www.melodiesproject.eu).
