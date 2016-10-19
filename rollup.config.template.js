import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import uglify from 'rollup-plugin-uglify'

export default options => {
  return {
    entry: 'src/index.js',
    plugins: [
      babel({
        exclude: 'node_modules/**',
        presets: [ [ "es2015", { modules: false } ] ],
        plugins: ["external-helpers"]
      }),
      nodeResolve({ jsnext: true, browser: true }),
      commonjs({ include: 'node_modules/**' })
    ].concat(options.minify ? [uglify()] : []),
    external: ['leaflet', 'c3', 'covutils'],

    dest: 'leaflet-coverage.' + (options.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    moduleName: 'C',
    globals: id => {
      switch (id) {
        case 'leaflet': return 'L'
        case 'covutils': return 'CovUtils'
        case 'c3': return 'this.c3 || {}' // optional dependency
      }
    },
    sourceMap: true
  }
}