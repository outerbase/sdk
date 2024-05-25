#!/usr/bin/env node
import pkg from 'handlebars'
const { compile } = pkg
import { promises as fs } from 'fs'
import { API_URL } from '../connections/outerbase'

const path = require('path')

function parseArgs(args: any[]): { API_KEY?: string; PATH?: string } {
    const argsMap: Record<string, any> = {}
    args.slice(2).forEach((arg: { split: (arg0: string) => [any, any] }) => {
        const [key, value] = arg.split('=')
        argsMap[key] = value
    })

    return argsMap
}

async function main() {
    const args = parseArgs(process.argv)
    const apiKey = args.API_KEY || ''
    const folderPath = args.PATH || './'

    try {
        await fs.mkdir(folderPath, { recursive: true })

        const indexTemplateSource = await fs.readFile(
            path.resolve(__dirname, 'query-template.handlebars'),
            'utf-8'
        )

        // Compile templates
        const indexTemplate = compile(indexTemplateSource)

        const response = await fetch(`${API_URL}/ezql/queries`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Token': apiKey,
            },
        })
        
        let json = await response.json()
        let queriesResponse = json.response
        const queries: Array<any> = queriesResponse

        console.log('Generated queries:', queries)

        // Generate index file
        const index = indexTemplate({ queries: queries })
        const indexPath = path.resolve(folderPath, 'index.ts')

        // Write generated files
        await fs.writeFile(indexPath, index)

        console.log('Queries generated successfully')
    } catch (error) {
        console.error('Error generating queries:', error)
    }
}

main()
