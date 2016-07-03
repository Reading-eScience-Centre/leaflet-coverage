# leaflet-coverage [![Build Status](https://travis-ci.org/Reading-eScience-Centre/leaflet-coverage.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/leaflet-coverage)

A [Leaflet](http://leafletjs.com/) plugin for visualizing [coverage data](https://en.wikipedia.org/wiki/Coverage_data) (numerical or categorical data varying in space and time) with the help of the [JavaScript Coverage Data API](https://github.com/Reading-eScience-Centre/coverage-jsapi). Currently, it supports most domain types defined within [CoverageJSON](https://github.com/Reading-eScience-Centre/coveragejson):
Grid, Point, PointSeries, Trajectory, VerticalProfile, PolygonSeries, MultiPolygon. Additionally, it supports Point and VerticalProfile collections for a more convenient handling of such coverage collections.

Note that to *load* a coverage you have to use another library, depending on which formats you want to support. The only currently known coverage loader that can be used is the [covjson-reader](https://github.com/Reading-eScience-Centre/covjson-reader) for the [CoverageJSON](https://github.com/Reading-eScience-Centre/coveragejson) format.

NOTE: This plugin is in active development, does not support all CoverageJSON domain types, contains bugs, and will change.

[API docs](https://doc.esdoc.org/github.com/reading-escience-centre/leaflet-coverage/)

## Example

```js
var map = L.map('map')
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
}).addTo(map)

var cov = ... // load Coverage object with another library

var layer = C.dataLayer(cov, {keys: ['salinity']}).on('add', function(e) {
  if (layer.palette) {
    C.legend(layer).addTo(map)
  }
  
  if (layer.timeSlices) {
  	new C.TimeAxis(layer).addTo(map)
  }
  
  map.fitBounds(layer.getBounds())
}).addTo(map)
```

## Notes

This is how you would typically include leaflet-coverage in a website:

```html
<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css">
<link rel="stylesheet" type="text/css" href="https://npmcdn.com/leaflet-coverage@0.4/leaflet-coverage.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.js"></script>
<script src="https://npmcdn.com/covutils@0.4/covutils.min.js"></script>
<script src="https://npmcdn.com/leaflet-coverage@0.4/leaflet-coverage.min.js"></script>
```

If you don't need support for MultiPolygon and PolygonSeries layers, then you can also use the lite variant of [covutils](https://www.npmjs.com/package/covutils):

```html
<script src="https://npmcdn.com/covutils@0.4/covutils-lite.min.js"></script>
```

To use the plotting functionality (for time series or vertical profile plots) you have to include the D3 and C3 libraries in your HTML:

```html
<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.11/c3.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.11/c3.min.js"></script>
```

## Acknowledgments

This library is developed within the [MELODIES project](http://www.melodiesproject.eu).
