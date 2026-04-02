import { fallbackSections } from './catalog'

export function normalizeDocument(document) {
  return {
    ...document,
    title: document.title?.trim() || '未命名文档',
    subtitle: document.subtitle?.trim() || 'file2web 自动生成报告',
    summary: document.summary?.trim() || '暂无摘要信息。',
    highlights: document.highlights ?? [],
    metrics: document.metrics ?? [],
    key_points: document.key_points ?? [],
    progress_items: document.progress_items ?? [],
    risk_items: document.risk_items ?? [],
    next_actions: document.next_actions ?? [],
    decision_requests: document.decision_requests ?? [],
    resource_requests: document.resource_requests ?? [],
    sections: (document.sections && document.sections.length > 0 ? document.sections : fallbackSections).map((section) => ({
      ...section,
      items:
        section.items && section.items.length > 0
          ? section.items
          : [{ title: '待补充', body: '当前章节暂无条目。', tag: '占位' }],
    })),
  }
}
