import { defineConfig } from 'rollup';
import babel from '@rollup/plugin-babel'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'

const outputCfgs = [
  {
    minify: true,
  },
  {
    minify: false
  }
]

export default defineConfig({
  input: 'src/index.js',
  plugins: [
    nodeResolve({ browser: true }),
    commonjs({ include: 'node_modules/**' }),
    babel({ babelHelpers: 'bundled' }),
  ],
  external: ['leaflet', 'c3', 'covutils'],

  output: outputCfgs.map(opts => ({
    file: 'leaflet-coverage.' + (opts.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    name: 'C',
    sourcemap: true,
    globals: id => {
      switch (id) {
        case 'leaflet': return 'L'
        case 'covutils': return 'CovUtils'
        case 'c3': return 'this.c3 || {}' // optional dependency
      }
    },
    plugins: (opts.minify ? [terser()] : [])
  }))
})
