import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import uglify from 'rollup-plugin-uglify'

export default options => {
  return {
    entry: 'src/index.js',
    plugins: [
      babel({ babelrc: false, presets: ['es2015-rollup'], exclude: 'node_modules/**' }),
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