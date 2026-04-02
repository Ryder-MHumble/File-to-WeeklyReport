import { generatePureHtmlReport } from './html-generator'
import { generateStructuredReport } from './structured-generator'

export async function generateReport(params) {
  const { context } = params
  if (context.generationMode === 'llm-html') {
    return generatePureHtmlReport(params)
  }
  return generateStructuredReport(params)
}
