import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_PATH = join(__dirname, '../dist/index.js')
const REGISTRY_PATH = join(__dirname, '../registry')

function runCli(args: string): string {
    try {
        return execSync(`node ${CLI_PATH} ${args}`, {
            encoding: 'utf-8',
            timeout: 30000,
        })
    } catch (error: any) {
        return error.stdout || error.stderr || ''
    }
}

describe('Registry Validation', () => {
    let indexData: any

    beforeAll(() => {
        const indexPath = join(REGISTRY_PATH, 'index.yaml')
        const content = readFileSync(indexPath, 'utf-8')
        indexData = parse(content)
    })

    it('should have valid YAML in index.yaml', () => {
        expect(indexData).toBeDefined()
        expect(indexData.skills).toBeDefined()
        expect(Array.isArray(indexData.skills)).toBe(true)
    })

    it('should have 74 skills', () => {
        expect(indexData.skills.length).toBe(74)
    })

    it('should have all required fields for each skill', () => {
        for (const skill of indexData.skills) {
            expect(skill.id).toBeDefined()
            expect(skill.source).toBeDefined()
            expect(skill.path).toBeDefined()
            expect(skill.name).toBeDefined()
            expect(skill.description).toBeDefined()
            expect(skill.tags).toBeDefined()
        }
    })

    it('should have valid zh-CN translations', () => {
        const zhPath = join(REGISTRY_PATH, 'i18n/zh-CN.yaml')
        const content = readFileSync(zhPath, 'utf-8')
        const zhData = parse(content)

        expect(zhData).toBeDefined()
        expect(zhData.skills).toBeDefined()
    })

    it('should have valid sources.yaml', () => {
        const sourcesPath = join(REGISTRY_PATH, 'sources.yaml')
        const content = readFileSync(sourcesPath, 'utf-8')
        const sourcesData = parse(content)

        expect(sourcesData).toBeDefined()
        expect(sourcesData.sources).toBeDefined()
        expect(sourcesData.sources.length).toBeGreaterThan(0)
    })
})

describe('CLI Commands', () => {
    it('should show help with --help', () => {
        const output = runCli('--help')
        expect(output).toContain('skillwisp')
    })

    it('should show version with --version', () => {
        const output = runCli('--version')
        expect(output).toMatch(/\d+\.\d+\.\d+/)
    })

    it('should search skills', () => {
        const output = runCli('search pdf --json')
        expect(output).toBeDefined()
    })

    it('should show skill info', () => {
        const output = runCli('info pdf --json')
        expect(output).toBeDefined()
    })

    it('should perform dry-run install', () => {
        const output = runCli('install @anthropic/pdf --dry-run')
        expect(output).toBeDefined()
    })

    it('should list installed resources', () => {
        const output = runCli('list --json')
        expect(output).toBeDefined()
    })
})

describe('Skill Sources', () => {
    let indexData: any

    beforeAll(() => {
        const indexPath = join(REGISTRY_PATH, 'index.yaml')
        const content = readFileSync(indexPath, 'utf-8')
        indexData = parse(content)
    })

    it('should have Anthropic skills', () => {
        const anthropicSkills = indexData.skills.filter((s: any) => s.source === 'anthropic')
        expect(anthropicSkills.length).toBe(16)
    })

    it('should have Vercel skills', () => {
        const vercelSkills = indexData.skills.filter((s: any) => s.source === 'vercel')
        expect(vercelSkills.length).toBe(5)
    })

    it('should have OpenAI skills', () => {
        const openaiSkills = indexData.skills.filter((s: any) => s.source === 'openai')
        expect(openaiSkills.length).toBe(31)
    })

    it('should have Obsidian skills', () => {
        const obsidianSkills = indexData.skills.filter((s: any) => s.source === 'obsidian')
        expect(obsidianSkills.length).toBe(3)
    })

    it('should have itsmostafa AWS skills', () => {
        const awsSkills = indexData.skills.filter((s: any) => s.source === 'itsmostafa')
        expect(awsSkills.length).toBe(18)
    })

    it('should have lackeyjb Playwright skill', () => {
        const playwrightSkills = indexData.skills.filter((s: any) => s.source === 'lackeyjb')
        expect(playwrightSkills.length).toBe(1)
    })
})
