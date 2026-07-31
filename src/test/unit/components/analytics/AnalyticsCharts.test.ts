import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnalyticsLineChart from '~/components/analytics/AnalyticsLineChart.vue'
import AnalyticsMultiLineChart from '~/components/analytics/AnalyticsMultiLineChart.vue'
import AnalyticsPieChart from '~/components/analytics/AnalyticsPieChart.vue'

describe('Analytics charts', () => {
  it('単系列折れ線グラフのアスペクト比を維持する', () => {
    const wrapper = mount(AnalyticsLineChart, {
      props: {
        data: [
          { label: '7/1', value: 10 },
          { label: '7/2', value: 20 }
        ]
      }
    })

    const viewport = wrapper.get('[data-test="line-chart-viewport"]')
    const svg = viewport.get('svg')

    expect(viewport.classes()).toContain('max-w-5xl')
    expect(viewport.classes()).toContain('overflow-x-auto')
    expect(svg.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(svg.classes()).toContain('h-auto')
    expect(svg.classes()).not.toContain('h-64')
  })

  it('複系列折れ線グラフのアスペクト比を維持する', () => {
    const wrapper = mount(AnalyticsMultiLineChart, {
      props: {
        data: [
          { label: '8時', pv: 10, search: 2 },
          { label: '9時', pv: 20, search: 4 }
        ]
      }
    })

    const viewport = wrapper.get('[data-test="multi-line-chart-viewport"]')
    const svg = viewport.get('svg')

    expect(viewport.classes()).toContain('max-w-5xl')
    expect(viewport.classes()).toContain('overflow-x-auto')
    expect(svg.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(svg.classes()).toContain('h-auto')
  })

  it('円グラフを正方形の領域へ収める', () => {
    const wrapper = mount(AnalyticsPieChart, {
      props: {
        data: [{ name: '西郷港', count: 10 }],
        labelField: 'name',
        valueField: 'count'
      }
    })

    const svg = wrapper.get('svg')
    expect(svg.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(svg.classes()).toContain('h-full')
    expect(svg.classes()).toContain('w-full')
  })
})
