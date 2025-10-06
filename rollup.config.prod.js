import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: 'dist/index.js',
				format: 'es',
				sourcemap: true,
			}
		],
		plugins: [
			peerDepsExternal(),
			resolve({
				extensions: ['.js', '.ts', '.jsx', '.tsx'],
			}),
			commonjs(),
			typescript({
				tsconfig: './tsconfig.json',
				sourceMap: true,
				inlineSources: true,
			}),
			esbuild({
				minify: true,
				target: 'es2020',
			}),
		],
		external: ['react', 'react-dom'],
	},
	{
		input: 'src/index.ts',
		output: {
			file: 'dist/types/index.d.ts',
			format: 'es',
		},
		plugins: [dts()],
	}
]